import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MLXAdapter } from '../src/adapters/mlx-adapter';

describe('MLXAdapter', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test'; // Ensure test mode
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  it('generates embeddings in test mode', async () => {
    const adapter = new MLXAdapter();
    const result = await adapter.generateEmbedding({ text: 'test' });

    expect(result.embedding).toHaveLength(1536); // Fixed dimensions in test mode
    expect(result.model).toBe('qwen3-embedding-4b-mlx');
    expect(result.dimensions).toBe(1536);
    expect(result.usage?.tokens).toBeGreaterThan(0);
    expect(result.usage?.cost).toBe(0); // Local inference
  });

  it('reports availability in test mode', async () => {
    const adapter = new MLXAdapter();
    const isAvailable = await adapter.isAvailable();
    expect(isAvailable).toBe(true); // Should be true in test mode
  });

  it('generates batch embeddings in test mode', async () => {
    const adapter = new MLXAdapter();
    const texts = ['text1', 'text2'];
    const results = await adapter.generateEmbeddings(texts);

    expect(results).toHaveLength(2);
    results.forEach((result, index) => {
      expect(result.embedding).toHaveLength(1536);
      expect(result.model).toBe('qwen3-embedding-4b-mlx');
      expect(result.dimensions).toBe(1536);
    });
  });

  it('generates chat completions in test mode', async () => {
    const adapter = new MLXAdapter();
    const result = await adapter.generateChat({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'qwen3-coder-30b-mlx',
    });

    expect(result.content).toContain('Mock response to: user: Hello');
    expect(result.model).toBe('qwen3-coder-30b-mlx');
  });

  it('generates reranking scores in test mode', async () => {
    const adapter = new MLXAdapter();
    const result = await adapter.rerank('query', ['doc1', 'doc2'], 'qwen3-reranker-4b-mlx');

    expect(result.scores).toHaveLength(2);
    result.scores.forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(0.1);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });
});
