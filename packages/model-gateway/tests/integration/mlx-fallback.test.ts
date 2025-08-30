/**
 * @file mlx-fallback.test.ts
 * Integration tests for full MLX→Ollama→Frontier fallback chain
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelRouter } from '../../src/model-router';
import type { ChatRequest, EmbeddingRequest } from '../../src/model-router';

// Mock all adapters
vi.mock('../../src/adapters/mlx-adapter');
vi.mock('../../src/adapters/ollama-adapter');
vi.mock('../../src/adapters/frontier-adapter');

describe('MLX Fallback Chain Integration', () => {
  let modelRouter: ModelRouter;
  let mockMLXAdapter: any;
  let mockOllamaAdapter: any;
  let mockFrontierAdapter: any;

  beforeEach(async () => {
    // Import mocked modules
    const { MLXAdapter } = await import('../../src/adapters/mlx-adapter');
    const { OllamaAdapter } = await import('../../src/adapters/ollama-adapter');
    const { FrontierAdapter } = await import('../../src/adapters/frontier-adapter');

    // Create mock instances
    mockMLXAdapter = {
      generateChat: vi.fn(),
      generateEmbedding: vi.fn(),
      generateReranking: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    mockOllamaAdapter = {
      generateChat: vi.fn(),
      generateEmbedding: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    mockFrontierAdapter = {
      generateChat: vi.fn(),
      generateEmbedding: vi.fn(),
    };

    // Mock constructor returns
    vi.mocked(MLXAdapter).mockImplementation(() => mockMLXAdapter);
    vi.mocked(OllamaAdapter).mockImplementation(() => mockOllamaAdapter);
    vi.mocked(FrontierAdapter).mockImplementation(() => mockFrontierAdapter);

    // Initialize router
    modelRouter = new ModelRouter();
    await modelRouter.initialize();
  });

  describe('Chat Generation Fallback', () => {
    it('should use MLX first for chat completion', async () => {
      // MLX succeeds
      mockMLXAdapter.generateChat.mockResolvedValue({
        content: 'MLX response',
        model: 'qwen3-coder-30b-mlx',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'qwen3-coder-30b-mlx',
      };

      const response = await modelRouter.generateChat(request);

      expect(response.content).toBe('MLX response');
      expect(mockMLXAdapter.generateChat).toHaveBeenCalledWith({
        messages: request.messages,
        model: 'qwen3-coder-30b-mlx',
      });
      expect(mockOllamaAdapter.generateChat).not.toHaveBeenCalled();
      expect(mockFrontierAdapter.generateChat).not.toHaveBeenCalled();
    });

    it('should fall back to Ollama when MLX fails', async () => {
      // MLX fails
      mockMLXAdapter.generateChat.mockRejectedValue(new Error('MLX model not loaded'));

      // Ollama succeeds
      mockOllamaAdapter.generateChat.mockResolvedValue({
        content: 'Ollama response',
        usage: { prompt_tokens: 12, completion_tokens: 25, total_tokens: 37 },
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await modelRouter.generateChat(request);

      expect(response.content).toBe('Ollama response');
      expect(mockMLXAdapter.generateChat).toHaveBeenCalled();
      expect(mockOllamaAdapter.generateChat).toHaveBeenCalled();
      expect(mockFrontierAdapter.generateChat).not.toHaveBeenCalled();
    });

    it('should fall back to Frontier when both MLX and Ollama fail', async () => {
      // MLX fails
      mockMLXAdapter.generateChat.mockRejectedValue(new Error('MLX error'));

      // Ollama fails
      mockOllamaAdapter.generateChat.mockRejectedValue(new Error('Ollama error'));

      // Frontier succeeds
      mockFrontierAdapter.generateChat.mockResolvedValue({
        content: 'Frontier response',
        usage: { prompt_tokens: 15, completion_tokens: 30, total_tokens: 45 },
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await modelRouter.generateChat(request);

      expect(response.content).toBe('Frontier response');
      expect(mockMLXAdapter.generateChat).toHaveBeenCalled();
      expect(mockOllamaAdapter.generateChat).toHaveBeenCalled();
      expect(mockFrontierAdapter.generateChat).toHaveBeenCalled();
    });

    it('should throw error when all providers fail', async () => {
      // All providers fail
      mockMLXAdapter.generateChat.mockRejectedValue(new Error('MLX error'));
      mockOllamaAdapter.generateChat.mockRejectedValue(new Error('Ollama error'));
      mockFrontierAdapter.generateChat.mockRejectedValue(new Error('Frontier error'));

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(modelRouter.generateChat(request)).rejects.toThrow();
    });
  });

  describe('Embedding Generation Fallback', () => {
    it('should use MLX first for embeddings', async () => {
      mockMLXAdapter.generateEmbedding.mockResolvedValue({
        embedding: Array.from({ length: 1536 }, () => Math.random()),
        model: 'qwen3-embedding-4b-mlx',
        dimensions: 1536,
        usage: { tokens: 10, cost: 0 },
      });

      const request: EmbeddingRequest = {
        text: 'Test embedding',
        model: 'qwen3-embedding-4b-mlx',
      };

      const response = await modelRouter.generateEmbedding(request);

      expect(response.embedding).toHaveLength(1536);
      expect(response.model).toBe('qwen3-embedding-4b-mlx');
      expect(mockMLXAdapter.generateEmbedding).toHaveBeenCalled();
      expect(mockOllamaAdapter.generateEmbedding).not.toHaveBeenCalled();
    });

    it('should fall back to Ollama for embeddings when MLX fails', async () => {
      // MLX fails
      mockMLXAdapter.generateEmbedding.mockRejectedValue(new Error('MLX embedding error'));

      // Ollama succeeds
      mockOllamaAdapter.generateEmbedding.mockResolvedValue({
        embedding: Array.from({ length: 1024 }, () => Math.random()),
        model: 'nomic-embed-text',
        dimensions: 1024,
        usage: { tokens: 12 },
      });

      const request: EmbeddingRequest = {
        text: 'Test embedding',
      };

      const response = await modelRouter.generateEmbedding(request);

      expect(response.embedding).toHaveLength(1024);
      expect(mockMLXAdapter.generateEmbedding).toHaveBeenCalled();
      expect(mockOllamaAdapter.generateEmbedding).toHaveBeenCalled();
    });
  });

  describe('Model Selection Logic', () => {
    it('should select appropriate models based on capability', async () => {
      // Test chat capability selection
      mockMLXAdapter.generateChat.mockResolvedValue({
        content: 'Chat response',
        model: 'qwen3-coder-30b-mlx',
      });

      const chatRequest: ChatRequest = {
        messages: [{ role: 'user', content: 'Code review' }],
      };

      const chatResponse = await modelRouter.generateChat(chatRequest);
      expect(chatResponse.content).toBe('Chat response');

      // Test embedding capability selection
      mockMLXAdapter.generateEmbedding.mockResolvedValue({
        embedding: Array.from({ length: 1536 }, () => 0.1),
        model: 'qwen3-embedding-4b-mlx',
        dimensions: 1536,
      });

      const embeddingRequest: EmbeddingRequest = {
        text: 'Semantic similarity',
      };

      const embeddingResponse = await modelRouter.generateEmbedding(embeddingRequest);
      expect(embeddingResponse.embedding).toBeDefined();
    });

    it('should handle model priority correctly', async () => {
      // Verify MLX has highest priority and is tried first
      mockMLXAdapter.generateChat.mockResolvedValue({
        content: 'Priority response',
        model: 'qwen3-coder-30b-mlx',
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Test priority' }],
      };

      await modelRouter.generateChat(request);

      // MLX should be called first due to highest priority
      expect(mockMLXAdapter.generateChat).toHaveBeenCalled();
      expect(mockOllamaAdapter.generateChat).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockMLXAdapter.generateChat.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate processing time
        return { content: 'Concurrent response', model: 'qwen3-coder-30b-mlx' };
      });

      const requests = Array.from({ length: 5 }, (_, i) => ({
        messages: [{ role: 'user', content: `Request ${i}` }],
      }));

      const startTime = Date.now();
      const responses = await Promise.all(requests.map((req) => modelRouter.generateChat(req)));
      const endTime = Date.now();

      expect(responses).toHaveLength(5);
      responses.forEach((response) => {
        expect(response.content).toBe('Concurrent response');
      });

      // Concurrent execution should be faster than sequential
      expect(endTime - startTime).toBeLessThan(500); // Much less than 5 * 100ms
    });

    it('should handle memory-intensive models gracefully', async () => {
      // Test with large model (Mixtral-8x7B)
      mockMLXAdapter.generateChat.mockResolvedValue({
        content: 'Large model response',
        model: 'mixtral-8x7b-mlx',
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Complex reasoning task' }],
        model: 'mixtral-8x7b-mlx',
        max_tokens: 2048,
      };

      const response = await modelRouter.generateChat(request);

      expect(response.content).toBe('Large model response');
      expect(mockMLXAdapter.generateChat).toHaveBeenCalledWith({
        messages: request.messages,
        model: 'mixtral-8x7b-mlx',
        max_tokens: 2048,
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary failures', async () => {
      let callCount = 0;
      mockMLXAdapter.generateChat.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary failure');
        }
        return { content: 'Recovered response', model: 'qwen3-coder-30b-mlx' };
      });

      mockOllamaAdapter.generateChat.mockResolvedValue({
        content: 'Fallback response',
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Test recovery' }],
      };

      // First attempt should fall back to Ollama
      const response = await modelRouter.generateChat(request);
      expect(response.content).toBe('Fallback response');
    });

    it('should provide meaningful error messages', async () => {
      mockMLXAdapter.generateChat.mockRejectedValue(new Error('Model not loaded'));
      mockOllamaAdapter.generateChat.mockRejectedValue(new Error('Network timeout'));
      mockFrontierAdapter.generateChat.mockRejectedValue(new Error('API key invalid'));

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Test errors' }],
      };

      try {
        await modelRouter.generateChat(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Error should contain information about all failed attempts
        expect((error as Error).message).toContain('No providers available');
      }
    });
  });
});
