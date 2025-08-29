import { describe, expect, test, vi } from 'vitest';
import { embeddingsHandler } from '../src/handlers';
import type { ModelRouter } from '../src/model-router';

describe('embeddingsHandler', () => {
  test('returns vectors for single text', async () => {
    const router: Partial<ModelRouter> = {
      generateEmbedding: vi.fn().mockResolvedValue({ embedding: [1, 2], model: 'm' }),
      generateEmbeddings: vi.fn(),
    };
    const result = await embeddingsHandler(router as ModelRouter, { texts: ['hi'], model: 'm' });
    expect(result).toEqual({ vectors: [[1, 2]], dimensions: 2, modelUsed: 'm' });
  });

  test('throws on empty texts', async () => {
    const router: Partial<ModelRouter> = {};
    await expect(embeddingsHandler(router as ModelRouter, { texts: [] })).rejects.toMatchObject({
      message: 'texts must be a non-empty array',
      status: 400,
    });
  });
});
