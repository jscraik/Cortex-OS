import { describe, expect, it } from 'vitest';
import { Qwen3Embedder } from '../src/embed/qwen3';

describe('Qwen3Embedder external script', () => {
  it('invokes python script', async () => {
    const embedder = new Qwen3Embedder({ modelSize: '0.6B', cacheDir: '/tmp' });
    await expect(embedder.embed(['test'])).rejects.toThrow(/Python embedding process failed/);
  });
});
