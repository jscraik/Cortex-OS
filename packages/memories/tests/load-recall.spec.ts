import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import { Memory } from '../src/domain/types.js';

describe('InMemoryStore recall under load', () => {
  it('retrieves the correct record when many exist', async () => {
    const store = new InMemoryStore();
    const now = new Date().toISOString();
    for (let i = 0; i < 200; i++) {
      const rec: Memory = {
        id: String(i),
        kind: 'note',
        text: `msg ${i}`,
        tags: [],
        createdAt: now,
        updatedAt: now,
        provenance: { source: 'user' },
      } as Memory;
      await store.upsert(rec);
    }
    const res = await store.searchByText({ text: 'msg 199', topK: 1 });
    expect(res[0]?.text).toBe('msg 199');
  });
});
