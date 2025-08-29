import { describe, it, expect, vi } from 'vitest';
import {
  retrieve,
  rerank,
  assemblePrompt,
  generateAnswer,
  ragQuery,
  EmbeddingAdapter,
  RerankerAdapter,
  EmbeddingResult,
} from '../src/lib/rag';

describe('rag helpers', () => {
  it('retrieve returns results from embedding adapter', async () => {
    const adapter: EmbeddingAdapter = {
      similaritySearch: vi.fn().mockResolvedValue([{ text: 'doc', similarity: 0.9 }]),
    };
    const res = await retrieve('hello', adapter, 5, 0.3);
    expect(adapter.similaritySearch).toHaveBeenCalledWith({ text: 'hello', topK: 5, threshold: 0.3 });
    expect(res).toEqual([{ text: 'doc', similarity: 0.9 }]);
  });

  it('rerank reorders results when adapter provided', async () => {
    const results: EmbeddingResult[] = [
      { text: 'a', similarity: 0.1 },
      { text: 'b', similarity: 0.2 },
    ];
    const reranker: RerankerAdapter = {
      rerank: vi
        .fn()
        .mockResolvedValue([
          { text: 'b', score: 0.9, originalIndex: 1 },
          { text: 'a', score: 0.8, originalIndex: 0 },
        ]),
    };
    const reranked = await rerank('q', results, reranker, 2);
    expect(reranker.rerank).toHaveBeenCalled();
    expect(reranked[0]).toEqual({ text: 'b', similarity: 0.9 });
    expect(reranked[1]).toEqual({ text: 'a', similarity: 0.8 });
  });

  it('rerank returns original results when no adapter', async () => {
    const results: EmbeddingResult[] = [{ text: 'a', similarity: 0.1 }];
    const reranked = await rerank('q', results);
    expect(reranked).toEqual(results);
  });

  it('assemblePrompt builds prompt with context and system prompt', () => {
    const prompt = assemblePrompt('What is life?', ['doc1'], 'System');
    expect(prompt).toContain('System');
    expect(prompt).toContain('Context information');
    expect(prompt).toContain('Question: What is life?');
  });

  it('generateAnswer delegates to provided function', async () => {
    const gen = vi.fn().mockResolvedValue('answer');
    const result = await generateAnswer('prompt', { temperature: 0 }, gen);
    expect(gen).toHaveBeenCalledWith('prompt', { temperature: 0 });
    expect(result).toBe('answer');
  });

  it('ragQuery orchestrates helpers', async () => {
    const embedding: EmbeddingAdapter = {
      similaritySearch: vi
        .fn()
        .mockResolvedValue([
          { text: 'doc1', similarity: 0.4 },
          { text: 'doc2', similarity: 0.3 },
        ]),
    };
    const reranker: RerankerAdapter = {
      rerank: vi
        .fn()
        .mockResolvedValue([
          { text: 'doc2', score: 0.9, originalIndex: 1 },
          { text: 'doc1', score: 0.8, originalIndex: 0 },
        ]),
    };
    const gen = vi.fn().mockResolvedValue('final answer');

    const result = await ragQuery({ query: 'q' }, { embedding, reranker, generate: gen });
    expect(result.answer).toBe('final answer');
    expect(result.sources[0].text).toBe('doc2');
    expect(gen).toHaveBeenCalled();
  });
});
