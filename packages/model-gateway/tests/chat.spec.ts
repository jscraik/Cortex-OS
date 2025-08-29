import { describe, it, expect, vi } from 'vitest';
import { ModelRouter } from '../src/model-router';
import type { MLXAdapter } from '../src/adapters/mlx-adapter';
import type { OllamaAdapter } from '../src/adapters/ollama-adapter';

describe('ModelRouter chat', () => {
  it('routes chat requests through the Ollama adapter', async () => {
    const mlxAdapter = {
      isAvailable: vi.fn().mockResolvedValue(false),
    } as unknown as MLXAdapter;
    const ollamaAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      listModels: vi.fn().mockResolvedValue(['llama2']),
      generateChat: vi.fn().mockResolvedValue({ content: 'hi', model: 'llama2' }),
      generateEmbeddings: vi.fn(),
      rerank: vi.fn(),
    } as unknown as OllamaAdapter;

    const router = new ModelRouter(mlxAdapter, ollamaAdapter);
    await router.initialize();
    const result = await router.generateChat({
      messages: [{ role: 'user', content: 'hello' }],
    } as any);

    expect(result).toEqual({ content: 'hi', model: 'llama2' });
    expect(ollamaAdapter.generateChat).toHaveBeenCalled();
  });
});
