import { describe, expect, it, vi } from 'vitest';
import { CompositeEmbedder } from '../src/adapters/embedder.composite.js';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import { createMemoryService } from '../src/service/memory-service.js';
import { LocalEmbedder } from './util/local-embedder.js';

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

  it('saves memory when vector present', async () => {
    const svc = createMemoryService(new InMemoryStore(), new LocalEmbedder());
    const now = new Date().toISOString();
    const saved = await svc.save({
      id: 'm2',
      kind: 'note',
      text: 'pre',
      vector: [0.1, 0.2],
      tags: [],
      createdAt: now,
      updatedAt: now,
      provenance: { source: 'system' },
    });
    expect(saved.vector).toEqual([0.1, 0.2]);
  });

  it('searches by vector', async () => {
    const store = new InMemoryStore();
    const embedder = new LocalEmbedder();
    const svc = createMemoryService(store, embedder);
    const now = new Date().toISOString();
    const mem = await svc.save({
      id: 'v1',
      kind: 'note',
      text: 'vector',
      tags: [],
      createdAt: now,
      updatedAt: now,
      provenance: { source: 'system' },
    });
    const results = await svc.search({ vector: mem.vector });
    expect(results[0]?.id).toBe('v1');
  });

  it('embeds during text search', async () => {
    const store = new InMemoryStore();
    const embedder = new LocalEmbedder();
    const spy = vi.spyOn(embedder, 'embed');
    const svc = createMemoryService(store, embedder);
    const now = new Date().toISOString();
    await svc.save({
      id: 't1',
      kind: 'note',
      text: 'hello world',
      tags: [],
      createdAt: now,
      updatedAt: now,
      provenance: { source: 'system' },
    });
    const results = await svc.search({ text: 'hello world' });
    expect(spy).toHaveBeenCalled();
    expect(results[0]?.id).toBe('t1');
  });

  it('returns empty search results when no query', async () => {
    const svc = createMemoryService(new InMemoryStore(), new LocalEmbedder());
    const results = await svc.search({});
    expect(results).toEqual([]);
  });

  it('exposes embedder availability', async () => {
    const embedder = new CompositeEmbedder(new LocalEmbedder());
    const svc = createMemoryService(new InMemoryStore(), embedder);
    const status = await svc.testEmbedders?.();
    expect(status).toEqual([{ name: 'local-sim', available: true }]);
  });

  it('deletes memory entries', async () => {
    const svc = createMemoryService(new InMemoryStore(), new LocalEmbedder());
    const now = new Date().toISOString();
    await svc.save({
      id: 'd1',
      kind: 'note',
      text: 'bye',
      tags: [],
      createdAt: now,
      updatedAt: now,
      provenance: { source: 'system' },
    });
    await svc.del('d1');
    const fetched = await svc.get('d1');
    expect(fetched).toBeNull();
  });

  it('purges expired memories via service', async () => {
    const svc = createMemoryService(new InMemoryStore(), new LocalEmbedder());
    const now = new Date().toISOString();
    await svc.save({
      id: 'p1',
      kind: 'note',
      text: 'temp',
      ttl: 'PT1S',
      tags: [],
      createdAt: now,
      updatedAt: now,
      provenance: { source: 'system' },
    });
    const purged = await svc.purge(new Date(Date.now() + 2000).toISOString());
    expect(purged).toBe(1);
  });

  it('purges with current time when no timestamp provided', async () => {
    const svc = createMemoryService(new InMemoryStore(), new LocalEmbedder());
    const result = await svc.purge();
    expect(result).toBe(0);
  });
});
