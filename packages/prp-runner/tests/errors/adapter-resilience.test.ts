import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mock for 'ollama'
let ollamaGenerateMock: (...args: unknown[]) => Promise<{ response?: string }>;
vi.mock('ollama', () => ({
  Ollama: class {
    generate = (...args: unknown[]) => ollamaGenerateMock(...args);
  },
  default: class {
    generate = (...args: unknown[]) => ollamaGenerateMock(...args);
  },
}));

import { LLMBridge } from '../../src/llm-bridge';
import * as MlxAdapterModule from '../../src/mlx-adapter';
import { metrics } from '../../src/monitoring/metrics';

describe('Adapter resilience', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    // default mock resolves
    ollamaGenerateMock = async () => ({ response: 'ok' });
  });

  it('retries and succeeds for Ollama generate, and opens breaker after threshold', async () => {
    // Mock Ollama client via module factory
    const generate = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ response: 'ok' });
    ollamaGenerateMock = generate as unknown as typeof ollamaGenerateMock;

    const bridge = new LLMBridge({
      provider: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'llama3',
    });
    const text = await bridge.generate('hi');
    expect(text).toBe('ok');

    // Now force failures beyond threshold to open breaker
    generate.mockRejectedValue(new Error('down'));
    await expect(bridge.generate('again')).rejects.toThrow();
    await expect(bridge.generate('again')).rejects.toThrow();
    await expect(bridge.generate('again')).rejects.toThrow(); // opens

    // Immediately next call should be blocked by breaker
    await expect(bridge.generate('blocked')).rejects.toThrow('Circuit open');
  });

  it('retries MLX generate via breaker wrapper when adapter is healthy', async () => {
    // Mock MLX adapter
    const checkHealth = vi.fn().mockResolvedValue({ healthy: true, message: 'ok' });
    const generate = vi
      .fn()
      .mockRejectedValueOnce(new Error('temp'))
      .mockResolvedValueOnce('final');

    vi.spyOn(MlxAdapterModule, 'createMLXAdapter').mockImplementation(
      (): MlxAdapterModule.MLXAdapter =>
        ({
          checkHealth,
          generate,
          listModels: vi.fn(),
        }) as unknown as MlxAdapterModule.MLXAdapter,
    );

    const bridge = new LLMBridge({ provider: 'mlx', mlxModel: 'QWEN_SMALL' });
    const text = await bridge.generate('hello');
    expect(text).toBe('final');
  });

  it('uses config-driven breaker options for Ollama', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('fail'));
    ollamaGenerateMock = generate as unknown as typeof ollamaGenerateMock;
    const bridge = new LLMBridge({
      provider: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'llama3',
      breakers: { ollama: { threshold: 1, timeout: 50 } },
    });
    await expect(bridge.generate('x')).rejects.toThrow();
    await expect(bridge.generate('y')).rejects.toThrow('Circuit open');
  });

  it('keys MLX breaker per model and integrates metrics on state change', async () => {
    const checkHealth = vi.fn().mockResolvedValue({ healthy: true, message: 'ok' });
    const generate = vi.fn().mockRejectedValue(new Error('boom'));
    vi.spyOn(MlxAdapterModule, 'createMLXAdapter').mockImplementation(
      (): MlxAdapterModule.MLXAdapter =>
        ({
          checkHealth,
          generate,
          listModels: vi.fn(),
        }) as unknown as MlxAdapterModule.MLXAdapter,
    );

    // Spy on metrics hook
    const inc = vi.spyOn(metrics, 'incCounter');

    const bridge = new LLMBridge({
      provider: 'mlx',
      mlxModel: 'QWEN_SMALL',
      breakers: { mlx: { threshold: 1, timeout: 10 } },
    });
    await expect(bridge.generate('t')).rejects.toThrow();
    expect(inc).toHaveBeenCalled();
  });
});
