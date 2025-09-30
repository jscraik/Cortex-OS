import { decayEnabled, decayFactor, getHalfLifeMs } from '../core/decay.js';
import { isExpired } from '../core/ttl.js';
import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

let DatabaseImpl: typeof import('better-sqlite3') | undefined;
let loadVec: ((db: unknown) => unknown) | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DatabaseImpl = require('better-sqlite3');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ({ load: loadVec } = require('sqlite-vec'));
} catch {
  // ignore; constructor will throw if used
}

interface StatementLike {
  run: (...args: unknown[]) => unknown;
  get: (...args: unknown[]) => unknown;
  all: (...args: unknown[]) => unknown[];
}

interface DatabaseLike {
  exec: (sql: string) => unknown;
  prepare: (sql: string) => StatementLike;
}

function padVector(vec: number[], dim: number): number[] {
  if (vec.length === dim) return vec;
  if (vec.length > dim) return vec.slice(0, dim);
  return vec.concat(Array(dim - vec.length).fill(0));
}

function ensureArrayVector(v: unknown): number[] | undefined {
  if (!v) return undefined;
  if (Array.isArray(v) && v.every((n) => typeof n === 'number')) return v;
  return undefined;
}

export class SQLiteStore implements MemoryStore {
  private readonly db: DatabaseLike;
  private readonly dim: number;

  constructor(path: string, dimension?: number) {
    if (!DatabaseImpl || !loadVec) throw new Error('sqlite:unavailable');
    this.db = new DatabaseImpl(path) as unknown as DatabaseLike;
    loadVec(this.db);
    this.dim = dimension || Number(process.env.MEMORIES_VECTOR_DIM) || 1536;

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
  embeddingModel TEXT
)`);

    this.db.exec(
      `CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(embedding float[${this.dim}])`,
    );
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_kind ON memories(kind)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_embeddingModel ON memories(embeddingModel)');
  }

  private key(id: string, namespace?: string): string {
    return namespace ? `${namespace}:${id}` : id;
  }

  async upsert(m: Memory, namespace?: string): Promise<Memory> {
    const id = this.key(m.id, namespace);
    const vec = ensureArrayVector(m.vector);
    const stmt = this.db.prepare(`
INSERT OR REPLACE INTO memories
  (id, kind, text, vector, tags, ttl, createdAt, updatedAt, provenance, policy, embeddingModel)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      id,
      m.kind,
      m.text ?? null,
      vec ? JSON.stringify(vec) : null,
      JSON.stringify(m.tags ?? []),
      m.ttl ?? null,
      m.createdAt,
      m.updatedAt,
      JSON.stringify(m.provenance),
      m.policy ? JSON.stringify(m.policy) : null,
      m.embeddingModel ?? null,
    );
    const row = this.db.prepare('SELECT rowid FROM memories WHERE id = ?').get(id) as
      | { rowid?: number | bigint }
      | undefined;
    const rowid = row?.rowid;
    if (rowid !== undefined) {
      if (vec) {
        const padded = padVector(vec, this.dim);
        const buffer = Buffer.from(new Float32Array(padded).buffer);
        this.db
          .prepare('INSERT OR REPLACE INTO memory_embeddings(rowid, embedding) VALUES (?, ?)')
          .run(BigInt(rowid), buffer);
      } else {
        this.db.prepare('DELETE FROM memory_embeddings WHERE rowid = ?').run(BigInt(rowid));
      }
    }
    return { ...m, id };
  }

  async get(id: string, namespace?: string): Promise<Memory | null> {
    const key = this.key(id, namespace);
    const row = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(key);
    return row ? this.rowToMemory(row) : null;
  }

  async delete(id: string, namespace?: string): Promise<void> {
    const key = this.key(id, namespace);
    const row = this.db.prepare('SELECT rowid FROM memories WHERE id = ?').get(key) as
      | { rowid?: number | bigint }
      | undefined;
    const rowid = row?.rowid;
    if (rowid !== undefined)
      this.db.prepare('DELETE FROM memory_embeddings WHERE rowid = ?').run(BigInt(rowid));
    this.db.prepare('DELETE FROM memories WHERE id = ?').run(key);
  }

  async searchByText(q: TextQuery, namespace?: string): Promise<Memory[]> {
    const topK = q.topK ?? 10;
    let sql = 'SELECT * FROM memories WHERE text IS NOT NULL';
    const params: (string | number)[] = [];
    if (namespace) {
      sql += ' AND id LIKE ?';
      params.push(`${namespace}:%`);
    }
    sql += ' AND LOWER(text) LIKE LOWER(?)';
    params.push(`%${q.text}%`);
    if (q.filterTags?.length) {
      sql += ` AND (${q.filterTags.map(() => 'tags LIKE ?').join(' OR ')})`;
      for (const t of q.filterTags) params.push(`%"${t}"%`);
    }
    sql += ' ORDER BY updatedAt DESC LIMIT ?';
    params.push(Math.max(topK * 10, topK));
    const rows = this.db.prepare(sql).all(...params);
    let candidates = rows.map((r) => this.rowToMemory(r));
    if (decayEnabled()) {
      const half = getHalfLifeMs();
      const now = new Date().toISOString();
      candidates = candidates
        .map((m) => ({ m, s: decayFactor(m.createdAt, now, half) }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.m);
    }
    return candidates.slice(0, topK);
  }

  async searchByVector(
    q: VectorQuery,
    namespace?: string,
  ): Promise<(Memory & { score: number })[]> {
    const topK = q.topK ?? 10;
    let baseVec: number[] = [];
    if (Array.isArray(q.vector)) baseVec = q.vector.slice();
    const queryVec = padVector(baseVec, this.dim);
    const initialLimit = Math.max(topK * 10, topK);
    const knnSubquery =
      'SELECT rowid, distance FROM memory_embeddings WHERE embedding MATCH ? ORDER BY distance LIMIT ?';
    let sql = `SELECT m.*, knn.distance FROM (${knnSubquery}) knn JOIN memories m ON m.rowid = knn.rowid`;
    const params: unknown[] = [JSON.stringify(queryVec), initialLimit];
    if (namespace) {
      sql += ' WHERE m.id LIKE ?';
      params.push(`${namespace}:%`);
    }
    const rows = this.db.prepare(sql).all(...params) as Array<
      Record<string, unknown> & { distance: number }
    >;
    let candidatesWithDistance = rows.map((r) => ({
      memory: this.rowToMemory(r),
      distance: r.distance,
    }));
    if (q.filterTags?.length) {
      const tagSet = new Set(q.filterTags);
      candidatesWithDistance = candidatesWithDistance.filter((c) =>
        c.memory.tags.some((t) => tagSet.has(t)),
      );
    }
    let resultsWithDistance = candidatesWithDistance.slice(0, topK);
    if (decayEnabled()) {
      const half = getHalfLifeMs();
      const now = new Date().toISOString();
      resultsWithDistance = candidatesWithDistance
        .map((c) => ({ ...c, decayScore: decayFactor(c.memory.createdAt, now, half) }))
        .sort((a, b) => b.decayScore - a.decayScore)
        .slice(0, topK);
    }
    return resultsWithDistance.map((r) => ({ ...r.memory, score: 1 - r.distance }));
  }

  // Note: Rerank and outbox helpers removed to keep adapter lean and avoid unused code.

  async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
    let purgedCount = 0;
    const rows = this.db
      .prepare(`SELECT rowid, * FROM memories${namespace ? ' WHERE id LIKE ?' : ''}`)
      .all(...(namespace ? [`${namespace}:%`] : []));
    const expiredIds: string[] = [];
    const expiredRowids: number[] = [];
    for (const row of rows) {
      const memory = this.rowToMemory(row);
      if (memory.ttl && isExpired(memory.createdAt, memory.ttl, nowISO)) {
        expiredIds.push(memory.id);
        const rowidVal = (row as Record<string, unknown> | undefined)?.rowid;
        if (typeof rowidVal === 'number') expiredRowids.push(rowidVal);
      }
    }
    if (expiredIds.length > 0) {
      const placeholders = expiredIds.map(() => '?').join(',');
      this.db.prepare(`DELETE FROM memories WHERE id IN (${placeholders})`).run(...expiredIds);
      if (expiredRowids.length > 0) {
        const rowPlaceholders = expiredRowids.map(() => '?').join(',');
        this.db
          .prepare(`DELETE FROM memory_embeddings WHERE rowid IN (${rowPlaceholders})`)
          .run(...expiredRowids);
      }
      purgedCount = expiredIds.length;
    }
    return purgedCount;
  }

  async searchHybrid(
    textQuery: string,
    vectorQuery: number[],
    options: {
      alpha?: number;
      limit?: number;
      namespace?: string;
      threshold?: number;
      recencyBoost?: boolean;
    } = {},
  ): Promise<Array<Memory & { score?: number }>> {
    const alpha = options.alpha ?? 0.5;
    const limit = options.limit ?? 10;
    const threshold = options.threshold ?? 0.0;
    const textResults = await this.searchByText(
      { text: textQuery, topK: limit },
      options.namespace,
    );
    const vectorResults = await this.searchByVector(
      { vector: vectorQuery, topK: limit },
      options.namespace,
    );
    const combined = new Map<
      string,
      Memory & { score?: number; textScore?: number; vectorScore?: number }
    >();
    for (const r of textResults)
      combined.set(r.id, { ...r, score: (1 - alpha) * 1.0, textScore: 1.0 });
    for (const r of vectorResults) {
      const existing = combined.get(r.id);
      const score = alpha * 1.0 + (existing?.score ?? 0);
      combined.set(r.id, { ...r, score, vectorScore: 1.0, textScore: existing?.textScore });
    }
    let results = Array.from(combined.values()).filter((r) => (r.score ?? 0) >= threshold);
    if (options.recencyBoost) {
      const now = Date.now();
      results = results.map((r) => {
        const age = now - new Date(r.createdAt).getTime();
        const decay = 0.5 ** (age / (24 * 60 * 60 * 1000));
        return { ...r, score: (r.score ?? 0) * (1 + 0.5 * decay) };
      });
    }
    results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return results.slice(0, limit);
  }

  private rowToMemory(row: unknown): Memory {
    const r = (row ?? {}) as Record<string, unknown>;
    const parseJSON = <T>(v: unknown): T | undefined => {
      if (typeof v !== 'string') return undefined;
      try {
        return JSON.parse(v) as T;
      } catch {
        return undefined;
      }
    };
    const isNumber = (v: unknown): v is number => typeof v === 'number';
    const isString = (v: unknown): v is string => typeof v === 'string';
    const id = typeof r.id === 'string' ? r.id : '';
    const kind = (() => {
      const k = r.kind;
      return k === 'note' || k === 'event' || k === 'artifact' || k === 'embedding' ? k : 'note';
    })();
    const text = typeof r.text === 'string' ? r.text : undefined;
    const vector = (() => {
      const arr = parseJSON<unknown[]>(r.vector);
      return Array.isArray(arr) ? arr.filter(isNumber) : undefined;
    })();
    const tags = (() => {
      const arr = parseJSON<unknown[]>(r.tags);
      return Array.isArray(arr) ? arr.filter(isString) : [];
    })();
    const ttl = typeof r.ttl === 'string' ? r.ttl : undefined;
    const createdAt = typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString();
    const updatedAt = typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString();
    const provenanceObj = parseJSON<Partial<Memory['provenance']>>(r.provenance) ?? {};
    const provenance: Memory['provenance'] = {
      source: (provenanceObj.source as Memory['provenance']['source']) ?? 'system',
      actor: provenanceObj.actor,
      evidence: provenanceObj.evidence,
      hash: provenanceObj.hash,
    };
    const policy = parseJSON<Memory['policy']>(r.policy);
    const embeddingModel = typeof r.embeddingModel === 'string' ? r.embeddingModel : undefined;
    return {
      id,
      kind,
      text,
      vector,
      tags,
      ttl,
      createdAt,
      updatedAt,
      provenance,
      policy,
      embeddingModel,
    };
  }

  async list(namespace = 'default', limit?: number, offset?: number): Promise<Memory[]> {
    let sql = 'SELECT * FROM memories';
    const params: unknown[] = [];
    if (namespace) {
      sql += ' WHERE id LIKE ?';
      params.push(`${namespace}:%`);
    }
    sql += ' ORDER BY updatedAt DESC';
    if (typeof limit === 'number') {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    if (typeof offset === 'number') {
      sql += ' OFFSET ?';
      params.push(offset);
    }
    const rows = this.db.prepare(sql).all(...params);
    return rows.map((r) => this.rowToMemory(r));
  }
}
