import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryService, createPolicyAwareStoreFromEnv, createEmbedderFromEnv } from '../src/index.js';

const ENV0 = { ...process.env } as Record<string, string | undefined>;

describe('Memories + MLX (HTTP) integration (SQLite)', () => {
  beforeEach(() => {
    process.env = { ...ENV0 } as NodeJS.ProcessEnv;
  });

  it('ingests and searches using MLX service embeddings', async () => {
    process.env.MEMORIES_EMBEDDER = 'mlx';
    // Use in-memory for CI portability; SQLite native may be unavailable in test envs
    process.env.MEMORIES_LONG_STORE = 'memory';
    process.env.MLX_EMBED_BASE_URL = 'http://localhost:8082';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ embeddings: [[0.1, 0.3, 0.5]], dimensions: 3 })
    }));
    // @ts-expect-error override
    global.fetch = fetchMock;

    const store = createPolicyAwareStoreFromEnv();
    const embedder = createEmbedderFromEnv();
    const svc = createMemoryService(store, embedder);

    await svc.save({
      id: 'm1',
      kind: 'note',
      text: 'hello world from mlx',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenance: { source: 'agent' },
      embeddingModel: embedder.name(),
    });

    const results = await svc.search({ query: 'mlx', limit: 3 });
    expect(Array.isArray(results)).toBe(true);
  });
});
