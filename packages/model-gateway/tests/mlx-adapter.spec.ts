import { describe, it, expect, vi } from 'vitest';
import { MLXAdapter } from '../src/adapters/mlx-adapter';

describe('MLXAdapter', () => {
  it('generates embeddings using the Python script', async () => {
    const adapter = new MLXAdapter();
    vi.spyOn(adapter as any, 'executePythonScript').mockResolvedValue(JSON.stringify([[0.1, 0.2]]));
    const result = await adapter.generateEmbedding({ text: 'test' });
    expect(result.embedding).toEqual([0.1, 0.2]);
  });

  it('reports availability based on script success', async () => {
    const adapter = new MLXAdapter();
    vi.spyOn(adapter as any, 'executePythonScript').mockResolvedValue('[]');
    await expect(adapter.isAvailable()).resolves.toBe(true);
  });
});
