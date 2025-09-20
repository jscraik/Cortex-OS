import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { SQLiteStore } from '../../src/adapters/store.sqlite.js';
import { MemoryFactory, TestMemoryStore } from '../test-utils.js';
import { Memory } from '../../src/ports/MemoryStore.js';

// Check if SQLite is available
let sqliteAvailable = true;
try {
  new SQLiteStore(':memory:', 10);
} catch {
  sqliteAvailable = false;
}

// Test database setup
let testDb: Database;
let store: SQLiteStore;

const TEST_DB_PATH = ':memory:';

(sqliteAvailable ? describe : describe.skip)('SQLite Store Adapter', () => {
  beforeEach(async () => {
    testDb = new Database(TEST_DB_PATH);

    // Initialize with enhanced schema
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

      CREATE TABLE IF NOT EXISTS memory_embeddings (
        id TEXT PRIMARY KEY,
        embedding BLOB NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (id) REFERENCES memories(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
      CREATE INDEX IF NOT EXISTS idx_memories_ttl ON memories(ttl);
      CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON memory_embeddings(created_at);
    `);

    store = new SQLiteStore(TEST_DB_PATH, 10);
  });

  afterEach(() => {
    if (testDb) testDb.close();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve memories', async () => {
      const memory = MemoryFactory.createMemory({
        id: 'test-1',
        text: 'Test memory content',
      });

      await store.upsert(memory);
      const retrieved = await store.get('test-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved!.id).toBe('test-1');
      expect(retrieved!.text).toBe('Test memory content');
    });

    it('should update existing memories', async () => {
      const memory = MemoryFactory.createMemory({
        id: 'test-1',
        text: 'Original content',
      });

      await store.upsert(memory);

      const updated = MemoryFactory.createMemory({
        id: 'test-1',
        text: 'Updated content',
        tags: ['updated'],
      });

      await store.upsert(updated);
      const retrieved = await store.get('test-1');

      expect(retrieved!.text).toBe('Updated content');
      expect(retrieved!.tags).toContain('updated');
    });

    it('should delete memories', async () => {
      const memory = MemoryFactory.createMemory({
        id: 'test-1',
      });

      await store.upsert(memory);
      await store.delete('test-1');
      const retrieved = await store.get('test-1');

      expect(retrieved).toBeNull();
    });
  });

  describe('Vector Search', () => {
    it('should search by vector similarity', async () => {
      const memory1 = MemoryFactory.createMemory({
        id: 'mem1',
        text: 'machine learning',
        vector: new Float32Array([0.1, 0.2, 0.3]),
      });

      const memory2 = MemoryFactory.createMemory({
        id: 'mem2',
        text: 'deep learning',
        vector: new Float32Array([0.4, 0.5, 0.6]),
      });

      await store.upsert(memory1);
      await store.upsert(memory2);

      const results = await store.searchByVector({
        embedding: [0.1, 0.2, 0.3],
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('mem1');
    });

    it('should respect similarity threshold', async () => {
      const memory = MemoryFactory.createMemory({
        id: 'mem1',
        text: 'test content',
        vector: new Float32Array([0.1, 0.1, 0.1]),
      });

      await store.upsert(memory);

      const results = await store.searchByVector({
        embedding: [0.9, 0.9, 0.9], // Very different
        limit: 5,
        threshold: 0.8, // High threshold
      });

      expect(results.length).toBe(0);
    });
  });

  describe('Text Search', () => {
    it('should search by text content', async () => {
      const memories = [
        MemoryFactory.createMemory({ id: '1', text: 'machine learning algorithms' }),
        MemoryFactory.createMemory({ id: '2', text: 'deep neural networks' }),
        MemoryFactory.createMemory({ id: '3', text: 'natural language processing' }),
      ];

      for (const memory of memories) {
        await store.upsert(memory);
      }

      const results = await store.searchByText({
        text: 'machine learning',
        limit: 5,
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('1');
    });

    it('should handle case-insensitive search', async () => {
      await store.upsert(MemoryFactory.createMemory({
        id: '1',
        text: 'Machine Learning',
      }));

      const results = await store.searchByText({
        text: 'machine learning',
        limit: 5,
      });

      expect(results.length).toBe(1);
    });
  });

  describe('Hybrid Search', () => {
    it('should combine text and vector search', async () => {
      await store.upsert(MemoryFactory.createMemory({
        id: '1',
        text: 'machine learning algorithms',
        vector: new Float32Array([0.1, 0.2, 0.3]),
      }));

      await store.upsert(MemoryFactory.createMemory({
        id: '2',
        text: 'deep learning neural networks',
        vector: new Float32Array([0.4, 0.5, 0.6]),
      }));

      const results = await store.searchHybrid(
        'machine learning',
        new Float32Array([0.1, 0.2, 0.3]),
        { alpha: 0.5, limit: 5 }
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeDefined();
    });

    it('should apply recency boost when enabled', async () => {
      const now = new Date();
      const old = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await store.upsert(MemoryFactory.createMemory({
        id: '1',
        text: 'recent content',
        createdAt: now.toISOString(),
        vector: new Float32Array([0.1, 0.1, 0.1]),
      }));

      await store.upsert(MemoryFactory.createMemory({
        id: '2',
        text: 'old content',
        createdAt: old.toISOString(),
        vector: new Float32Array([0.1, 0.1, 0.1]),
      }));

      const results = await store.searchHybrid(
        'content',
        new Float32Array([0.1, 0.1, 0.1]),
        { alpha: 0.5, limit: 5, recencyBoost: true }
      );

      expect(results[0].id).toBe('1');
    });
  });

  describe('Namespace Support', () => {
    it('should isolate memories by namespace', async () => {
      const memory1 = MemoryFactory.createMemory({ id: 'same-id', text: 'Namespace 1' });
      const memory2 = MemoryFactory.createMemory({ id: 'same-id', text: 'Namespace 2' });

      await store.upsert(memory1, 'ns1');
      await store.upsert(memory2, 'ns2');

      const result1 = await store.get('same-id', 'ns1');
      const result2 = await store.get('same-id', 'ns2');

      expect(result1!.text).toBe('Namespace 1');
      expect(result2!.text).toBe('Namespace 2');
    });

    it('should search within namespace', async () => {
      await store.upsert(MemoryFactory.createMemory({
        id: '1',
        text: 'test content',
      }), 'ns1');

      await store.upsert(MemoryFactory.createMemory({
        id: '2',
        text: 'test content',
      }), 'ns2');

      const results = await store.searchByText({
        text: 'test',
        limit: 10,
      }, 'ns1');

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('1');
    });
  });

  describe('TTL/Expiration', () => {
    it('should not return expired memories', async () => {
      const past = new Date();
      past.setHours(past.getHours() - 1);

      const expired = MemoryFactory.createMemory({
        id: 'expired',
        text: 'Expired memory',
        ttl: past.toISOString(),
      });

      const valid = MemoryFactory.createMemory({
        id: 'valid',
        text: 'Valid memory',
      });

      await store.upsert(expired);
      await store.upsert(valid);

      const results = await store.searchByText({
        text: 'memory',
        limit: 10,
      });

      expect(results.every(r => r.id !== 'expired')).toBe(true);
    });

    it('should purge expired memories', async () => {
      const past = new Date();
      past.setHours(past.getHours() - 1);

      await store.upsert(MemoryFactory.createMemory({
        id: 'expired-ns1',
        text: 'Expired',
        ttl: past.toISOString(),
      }), 'ns1');

      await store.upsert(MemoryFactory.createMemory({
        id: 'expired-ns2',
        text: 'Expired',
        ttl: past.toISOString(),
      }), 'ns2');

      const now = new Date();
      const purgedCount = await store.purgeExpired(now.toISOString(), 'ns1');
      expect(purgedCount).toBe(1);

      const ns1Result = await store.get('expired-ns1', 'ns1');
      const ns2Result = await store.get('expired-ns2', 'ns2');

      expect(ns1Result).toBeNull();
      expect(ns2Result).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Simulate database closed
      testDb.close();

      await expect(store.upsert(MemoryFactory.createMemory()))
        .rejects.toThrow();
    });
  });
});