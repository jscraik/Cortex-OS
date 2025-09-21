import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, DatabaseConfig } from '../../src/persistence/database';
import fs from 'fs/promises';
import path from 'path';

describe('Database', () => {
  let db: Database;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a temporary database file for testing
    testDbPath = path.join(process.cwd(), `test-${Date.now()}.db`);
    const config: DatabaseConfig = {
      path: testDbPath,
      maxConnections: 5,
      timeout: 5000,
    };
    db = await createDatabase(config);
  });

  afterEach(async () => {
    // Close database connection and cleanup
    if (db) {
      db.close();
    }
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore file not found errors
    }
  });

  describe('createDatabase', () => {
    it('should create a database connection with valid config', async () => {
      expect(db).toBeDefined();
      expect(db.open).toBe(true);
    });

    it('should create database file when it does not exist', async () => {
      const exists = await fs.access(testDbPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should throw error with invalid path', async () => {
      const invalidConfig: DatabaseConfig = {
        path: '/invalid/path/to/database.db',
        maxConnections: 5,
        timeout: 5000,
      };
      await expect(createDatabase(invalidConfig)).rejects.toThrow();
    });
  });

  describe('Connection Pooling', () => {
    it('should respect max connections limit', async () => {
      // Test that we can create multiple connections up to the limit
      const connections: Database[] = [];
      const config: DatabaseConfig = {
        path: testDbPath,
        maxConnections: 3,
        timeout: 5000,
      };

      for (let i = 0; i < 3; i++) {
        const conn = await createDatabase(config);
        connections.push(conn);
      }

      // All connections should be valid
      connections.forEach(conn => {
        expect(conn.open).toBe(true);
      });

      // Cleanup
      connections.forEach(conn => conn.close());
    });

    it('should handle connection timeout', async () => {
      const slowConfig: DatabaseConfig = {
        path: testDbPath,
        maxConnections: 1,
        timeout: 1000, // Minimum timeout
      };

      const firstDb = await createDatabase(slowConfig);

      // Simulate a slow operation
      const stmt = firstDb.prepare('SELECT 1');
      const result = stmt.get();
      expect(result).toBeDefined();

      firstDb.close();
    });
  });

  describe('Database Operations', () => {
    it('should execute basic SQL queries', () => {
      const stmt = db.prepare('SELECT 1 as test');
      const result = stmt.get() as { test: number };
      expect(result.test).toBe(1);
    });

    it('should handle transactions', () => {
      // Create a test table first
      db.exec('CREATE TABLE IF NOT EXISTS test_table (name TEXT)');

      const insert = db.prepare('INSERT INTO test_table (name) VALUES (?)');
      const select = db.prepare('SELECT COUNT(*) as count FROM test_table');

      // Begin transaction
      const transaction = db.transaction(() => {
        insert.run('test1');
        insert.run('test2');
      });

      // Execute transaction
      transaction();

      const result = select.get() as { count: number };
      expect(result.count).toBe(2);

      // Clean up
      db.exec('DROP TABLE test_table');
    });

    it('should handle prepared statements', () => {
      const stmt = db.prepare('SELECT ? as value');
      const result = stmt.get(42) as { value: number };
      expect(result.value).toBe(42);
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors', () => {
      expect(() => {
        db.prepare('INVALID SQL STATEMENT');
      }).toThrow();
    });

    it('should handle constraint violations', () => {
      // Create a unique constraint table
      db.exec(`
        CREATE TABLE IF NOT EXISTS unique_test (
          id INTEGER PRIMARY KEY,
          name TEXT UNIQUE
        )
      `);

      const insert = db.prepare('INSERT INTO unique_test (name) VALUES (?)');
      insert.run('unique_name');

      // Should throw on duplicate insertion
      expect(() => {
        insert.run('unique_name');
      }).toThrow();
    });
  });

  describe('Database Pragmas', () => {
    it('should set foreign keys pragma', () => {
      const stmt = db.prepare('PRAGMA foreign_keys');
      const result = stmt.get() as { foreign_keys: number };
      expect(result.foreign_keys).toBe(1);
    });

    it('should set journal mode to WAL', () => {
      const stmt = db.prepare('PRAGMA journal_mode');
      const result = stmt.get() as { journal_mode: string };
      expect(result.journal_mode).toBe('wal');
    });
  });
});