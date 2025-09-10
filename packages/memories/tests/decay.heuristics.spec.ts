import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import type { Memory } from '../src/domain/types.js';

describe('Decay Heuristics', () => {
  const prev = { ...process.env };
  beforeEach(() => {
    process.env.MEMORIES_DECAY_ENABLED = 'true';
    process.env.MEMORIES_DECAY_HALFLIFE_MS = '1000';
  });
  afterEach(() => {
    process.env = { ...prev };
  });

  it('ranks newer items higher for text search when decay enabled', async () => {
    const store = new InMemoryStore();
    const now = Date.now();
    const mk = (id: string, ageMs: number): Memory => ({
      id,
      kind: 'note',
      text: 'same match note',
      tags: [],
      createdAt: new Date(now - ageMs).toISOString(),
      updatedAt: new Date(now - ageMs).toISOString(),
      provenance: { source: 'system' },
    });
    await store.upsert(mk('old', 10_000));
    await store.upsert(mk('new', 10));

    const res = await store.searchByText({ text: 'note', topK: 2 });
    expect(res[0]?.id).toBe('new');
    expect(res[1]?.id).toBe('old');
  });
});

