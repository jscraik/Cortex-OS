import DatabaseImpl from 'better-sqlite3';
import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = a.reduce((sum, _, i) => sum + a[i] * (b[i] || 0), 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

export class SQLiteStore implements MemoryStore {
  private db: InstanceType<typeof DatabaseImpl>;

  constructor(path: string) {
    this.db = new DatabaseImpl(path);

    // Create table if it doesn't exist
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          text TEXT,
          vector TEXT, -- JSON array stored as text
          tags TEXT, -- JSON array stored as text
          ttl TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          provenance TEXT, -- JSON object stored as text
          policy TEXT, -- JSON object stored as text
          embeddingModel TEXT
        )
      `);

    // Create indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_kind ON memories(kind)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_embeddingModel ON memories(embeddingModel)');
  }

  async upsert(m: Memory): Promise<Memory> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories 
      (id, kind, text, vector, tags, ttl, createdAt, updatedAt, provenance, policy, embeddingModel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      m.id,
      m.kind,
      m.text || null,
      m.vector ? JSON.stringify(m.vector) : null,
      JSON.stringify(m.tags),
      m.ttl || null,
      m.createdAt,
      m.updatedAt,
      JSON.stringify(m.provenance),
      m.policy ? JSON.stringify(m.policy) : null,
      m.embeddingModel || null,
    );

    return m;
  }

  async get(id: string): Promise<Memory | null> {
    const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(id);

    if (!row) return null;

    return this.rowToMemory(row);
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    stmt.run(id);
  }

  async searchByText(q: TextQuery): Promise<Memory[]> {
    let sql = 'SELECT * FROM memories WHERE text IS NOT NULL';
    const params: any[] = [];

    if (q.text) {
      sql += ' AND LOWER(text) LIKE LOWER(?)';
      params.push(`%${q.text}%`);
    }

    if (q.filterTags && q.filterTags.length > 0) {
      // For simplicity, we'll do a basic tag filter
      // A more sophisticated implementation would parse the JSON tags
      sql += ' AND (';
      q.filterTags.forEach((tag, i) => {
        if (i > 0) sql += ' OR ';
        sql += 'tags LIKE ?';
        params.push(`%"${tag}"%`);
      });
      sql += ')';
    }

    // Fetch more candidates to allow reranking in a second stage
    const initialLimit = Math.max(q.topK * 10, q.topK);
    sql += ' ORDER BY updatedAt DESC LIMIT ?';
    params.push(initialLimit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    const candidates = rows.map((row: any) => this.rowToMemory(row));

    // Optional rerank stage using Model Gateway if query text is present
    const rerankEnabled = (process.env.MEMORIES_RERANK_ENABLED || 'true').toLowerCase() !== 'false';
    const queryText = q.text?.trim();

    if (rerankEnabled && queryText && candidates.length > 1) {
      try {
        const top = await this.rerankWithModelGateway(queryText, candidates);
        return top.slice(0, q.topK);
      } catch {
        // Fall back to original ordering on any error
        return candidates.slice(0, q.topK);
      }
    }

    return candidates.slice(0, q.topK);
  }

  async searchByVector(q: VectorQuery): Promise<Memory[]> {
    // SQLite doesn't have native vector search capabilities
    // We'll fetch candidates and perform similarity matching in memory
    let sql = 'SELECT * FROM memories WHERE vector IS NOT NULL';
    const params: any[] = [];

    if (q.filterTags && q.filterTags.length > 0) {
      sql += ' AND (';
      q.filterTags.forEach((tag, i) => {
        if (i > 0) sql += ' OR ';
        sql += 'tags LIKE ?';
        params.push(`%"${tag}"%`);
      });
      sql += ')';
    }

    sql += ' ORDER BY updatedAt DESC LIMIT ?';
    params.push(q.topK * 10); // Fetch more candidates for similarity matching

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);

    const candidates = rows
      .map((row: any) => this.rowToMemory(row))
      .filter((memory) => memory.vector) as Memory[];

    // Perform similarity matching
    let scoredCandidates = candidates
      .map((memory) => ({
        memory,
        score: cosineSimilarity(q.vector, memory.vector!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, q.topK)
      .map((item) => item.memory);

    // Optional second-stage reranking if original query text is provided
    const rerankEnabled = (process.env.MEMORIES_RERANK_ENABLED || 'true').toLowerCase() !== 'false';
    if (rerankEnabled && q.queryText && candidates.length > 1) {
      try {
        const start = Date.now();
        const reranked = await this.rerankWithModelGateway(q.queryText, candidates);
        const latency = Date.now() - start;
        await this.writeOutboxEvent({
          type: 'rerank.completed',
          data: {
            strategy: 'cosine+mlxr',
            totalCandidates: candidates.length,
            returned: q.topK,
            latencyMs: latency,
            timestamp: new Date().toISOString(),
          },
        });
        scoredCandidates = reranked.slice(0, q.topK);
      } catch {
        // keep cosine results on failure
      }
    }

    return scoredCandidates;
  }

  // Second-stage reranking via Model Gateway (/rerank) with Qwen3 MLX primary
  private async rerankWithModelGateway(query: string, docs: Memory[]): Promise<Memory[]> {
    const gatewayUrl = process.env.MODEL_GATEWAY_URL || 'http://localhost:8081';
    const endpoint = `${gatewayUrl.replace(/\/$/, '')}/rerank`;
    const documents = docs.map((d) => d.text || '');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, documents }),
    });
    if (!res.ok) {
      throw new Error(`Rerank request failed: ${res.status}`);
    }
    const body = (await res.json()) as { scores: number[]; model: string };
    const scored = docs.map((m, i) => ({
      mem: m,
      score: body.scores?.[i] ?? 0,
      model: body.model,
    }));
    scored.sort((a, b) => b.score - a.score);
    // Emit outbox event with model id
    await this.writeOutboxEvent({
      type: 'rerank.completed',
      data: {
        model: scored[0]?.model || 'unknown',
        candidates: docs.length,
        timestamp: new Date().toISOString(),
      },
    });
    return scored.map((s) => s.mem);
  }

  private async writeOutboxEvent(event: Record<string, unknown>): Promise<void> {
    try {
      const file = process.env.MEMORIES_OUTBOX_FILE || 'logs/memories-outbox.jsonl';
      // Lazy import to avoid ESM top-level overhead
      const fs = await import('fs/promises');
      await fs.mkdir(file.split('/').slice(0, -1).join('/'), { recursive: true });
      await fs.appendFile(file, JSON.stringify(event) + '\n', { encoding: 'utf8' });
    } catch {
      // best-effort only
    }
  }

  async purgeExpired(nowISO: string): Promise<number> {
    const now = new Date(nowISO).getTime();
    let purgedCount = 0;

    // Get all memories with TTL
    const stmt = this.db.prepare('SELECT * FROM memories WHERE ttl IS NOT NULL');
    const rows = stmt.all();

    const expiredIds: string[] = [];

    for (const row of rows) {
      const memory = this.rowToMemory(row);
      if (!memory.ttl) continue;
      const created = new Date(memory.createdAt).getTime();
      const ttlRegex = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
      const match = ttlRegex.exec(memory.ttl);
      if (!match) continue;
      const days = Number(match[1] || 0);
      const hours = Number(match[2] || 0);
      const minutes = Number(match[3] || 0);
      const seconds = Number(match[4] || 0);
      const ttlMs = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
      if (created + ttlMs <= now) expiredIds.push(memory.id);
    }

    // Delete expired memories
    if (expiredIds.length > 0) {
      const placeholders = expiredIds.map(() => '?').join(',');
      const deleteStmt = this.db.prepare(`DELETE FROM memories WHERE id IN (${placeholders})`);
      const result = deleteStmt.run(...expiredIds);
      purgedCount = result.changes;
    }

    return purgedCount;
  }

  private rowToMemory(row: any): Memory {
    return {
      id: row.id,
      kind: row.kind,
      text: row.text ?? undefined,
      vector: row.vector ? JSON.parse(row.vector) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      ttl: row.ttl ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      provenance: row.provenance ? JSON.parse(row.provenance) : { source: 'unknown' },
      policy: row.policy ? JSON.parse(row.policy) : undefined,
      embeddingModel: row.embeddingModel ?? undefined,
    };
  }
}
