import { describe, expect, it } from 'vitest';
import { Qwen3Reranker } from '../src/pipeline/qwen3-reranker';

describe('Qwen3Reranker external script', () => {
  it('invokes python reranker script', async () => {
    const reranker = new Qwen3Reranker({ cacheDir: '/tmp' });
    await expect(reranker.rerank('query', [{ id: '1', text: 'doc' }])).rejects.toBeTruthy();
  });
});
