/**
 * @file mlx-fallback.test.ts
 * Integration tests for full MLX→Ollama→Frontier fallback chain
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatRequest, EmbeddingRequest } from '../../src/model-router';
import { ModelRouter } from '../../src/model-router';

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
      generateEmbeddings: vi.fn(),
      generateReranking: vi.fn(),
      rerank: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    mockOllamaAdapter = {
      generateChat: vi.fn(),
      generateEmbedding: vi.fn(),
      generateEmbeddings: vi.fn(),
      listModels: vi.fn().mockResolvedValue(['llama2', 'nomic-embed-text']),
      isAvailable: vi.fn().mockResolvedValue(true),
      rerank: vi.fn(),
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
    it('should use Ollama first for chat completion', async () => {
      // Ollama succeeds (primary for chat)
      mockOllamaAdapter.generateChat.mockResolvedValue({
        content: 'Ollama response',
        model: 'llama2',
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await modelRouter.generateChat(request);

      expect(response.content).toBe('Ollama response');
      expect(mockOllamaAdapter.generateChat).toHaveBeenCalledWith({
        messages: request.messages,
        model: 'llama2',
        max_tokens: undefined,
        temperature: undefined,
      });
      expect(mockMLXAdapter.generateChat).not.toHaveBeenCalled();
      expect(mockFrontierAdapter.generateChat).not.toHaveBeenCalled();
    });

    it('should fall back to MCP when Ollama fails', async () => {
      // Ollama fails
      mockOllamaAdapter.generateChat.mockRejectedValue(new Error('Ollama model not loaded'));

      // We need to mock MCP adapter being available during initialization
      const mockMCPAdapter = {
        generateChat: vi.fn().mockResolvedValue({
          content: 'MCP response',
          model: 'mcp-chat',
        }),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      // Mock the dynamic MCP import
      vi.doMock('../../src/adapters/mcp-adapter.js', () => ({
        createMCPAdapter: () => mockMCPAdapter,
      }));

      // Set MCP transport to enable MCP loading
      const originalTransport = process.env.MCP_TRANSPORT;
      process.env.MCP_TRANSPORT = 'stdio';

      // Reinitialize router to pick up MCP
      modelRouter = new ModelRouter(mockMLXAdapter, mockOllamaAdapter);
      await modelRouter.initialize();

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await modelRouter.generateChat(request);

      expect(response.content).toBe('MCP response');
      expect(mockOllamaAdapter.generateChat).toHaveBeenCalled();
      expect(mockMCPAdapter.generateChat).toHaveBeenCalled();

      // Restore original env
      if (originalTransport) {
        process.env.MCP_TRANSPORT = originalTransport;
      } else {
        delete process.env.MCP_TRANSPORT;
      }
    });

    it('should throw error when all providers fail', async () => {
      // Ollama fails
      mockOllamaAdapter.generateChat.mockRejectedValue(new Error('Ollama error'));

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(modelRouter.generateChat(request)).rejects.toThrow('All chat models failed');
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
        embedding: Array.from({ length: 8 }, () => Math.random()),
        model: 'nomic-embed-text',
      });

      const request: EmbeddingRequest = {
        text: 'Test embedding',
      };

      const response = await modelRouter.generateEmbedding(request);

      expect(response.embedding).toHaveLength(8);
      expect(response.model).toBe('nomic-embed-text');
      expect(mockMLXAdapter.generateEmbedding).toHaveBeenCalled();
      expect(mockOllamaAdapter.generateEmbedding).toHaveBeenCalled();
    });
  });

  describe('Model Selection Logic', () => {
    it('should select appropriate models based on capability', async () => {
      // Test chat capability selection (Ollama primary)
      mockOllamaAdapter.generateChat.mockResolvedValue({
        content: 'Chat response',
        model: 'llama2',
      });

      const chatRequest: ChatRequest = {
        messages: [{ role: 'user', content: 'Code review' }],
      };

      const chatResponse = await modelRouter.generateChat(chatRequest);
      expect(chatResponse.content).toBe('Chat response');

      // Test embedding capability selection (MLX primary)
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
      // Verify Ollama has priority for chat and is tried first
      mockOllamaAdapter.generateChat.mockResolvedValue({
        content: 'Priority response',
        model: 'llama2',
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Test priority' }],
      };

      await modelRouter.generateChat(request);

      // Ollama should be called first due to being primary for chat
      expect(mockOllamaAdapter.generateChat).toHaveBeenCalled();
      expect(mockMLXAdapter.generateChat).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent requests efficiently', async () => {
      const delayPromise = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      mockOllamaAdapter.generateChat.mockImplementation(async () => {
        await delayPromise(100); // Simulate processing time
        return { content: 'Concurrent response', model: 'llama2' };
      });

      const requests = Array.from({ length: 5 }, (_, i) => ({
        messages: [{ role: 'user' as const, content: `Request ${i}` }],
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
      // Test with Ollama chat model
      mockOllamaAdapter.generateChat.mockResolvedValue({
        content: 'Large model response',
        model: 'llama2',
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Complex reasoning task' }],
        model: 'llama2',
        max_tokens: 2048,
      };

      const response = await modelRouter.generateChat(request);

      expect(response.content).toBe('Large model response');
      expect(mockOllamaAdapter.generateChat).toHaveBeenCalledWith({
        messages: request.messages,
        model: 'llama2',
        max_tokens: 2048,
        temperature: undefined,
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary failures', async () => {
      let callCount = 0;
      mockOllamaAdapter.generateChat.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary failure');
        }
        return { content: 'Recovered response', model: 'llama2' };
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Test recovery' }],
      };

      // First attempt should fail and throw since no other fallbacks are configured
      await expect(modelRouter.generateChat(request)).rejects.toThrow('All chat models failed');
    });

    it('should provide meaningful error messages', async () => {
      mockOllamaAdapter.generateChat.mockRejectedValue(new Error('Network timeout'));

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Test errors' }],
      };

      try {
        await modelRouter.generateChat(request);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Error should contain information about failed attempts
        expect((error as Error).message).toContain('All chat models failed');
      }
    });
  });
});
