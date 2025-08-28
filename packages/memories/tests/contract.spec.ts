import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import type { MemoryStore } from '../src/ports/MemoryStore.js';
import type { Memory } from '../src/domain/types.js';

function sample(id: string, text: string, vector?: number[]): Memory {
  const now = new Date().toISOString();
  return {
    id,
    kind: 'note',
    text,
    vector,
    tags: ['t'],
    ttl: undefined,
    createdAt: now,
    updatedAt: now,
    provenance: { source: 'system' },
  };
}

describe('MemoryStore contract - in memory', () => {
  it('upsert/get/delete roundtrip', async () => {
    const store: MemoryStore = new InMemoryStore();
    const m = sample('a', 'hello');
    await store.upsert(m);
    expect(await store.get('a')).toMatchObject({ id: 'a', text: 'hello' });
    await store.delete('a');
    expect(await store.get('a')).toBeNull();
  });

  it('searchByText filters and limits', async () => {
    const s = new InMemoryStore();
    await s.upsert(sample('1', 'alpha bravo', undefined));
    await s.upsert(sample('2', 'charlie delta', undefined));
    const r = await s.searchByText({ text: 'alpha', topK: 5 });
    expect(r.length).toBe(1);
    expect(r[0].id).toBe('1');
  });

  it('searchByVector ranks by cosine', async () => {
    const s = new InMemoryStore();
    await s.upsert(sample('1', 'v1', [1, 0, 0]));
    await s.upsert(sample('2', 'v2', [0.8, 0.2, 0]));
    await s.upsert(sample('3', 'v3', [0, 1, 0]));
    const r = await s.searchByVector({ vector: [1, 0, 0], topK: 2 });
    expect(r.map((x) => x.id)).toEqual(['1', '2']);
  });
});
