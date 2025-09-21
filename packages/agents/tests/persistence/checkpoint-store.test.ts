import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { CheckpointStore } from '../../src/persistence/checkpoint-store';
import fs from 'fs/promises';
import path from 'path';

describe('CheckpointStore', () => {
  let checkpointStore: CheckpointStore;
  let db: Database;
  let testDbPath: string;

  const mockCheckpoint = {
    threadId: 'thread-123',
    checkpoint: {
      v: 1,
      id: 'checkpoint-456',
      ts: '2024-01-01T00:00:00.000Z',
      channel_values: {
        messages: [{ role: 'user', content: 'Hello' }],
        next: 'process',
      },
      channel_versions: {
        messages: 1,
        next: 1,
      },
      versions_seen: {
        'process': { 'v': 1 },
      },
    },
    metadata: {
      source: 'user_input',
      step: 1,
      parentCheckpointId: null,
    },
  };

  const mockPendingWrite = {
    threadId: 'thread-123',
    taskId: 'task-789',
    writes: [
      {
        channel: 'messages',
        value: { role: 'assistant', content: 'Hello back!' },
      },
    ],
  };

  beforeEach(async () => {
    testDbPath = path.join(process.cwd(), `checkpoint-test-${Date.now()}.db`);

    // Create in-memory database for testing
    db = new Database(testDbPath);

    // Initialize database schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        checkpoint_data TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pending_writes (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        writes TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Create indexes separately
    db.exec('CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id ON checkpoints (thread_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at ON checkpoints (created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_pending_writes_thread_task ON pending_writes (thread_id, task_id)');

    checkpointStore = new CheckpointStore(db);
  });

  afterEach(async () => {
    if (db) {
      db.close();
    }
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore file not found errors
    }
  });

  describe('createCheckpoint', () => {
    it('should create a new checkpoint', async () => {
      const checkpointId = await checkpointStore.createCheckpoint(
        mockCheckpoint.threadId,
        mockCheckpoint.checkpoint,
        mockCheckpoint.metadata
      );

      expect(checkpointId).toBeDefined();

      // Verify checkpoint was stored
      const stmt = db.prepare('SELECT * FROM checkpoints WHERE id = ?');
      const stored = stmt.get(checkpointId);

      expect(stored).toBeDefined();
      expect(stored.thread_id).toBe(mockCheckpoint.threadId);
      expect(JSON.parse(stored.checkpoint_data)).toEqual(mockCheckpoint.checkpoint);
      // Metadata is stored with additional fields
      const parsedMetadata = JSON.parse(stored.metadata);
      expect(parsedMetadata.source).toBe(mockCheckpoint.metadata.source);
      expect(parsedMetadata.step).toBe(mockCheckpoint.metadata.step);
      expect(parsedMetadata.parentCheckpointId).toBe(mockCheckpoint.metadata.parentCheckpointId);
    });

    it('should generate unique checkpoint IDs', async () => {
      const id1 = await checkpointStore.createCheckpoint(
        mockCheckpoint.threadId,
        mockCheckpoint.checkpoint,
        mockCheckpoint.metadata
      );

      const id2 = await checkpointStore.createCheckpoint(
        mockCheckpoint.threadId,
        mockCheckpoint.checkpoint,
        mockCheckpoint.metadata
      );

      expect(id1).not.toBe(id2);
    });

    it('should store timestamps correctly', async () => {
      const beforeCreate = new Date();
      const checkpointId = await checkpointStore.createCheckpoint(
        mockCheckpoint.threadId,
        mockCheckpoint.checkpoint,
        mockCheckpoint.metadata
      );
      const afterCreate = new Date();

      const stmt = db.prepare('SELECT created_at FROM checkpoints WHERE id = ?');
      const stored = stmt.get(checkpointId);

      const storedTime = new Date(stored.created_at);
      expect(storedTime.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(storedTime.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('getCheckpoint', () => {
    it('should retrieve checkpoint by ID', async () => {
      const checkpointId = await checkpointStore.createCheckpoint(
        mockCheckpoint.threadId,
        mockCheckpoint.checkpoint,
        mockCheckpoint.metadata
      );

      const retrieved = await checkpointStore.getCheckpoint(checkpointId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.config.configurable.thread_id).toBe(mockCheckpoint.threadId);
      expect(retrieved?.checkpoint).toEqual(mockCheckpoint.checkpoint);
      // Check that metadata includes the expected fields
      expect(retrieved?.metadata.source).toBe(mockCheckpoint.metadata.source);
      expect(retrieved?.metadata.step).toBe(mockCheckpoint.metadata.step);
      expect(retrieved?.metadata.parentCheckpointId).toBe(mockCheckpoint.metadata.parentCheckpointId);
    });

    it('should return null for non-existent checkpoint', async () => {
      const retrieved = await checkpointStore.getCheckpoint('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('listCheckpoints', () => {
    it('should list checkpoints for a thread', async () => {
      const threadId = 'thread-123';

      // Create multiple checkpoints
      const checkpointIds = [];
      for (let i = 0; i < 3; i++) {
        const checkpoint = {
          ...mockCheckpoint.checkpoint,
          id: `checkpoint-${i}`,
          ts: new Date(Date.now() + i * 1000).toISOString(),
        };

        const id = await checkpointStore.createCheckpoint(threadId, checkpoint, {
          ...mockCheckpoint.metadata,
          step: i,
        });
        checkpointIds.push(id);
      }

      const checkpoints = await checkpointStore.listCheckpoints(threadId);

      expect(checkpoints).toHaveLength(3);
      // Check that thread_id is correctly set in the config
      checkpoints.forEach(c => {
        expect(c.config.configurable.thread_id).toBe(threadId);
      });
    });

    it('should return empty array for thread with no checkpoints', async () => {
      const checkpoints = await checkpointStore.listCheckpoints('non-existent-thread');
      expect(checkpoints).toEqual([]);
    });

    it('should limit number of checkpoints returned', async () => {
      const threadId = 'thread-123';

      // Create 5 checkpoints
      for (let i = 0; i < 5; i++) {
        const checkpoint = {
          ...mockCheckpoint.checkpoint,
          id: `checkpoint-${i}`,
          ts: new Date(Date.now() + i * 1000).toISOString(),
        };

        await checkpointStore.createCheckpoint(threadId, checkpoint, mockCheckpoint.metadata);
      }

      const limited = await checkpointStore.listCheckpoints(threadId, { limit: 3 });
      expect(limited).toHaveLength(3);
    });
  });

  describe('getLatestCheckpoint', () => {
    it('should return most recent checkpoint for thread', async () => {
      const threadId = 'thread-123';

      // Create checkpoints in chronological order
      await checkpointStore.createCheckpoint(
        threadId,
        { ...mockCheckpoint.checkpoint, id: 'first', ts: '2024-01-01T00:00:00.000Z' },
        mockCheckpoint.metadata
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      const latestId = await checkpointStore.createCheckpoint(
        threadId,
        { ...mockCheckpoint.checkpoint, id: 'latest', ts: '2024-01-01T00:00:01.000Z' },
        mockCheckpoint.metadata
      );

      const latest = await checkpointStore.getLatestCheckpoint(threadId);

      expect(latest).toBeDefined();
      expect(latest?.config.configurable.thread_id).toBe(threadId);
      expect(latest?.checkpoint.id).toBe('latest');
    });

    it('should return null for thread with no checkpoints', async () => {
      const latest = await checkpointStore.getLatestCheckpoint('non-existent-thread');
      expect(latest).toBeNull();
    });
  });

  describe('putWrites', () => {
    it('should store pending writes', async () => {
      const result = await checkpointStore.putWrites(
        mockPendingWrite.threadId,
        mockPendingWrite.taskId,
        mockPendingWrite.writes
      );

      expect(result).toBe(true);

      // Verify writes were stored
      const stmt = db.prepare('SELECT * FROM pending_writes WHERE thread_id = ? AND task_id = ?');
      const stored = stmt.get(mockPendingWrite.threadId, mockPendingWrite.taskId);

      expect(stored).toBeDefined();
      expect(JSON.parse(stored.writes)).toEqual(mockPendingWrite.writes);
    });

    it('should handle empty writes array', async () => {
      const result = await checkpointStore.putWrites(
        mockPendingWrite.threadId,
        mockPendingWrite.taskId,
        []
      );

      expect(result).toBe(true);

      const stmt = db.prepare('SELECT writes FROM pending_writes WHERE thread_id = ? AND task_id = ?');
      const stored = stmt.get(mockPendingWrite.threadId, mockPendingWrite.taskId);

      expect(JSON.parse(stored.writes)).toEqual([]);
    });
  });

  describe('getWrites', () => {
    it('should retrieve pending writes', async () => {
      await checkpointStore.putWrites(
        mockPendingWrite.threadId,
        mockPendingWrite.taskId,
        mockPendingWrite.writes
      );

      const writes = await checkpointStore.getWrites(
        mockPendingWrite.threadId,
        mockPendingWrite.taskId
      );

      expect(writes).toEqual(mockPendingWrite.writes);
    });

    it('should return empty array for no pending writes', async () => {
      const writes = await checkpointStore.getWrites('non-existent-thread', 'non-existent-task');
      expect(writes).toEqual([]);
    });
  });

  describe('deleteCheckpoints', () => {
    it('should delete checkpoints older than specified date', async () => {
      const threadId = 'thread-123';

      // Create an old checkpoint
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const oldCheckpoint = {
        ...mockCheckpoint.checkpoint,
        id: 'old-checkpoint',
        ts: oldDate.toISOString(),
      };

      const oldId = await checkpointStore.createCheckpoint(threadId, oldCheckpoint, mockCheckpoint.metadata);

      // Manually update the created_at to be old
      const updateStmt = db.prepare('UPDATE checkpoints SET created_at = ? WHERE id = ?');
      updateStmt.run(oldDate.toISOString(), oldId);

      // Create a recent checkpoint
      const recentId = await checkpointStore.createCheckpoint(
        threadId,
        mockCheckpoint.checkpoint,
        mockCheckpoint.metadata
      );

      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const deletedCount = await checkpointStore.deleteCheckpoints(cutoffDate);

      expect(deletedCount).toBe(1);

      // Verify old checkpoint is deleted
      const oldDeleted = await checkpointStore.getCheckpoint(oldId);
      expect(oldDeleted).toBeNull();

      // Verify recent checkpoint still exists
      const recentExists = await checkpointStore.getCheckpoint(recentId);
      expect(recentExists).toBeDefined();
    });

    it('should return 0 when no checkpoints to delete', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const deletedCount = await checkpointStore.deleteCheckpoints(futureDate);
      expect(deletedCount).toBe(0);
    });
  });

  describe('Transaction Support', () => {
    it('should handle checkpoint creation within transaction', async () => {
      // Test transaction using the store's withTransaction method
      const checkpointId = await checkpointStore.withTransaction(async () => {
        return checkpointStore.createCheckpoint(
          mockCheckpoint.threadId,
          mockCheckpoint.checkpoint,
          mockCheckpoint.metadata
        );
      });

      expect(checkpointId).toBeDefined();

      const retrieved = await checkpointStore.getCheckpoint(checkpointId);
      expect(retrieved).toBeDefined();
    });

    it('should rollback checkpoint creation on transaction failure', async () => {
      let error: Error | null = null;

      try {
        await checkpointStore.withTransaction(async () => {
          await checkpointStore.createCheckpoint(
            mockCheckpoint.threadId,
            mockCheckpoint.checkpoint,
            mockCheckpoint.metadata
          );
          throw new Error('Simulated error');
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
      expect(error?.message).toBe('Simulated error');

      // Verify no checkpoint was created
      const checkpoints = await checkpointStore.listCheckpoints(mockCheckpoint.threadId);
      expect(checkpoints).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid checkpoint data', async () => {
      // This would be handled by TypeScript types at compile time
      // But we can test runtime JSON serialization
      const invalidCheckpoint = {
        ...mockCheckpoint.checkpoint,
        // Circular reference would cause JSON serialization to fail
        channel_values: { self: null as any },
      };
      (invalidCheckpoint.channel_values as any).self = invalidCheckpoint.channel_values;

      await expect(
        checkpointStore.createCheckpoint(
          mockCheckpoint.threadId,
          invalidCheckpoint,
          mockCheckpoint.metadata
        )
      ).rejects.toThrow();
    });

    it('should handle database connection errors gracefully', async () => {
      // Close the database to simulate connection error
      db.close();

      await expect(
        checkpointStore.createCheckpoint(
          mockCheckpoint.threadId,
          mockCheckpoint.checkpoint,
          mockCheckpoint.metadata
        )
      ).rejects.toThrow();
    });
  });
});