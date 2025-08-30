import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ModelRouter } from '../src/model-router.js';

describe('local mapping loader', () => {
  let prev: string | undefined;
  beforeEach(() => {
    prev = process.env.USE_LOCAL_MODELS;
    process.env.USE_LOCAL_MODELS = 'true';
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.USE_LOCAL_MODELS;
    else process.env.USE_LOCAL_MODELS = prev;
  });

  it('loads mapping from data/model-gateway-local-models.json', async () => {
    const router = new ModelRouter();
    await router.initialize();
    const embeddings = router.getAvailableModels('embedding');
    expect(Array.isArray(embeddings)).toBe(true);
    expect(embeddings.length).toBeGreaterThan(0);
    expect(embeddings[0].name).toBe('qwen3-embedding-4b-mlx');
  });
});
