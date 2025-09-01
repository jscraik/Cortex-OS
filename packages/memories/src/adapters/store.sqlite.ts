import DatabaseImpl from 'better-sqlite3';
import type { Memory, MemoryId } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';
import { encrypt, decrypt } from '../lib/crypto.js';

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
          vector TEXT,
          tags TEXT,
          ttl TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          provenance TEXT,
          policy TEXT,
          embeddingModel TEXT,
          consent TEXT,
          aclAgent TEXT,
          aclTenant TEXT,
          aclPurposes TEXT
        )
      `);

    // Ensure ACL columns exist
    try {
      this.db.exec('ALTER TABLE memories ADD COLUMN aclAgent TEXT');
    } catch (err) {
      console.error('Error adding aclAgent column:', err);
    }
    try {
      this.db.exec('ALTER TABLE memories ADD COLUMN aclTenant TEXT');
    } catch (err) {
      console.error('Error adding aclTenant column:', err);
    }
    try {
      this.db.exec('ALTER TABLE memories ADD COLUMN aclPurposes TEXT');
    } catch (err) {
      console.error('Error adding aclPurposes column:', err);
    }
    try {
      this.db.exec('ALTER TABLE memories ADD COLUMN consent TEXT');
    } catch (err) {
      console.error('Error adding consent column:', err);
    }

    // Create indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_kind ON memories(kind)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_embeddingModel ON memories(embeddingModel)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_aclTenant ON memories(aclTenant)');
  }

  async upsert(m: Memory): Promise<Memory> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories
      (id, kind, text, vector, tags, ttl, createdAt, updatedAt, provenance, policy, embeddingModel, consent, aclAgent, aclTenant, aclPurposes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      m.id,
      m.kind,
      m.text ? encrypt(m.text) : null,
      m.vector ? encrypt(JSON.stringify(m.vector)) : null,
      encrypt(JSON.stringify(m.tags)),
      m.ttl || null,
      m.createdAt,
      m.updatedAt,
      JSON.stringify(m.provenance),
      m.policy ? JSON.stringify(m.policy) : null,
      m.embeddingModel || null,
      encrypt(JSON.stringify(m.consent)),
      m.acl.agent,
      m.acl.tenant,
      JSON.stringify(m.acl.purposes),
    );

    return m;
  }

  async get(id: MemoryId): Promise<Memory | null> {
    const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(id);

    if (!row) return null;

    return this.rowToMemory(row);
  }

  async delete(id: MemoryId): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    stmt.run(id);
  }

    async searchByText(q: TextQuery): Promise<Memory[]> {
      const stmt = this.db.prepare('SELECT * FROM memories');
      const rows = stmt.all();
      const candidates = rows
        .map((row: any) => this.rowToMemory(row))
        .filter((m: Memory) => {
          if (!m.text) return false;
          const matchesText = m.text.toLowerCase().includes(q.text.toLowerCase());
          const matchesTags = !q.filterTags || q.filterTags.every((tag) => m.tags.includes(tag));
          return matchesText && matchesTags;
        })
        .slice(0, q.topK);

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
    const stmt = this.db.prepare('SELECT * FROM memories WHERE vector IS NOT NULL ORDER BY updatedAt DESC');
    const rows = stmt.all();

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
      .slice(0, q.topK * 2)
      .map((item) => item.memory);

    if (q.filterTags && q.filterTags.length > 0) {
      scoredCandidates = scoredCandidates.filter((m) => q.filterTags!.every((t) => m.tags.includes(t)));
    }

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

  async forgetByActor(actor: string, tenant: string): Promise<number> {
    const stmt = this.db.prepare(
      'DELETE FROM memories WHERE json_extract(provenance, "$\.actor") = ? AND aclTenant = ?'
    );
    const result = stmt.run(actor, tenant);
    return result.changes as number;
  }

  private rowToMemory(row: any): Memory {
    return {
      id: row.id,
      kind: row.kind,
      text: row.text ? decrypt(row.text) : undefined,
      vector: row.vector ? JSON.parse(decrypt(row.vector)) : undefined,
      tags: row.tags ? JSON.parse(decrypt(row.tags)) : [],
      ttl: row.ttl ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      provenance: row.provenance ? JSON.parse(row.provenance) : { source: 'unknown' },
      acl: {
        agent: row.aclAgent || '',
        tenant: row.aclTenant || '',
        purposes: row.aclPurposes ? JSON.parse(row.aclPurposes) : [],
      },
      consent: row.consent ? JSON.parse(decrypt(row.consent)) : { granted: false, timestamp: '' },
      policy: row.policy ? JSON.parse(row.policy) : undefined,
      embeddingModel: row.embeddingModel ?? undefined,
    };
  }
}
