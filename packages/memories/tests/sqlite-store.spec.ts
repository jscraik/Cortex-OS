import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteStore } from '../src/adapters/store.sqlite.js';
import type { Memory } from '../src/domain/types.js';

let sqliteAvailable = true;
let testStore: SQLiteStore;
try {
  testStore = new SQLiteStore(':memory:');
} catch {
  sqliteAvailable = false;
}

(sqliteAvailable ? describe : describe.skip)('SQLiteStore', () => {
  const now = new Date().toISOString();

  it('persists and retrieves memories', async () => {
    const m: Memory = {
      id: '1',
      kind: 'note',
      text: 'test',
      tags: [],
      createdAt: now,
      updatedAt: now,
      provenance: { source: 'user' },
    };
    await testStore.upsert(m);
    const fetched = await testStore.get('1');
    expect(fetched?.text).toBe('test');
  });
});
