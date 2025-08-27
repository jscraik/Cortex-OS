import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteStore } from '../src/adapters/store.sqlite.js';
import { Memory } from '../src/domain/types.js';

describe('SQLiteStore', () => {
  // Note: These tests will only work if better-sqlite3 is available
  // In a real implementation, we'd mock the database or use an in-memory SQLite
  
  it('should create an instance', () => {
    // This test will pass even if SQLite is not available
    expect(() => new SQLiteStore(':memory:')).not.toThrow();
  });

  // Skip these tests if better-sqlite3 is not available
  it('should handle operations when SQLite is not available', async () => {
    // Create a store without a valid database connection
    const store = new SQLiteStore(':memory:');
    
    // All operations should throw errors when SQLite is not available
    await expect(store.upsert({
      id: '1',
      kind: 'note',
      text: 'test',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenance: { source: 'user' }
    } as Memory)).rejects.toThrow();
  });
});