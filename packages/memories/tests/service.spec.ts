import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import { LocalEmbedder } from './util/local-embedder.js';
import { createMemoryService } from '../src/service/memory-service.js';

describe('MemoryService', () => {
  it('throws when embedder is missing', () => {
    // @ts-expect-error intentionally missing embedder
    expect(() => createMemoryService(new InMemoryStore(), undefined as any)).toThrow(
      'embedder:missing',
    );
  });

  it('embeds when vector missing and embedder provided', async () => {
    const svc = createMemoryService(new InMemoryStore(), new LocalEmbedder());
    const now = new Date().toISOString();
    const saved = await svc.save({
      id: 'm1',
      kind: 'note',
      text: 'abc',
      tags: [],
      createdAt: now,
      updatedAt: now,
      provenance: { source: 'system' },
    });
    expect(saved.vector?.length).toBe(128);
    expect(saved.embeddingModel).toBe('local-sim');
  });

  it('fails search when embedder errors', async () => {
    const failing = {
      name: () => 'fail',
      embed: async () => {
        throw new Error('no embedder');
      },
    };
    const svc = createMemoryService(new InMemoryStore(), failing);
    await expect(svc.search({ text: 'hello' })).rejects.toThrow();
  });
});
