import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMBridge } from '../llm-bridge.js';

const generateMock = vi.fn();

vi.mock('ollama', () => {
  return {
    Ollama: vi.fn().mockImplementation(() => ({
      generate: generateMock,
    })),
  };
});

describe('Ollama Generation', () => {
  beforeEach(() => {
    generateMock.mockReset();
  });

  it('should generate text using Ollama adapter', async () => {
    generateMock.mockResolvedValue({ response: 'hello world' });

    const bridge = new LLMBridge({
      provider: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'llama3',
    });

    const result = await bridge.generate('hi');
    expect(result).toBe('hello world');
    expect(generateMock).toHaveBeenCalled();
  });

  it('should handle generation failures', async () => {
    generateMock.mockRejectedValue(new Error('boom'));

    const bridge = new LLMBridge({
      provider: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'llama3',
    });

    await expect(bridge.generate('hi')).rejects.toThrow('boom');
    expect(generateMock).toHaveBeenCalled();
  });
});
