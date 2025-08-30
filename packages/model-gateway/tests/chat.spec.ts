import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MLXAdapter } from '../src/adapters/mlx-adapter';
import { OllamaAdapter } from '../src/adapters/ollama-adapter';
import { ModelRouter, type ChatRequest } from '../src/model-router';

describe('ModelRouter - Chat Generation', () => {
  let router: ModelRouter;
  let mockMLXAdapter: MLXAdapter;
  let mockOllamaAdapter: OllamaAdapter;

  beforeEach(() => {
    mockMLXAdapter = {
      generateChat: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    } as any;

    mockOllamaAdapter = {
      generateChat: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    } as any;

    router = new ModelRouter(mockMLXAdapter, mockOllamaAdapter);
  });

  it('should generate chat response with proper type safety', async () => {
    // Arrange: Create a properly typed ChatRequest
    const chatRequest: ChatRequest = {
      messages: [{ role: 'user', content: 'hello' }],
      model: 'test-model',
      max_tokens: 100,
      temperature: 0.7,
    };

    const expectedResponse = {
      content: 'Hello! How can I help you?',
      model: 'test-model',
    };

    (mockOllamaAdapter.generateChat as any).mockResolvedValue(expectedResponse);

    // Act: Call generateChat with properly typed request
    const result = await router.generateChat(chatRequest);

    // Assert
    expect(result).toEqual(expectedResponse);
    expect(mockOllamaAdapter.generateChat).toHaveBeenCalledWith(chatRequest);
  });

  it('should handle minimal chat request', async () => {
    // Arrange: Create minimal valid ChatRequest
    const chatRequest: ChatRequest = {
      messages: [{ role: 'user', content: 'hello' }],
    };

    const expectedResponse = {
      content: 'Hello!',
      model: 'default-model',
    };

    (mockOllamaAdapter.generateChat as any).mockResolvedValue(expectedResponse);

    // Act
    const result = await router.generateChat(chatRequest);

    // Assert
    expect(result).toEqual(expectedResponse);
  });

  it('should handle system and assistant messages', async () => {
    // Arrange: Create ChatRequest with different message roles
    const chatRequest: ChatRequest = {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the weather like?' },
        { role: 'assistant', content: 'I need more location information.' },
        { role: 'user', content: 'In New York' },
      ],
      model: 'gpt-4',
      temperature: 0.5,
    };

    const expectedResponse = {
      content: 'The weather in New York is sunny.',
      model: 'gpt-4',
    };

    (mockOllamaAdapter.generateChat as any).mockResolvedValue(expectedResponse);

    // Act
    const result = await router.generateChat(chatRequest);

    // Assert
    expect(result).toEqual(expectedResponse);
    expect(mockOllamaAdapter.generateChat).toHaveBeenCalledWith(chatRequest);
  });
});
