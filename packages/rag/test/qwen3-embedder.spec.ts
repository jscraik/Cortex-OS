import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as proc from '../../../src/lib/run-process.js';

describe('Qwen3Embedder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns embeddings via runProcess', async () => {
    vi.spyOn(proc, 'runProcess').mockResolvedValue({ embeddings: [[1, 2, 3]] } as any);
    const { Qwen3Embedder } = await import('../src/embed/qwen3');
    const embedder = new Qwen3Embedder({ modelSize: '0.6B' });
    const result = await embedder.embed(['hello']);
    expect(result).toEqual([[1, 2, 3]]);
    expect(proc.runProcess).toHaveBeenCalledTimes(1);
  });

  it('propagates process errors', async () => {
    vi.spyOn(proc, 'runProcess').mockRejectedValue(new Error('fail'));
    const { Qwen3Embedder } = await import('../src/embed/qwen3');
    const embedder = new Qwen3Embedder({ modelSize: '0.6B' });
    await expect(embedder.embed(['x'])).rejects.toThrow('fail');
  });

  it('propagates timeout errors', async () => {
    vi.spyOn(proc, 'runProcess').mockRejectedValue(new Error('timed out'));
    const { Qwen3Embedder } = await import('../src/embed/qwen3');
    const embedder = new Qwen3Embedder({ modelSize: '0.6B' });
    await expect(embedder.embed(['x'])).rejects.toThrow('timed out');
  });
});
