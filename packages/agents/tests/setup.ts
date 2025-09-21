import { vi } from 'vitest';

// Mock the missing model-gateway adapters
vi.mock('@cortex-os/model-gateway/dist/adapters/mlx-adapter.js', () => ({
  MLXAdapter: vi.fn().mockImplementation(() => ({
    isAvailable: vi.fn().mockResolvedValue(false),
    generateChat: vi.fn().mockResolvedValue({ response: 'Mocked MLX response' }),
  })),
}));

vi.mock('@cortex-os/model-gateway/dist/adapters/ollama-adapter.js', () => ({
  OllamaAdapter: vi.fn().mockImplementation(() => ({
    generateChat: vi.fn().mockResolvedValue({ response: 'Mocked Ollama response' }),
  })),
}));