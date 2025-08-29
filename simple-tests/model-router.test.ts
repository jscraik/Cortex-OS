import { describe, it, expect } from 'vitest';
import { ModelRouter } from '../packages/model-gateway/src/model-router';

class MockMLXAdapter {
  async isAvailable() {
    return true;
  }
  async generateEmbedding({ text, model }: { text: string; model: string }) {
    return { embedding: [1, 2, 3] };
  }
  async generateEmbeddings(texts: string[], model: string) {
    return texts.map(() => ({ embedding: [1, 2, 3] }));
  }
}

class MockOllamaAdapter {
  async isAvailable() {
    return true;
  }
  async listModels() {
    return ['llama2'];
  }
  async generateEmbedding(text: string, model: string) {
    return { embedding: [4, 5, 6] };
  }
  async generateEmbeddings(texts: string[], model: string) {
    return texts.map(() => ({ embedding: [4, 5, 6] }));
  }
  async generateChat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string,
    _options?: { temperature?: number; max_tokens?: number },
  ) {
    return { content: 'hi' };
  }
  async rerank(query: string, documents: string[], model: string) {
    return { scores: documents.map(() => 0.5) };
  }
}

class UnavailableMLXAdapter extends MockMLXAdapter {
  async isAvailable() {
    return false;
  }
}

describe('ModelRouter initialization', () => {
  it('initializes models for all capabilities when providers available', async () => {
    const router = new ModelRouter(new MockMLXAdapter() as any, new MockOllamaAdapter() as any);
    await router.initialize();
    expect(router.hasAvailableModels('embedding')).toBe(true);
    expect(router.hasAvailableModels('chat')).toBe(true);
    expect(router.hasAvailableModels('reranking')).toBe(true);

    const e = await router.generateEmbedding({ text: 'hello' });
    expect(e.model).toBe('qwen3-embedding-4b-mlx');

    const c = await router.generateChat({
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(c.model).toBe('llama2');

    const r = await router.rerank({
      query: 'q',
      documents: ['a', 'b'],
    });
    expect(r.model).toBe('nomic-embed-text');
    expect(r.scores).toHaveLength(2);
  });

  it('detects unavailable mlx provider for embeddings', async () => {
    const router = new ModelRouter(new UnavailableMLXAdapter() as any, new MockOllamaAdapter() as any);
    await router.initialize();
    const models = router.getAvailableModels('embedding');
    expect(models).toHaveLength(1);
    expect(models[0].provider).toBe('ollama');
  });
});
