import { describe, expect, it, vi } from 'vitest';
import type { MLXAdapter } from '../src/adapters/mlx-adapter';
import type { OllamaAdapter } from '../src/adapters/ollama-adapter';
import { ModelRouter } from '../src/model-router';

describe('ModelRouter initialization', () => {
  it('registers models based on adapter availability', async () => {
    const mlxAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      generateEmbeddings: vi.fn(),
    } as unknown as MLXAdapter;
    const ollamaAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      listModels: vi.fn().mockResolvedValue(['llama2']),
      generateChat: vi.fn(),
      generateEmbeddings: vi.fn(),
      rerank: vi.fn(),
    } as unknown as OllamaAdapter;

    const router = new ModelRouter(mlxAdapter, ollamaAdapter);
    await router.initialize();

    expect(mlxAdapter.isAvailable).toHaveBeenCalled();
    expect(ollamaAdapter.isAvailable).toHaveBeenCalled();
    expect(router.hasAvailableModels('embedding')).toBe(true);
    expect(router.getAvailableModels('chat')).toEqual([
      expect.objectContaining({ name: 'llama2', provider: 'ollama' }),
    ]);
  });
});
