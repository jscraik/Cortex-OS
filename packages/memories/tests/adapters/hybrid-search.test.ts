import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SQLiteStore } from '../../src/adapters/store.sqlite.js';
import { MemoryFactory } from '../test-utils.js';
import { Memory } from '../../src/ports/MemoryStore.js';

// Check if SQLite is available
let sqliteAvailable = true;
try {
  new SQLiteStore(':memory:', 10);
} catch {
  sqliteAvailable = false;
}

// Test hybrid search implementation
let testDb: Database;
let store: SQLiteStore;

(sqliteAvailable ? describe : describe.skip)('Hybrid Search Implementation', () => {
  beforeEach(async () => {
    testDb = new Database(':memory:');
    // Initialize with schema
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        text TEXT,
        vector BLOB,
        tags TEXT,
        ttl TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        provenance TEXT,
        policy TEXT,
        embedding_model TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
      CREATE INDEX IF NOT EXISTS idx_memories_ttl ON memories(ttl);
    `);

    store = new SQLiteStore(':memory:', 10);
  });

  afterEach(() => {
    if (testDb) testDb.close();
  });

  it('should perform hybrid search combining text and vector', async () => {
    // Insert test data
    await store.upsert(MemoryFactory.createMemory({
      id: 'mem1',
      text: 'machine learning algorithms',
      vector: new Float32Array([0.1, 0.2, 0.3, 0, 0, 0, 0, 0, 0, 0]),
    }));

    await store.upsert(MemoryFactory.createMemory({
      id: 'mem2',
      text: 'deep learning neural networks',
      vector: new Float32Array([0.4, 0.5, 0.6, 0, 0, 0, 0, 0, 0, 0]),
    }));

    // Test hybrid search
    const results = await store.searchHybrid(
      'machine learning',
      new Float32Array([0.1, 0.2, 0.3, 0, 0, 0, 0, 0, 0, 0]),
      { alpha: 0.5, limit: 5 }
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeDefined();
  });

  it('should handle text-only search when vector not available', async () => {
    await store.upsert(MemoryFactory.createMemory({
      id: 'mem1',
      text: 'machine learning content',
    }));

    const results = await store.searchByText({
      text: 'machine learning',
      limit: 5,
    });

    expect(results.length).toBe(1);
    expect(results[0].text).toBe('machine learning content');
  });

  it('should apply recency boost when enabled', async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

    await store.upsert(MemoryFactory.createMemory({
      id: 'mem1',
      text: 'recent content',
      createdAt: now.toISOString(),
    }));

    await store.upsert(MemoryFactory.createMemory({
      id: 'mem2',
      text: 'old content',
      createdAt: old.toISOString(),
    }));

    const results = await store.searchHybrid(
      'content',
      new Float32Array([0.1, 0.1, 0.1, 0, 0, 0, 0, 0, 0, 0]),
      { alpha: 0.5, limit: 5, recencyBoost: true }
    );

    // Recent content should appear first due to recency boost
    expect(results[0].id).toBe('mem1');
  });

  it('should filter by namespace when provided', async () => {
    await store.upsert(MemoryFactory.createMemory({
      id: 'mem1',
      text: 'test content',
    }), 'test-namespace');

    const results = await store.searchHybrid(
      'test',
      new Float32Array([0.1, 0.1, 0.1, 0, 0, 0, 0, 0, 0, 0]),
      { alpha: 0.5, limit: 5, namespace: 'test-namespace' }
    );

    expect(results.length).toBe(1);
    expect(results[0].id).toBe('mem1');
  });

  it('should filter by kind when provided', async () => {
    await store.upsert(MemoryFactory.createMemory({
      id: 'mem1',
      kind: 'note',
      text: 'test note',
    }));

    await store.upsert(MemoryFactory.createMemory({
      id: 'mem2',
      kind: 'artifact',
      text: 'test artifact',
    }));

    const results = await store.searchHybrid(
      'test',
      new Float32Array([0.1, 0.1, 0.1, 0, 0, 0, 0, 0, 0, 0]),
      { alpha: 0.5, limit: 5, kind: 'note' }
    );

    expect(results.every(r => r.kind === 'note')).toBe(true);
  });
});

// Helper function for manual hybrid search testing
async function performSimpleSearch(
  store: SQLiteStore,
  params: { query: string; limit: number; namespace?: string }
): Promise<Memory[]> {
  // This would be implemented as part of the SQLiteStore enhancement
  const sql = 'SELECT * FROM memories WHERE text LIKE ? LIMIT ?';
  const sqlParams = [`%${params.query}%`, params.limit];

  if (params.namespace) {
    // In real implementation, namespace would be handled separately
  }

  const rows = store['db'].prepare(sql).all(...sqlParams);

  return rows.map((row: any) => ({
    id: row.id,
    kind: row.kind,
    text: row.text,
    vector: row.vector ? new Float32Array(row.vector) : undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    ttl: row.ttl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    provenance: row.provenance ? JSON.parse(row.provenance) : undefined,
    policy: row.policy ? JSON.parse(row.policy) : undefined,
    embeddingModel: row.embedding_model,
  }));
}