import { describe, expect, it, vi } from 'vitest';

vi.mock('@cortex-os/model-gateway', () => ({
  createModelRouter: () => ({
    initialize: vi.fn(),
    generateEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[1], [2]] }),
  }),
}));

import { createRouterEmbedder } from './lib/router-embedder';

describe('createRouterEmbedder', () => {
  it('wraps router generateEmbeddings', async () => {
    const E = await createRouterEmbedder();
    const out = await E.embed(['a', 'bb']);
    expect(out).toEqual([[1], [2]]);
  });
});
