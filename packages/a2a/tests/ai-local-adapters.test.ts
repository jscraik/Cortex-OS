/**
 * @file Local Adapter Tests
 * @description Tests for local adapter implementations (MLX, Ollama)
 */

import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AIRequest, EmbeddingRequest, RerankingRequest } from '../src/ai/adapter.js';
import { AICapability, ModelProvider } from '../src/ai/config.js';
import { createMLXAdapter } from '../src/ai/mlx-adapter.js';
import { createOllamaAdapter } from '../src/ai/ollama-adapter.js';

// Mock child_process for MLX
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs for file operations
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  const mockCreate = vi.fn(() => ({ get: vi.fn(), post: vi.fn() }));
  // Return both a top-level `create` and a `default` export with create so
  // tests using either `axios.create` or `import axios from 'axios'` work.
  return {
    ...actual,
    create: mockCreate,
    default: { ...actual, create: mockCreate },
  } as any;
});

describe('Local Adapters', () => {
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      provider: ModelProvider.MLX,
      model: 'mlx-community/Qwen2.5-7B-Instruct-4bit',
      endpoint: 'http://localhost:8080',
      temperature: 0.7,
      maxTokens: 1000,
    };

    vi.clearAllMocks();
  });

  // Helper: create a mock axios instance where post() returns a promise that
  // can be aborted via an AbortSignal. This keeps the cancellation test
  // readable and avoids deep nesting that lints may flag.
  // Top-level helper for the cancellable post behavior. Keeping this at the
  // module level reduces nested-function depth inside the test body.
  function createCancelablePost(url: string, body: any, options?: any) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        resolve({
          data: {
            choices: [
              {
                message: { content: 'Late response' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          },
        });
      }, 500);

      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new Error('Request aborted'));
        });
      }
    });
  }

  const createCancelableMockAxios = () => {
    const post = vi.fn((url: string, body: any, options?: any) =>
      createCancelablePost(url, body, options),
    );

    return { get: vi.fn(), post };
  };

  describe('MLX Adapter', () => {
    it('should create MLX adapter with correct configuration', () => {
      const adapter = createMLXAdapter(mockConfig);

      expect(adapter.getName()).toBe('MLX-mlx-community/Qwen2.5-7B-Instruct-4bit');
      expect(adapter.getVersion()).toBe('1.0.0');
    });

    it('should generate text using MLX server', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
        maxTokens: 1000,
        temperature: 0.7,
      };

      // Mock axios for HTTP requests
      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() =>
          Promise.resolve({
            status: 200,
            data: {
              choices: [
                {
                  message: { content: 'MLX generated text' },
                  finish_reason: 'stop',
                },
              ],
              usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
            },
          }),
        ),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      const result = await adapter.generateText(request);

      expect(result).toEqual({
        content: 'MLX generated text',
        confidence: expect.any(Number),
        metadata: expect.any(Object),
        modelUsed: adapter.getName(),
        processingTime: expect.any(Number),
        success: true,
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v1/chat/completions',
        {
          model: 'mlx-community/Qwen2.5-7B-Instruct-4bit',
          messages: [
            { role: 'system', content: expect.any(String) },
            { role: 'user', content: 'Test prompt' },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          stream: false,
        },
        expect.any(Object),
      );
    });

    it('should handle MLX server errors gracefully', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() => Promise.reject(new Error('Internal server error'))),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      await expect(adapter.generateText(request)).rejects.toThrow(
        'MLX generation failed: Internal server error',
      );
    });

    it('should handle network errors', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const mockAxiosInstance = {
        get: vi.fn(() => Promise.reject(new Error('Network Error'))),
        post: vi.fn(() => Promise.reject(new Error('Network Error'))),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      await expect(adapter.generateText(request)).rejects.toThrow(
        'MLX generation failed: Network Error',
      );
    });

    it('should check health status', async () => {
      const mockAxiosInstance = {
        get: vi.fn(() => Promise.resolve({ status: 200 })),
        post: vi.fn(),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      const isHealthy = await adapter.isHealthy();

      expect(isHealthy).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health', { timeout: 5000 });
    });

    it('should return false for health check when server is down', async () => {
      const mockAxiosInstance = {
        get: vi.fn(() => Promise.reject(new Error('Connection failed'))),
        post: vi.fn(),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      const isHealthy = await adapter.isHealthy();

      expect(isHealthy).toBe(false);
    });

    it('should generate embeddings using MLX', async () => {
      const request: EmbeddingRequest = {
        text: 'Test text',
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() =>
          Promise.resolve({
            status: 200,
            data: {
              data: [{ embedding: [0.1, 0.2, 0.3] }],
              usage: { prompt_tokens: 5, total_tokens: 5 },
            },
          }),
        ),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      const result = await adapter.generateEmbedding(request);

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3],
        dimensions: 3,
        modelUsed: adapter.getName(),
        processingTime: expect.any(Number),
        success: true,
      });
    });

    it('should handle MLX server timeout', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn().mockRejectedValue(new Error('Timeout')),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      await expect(adapter.generateText(request)).rejects.toThrow('MLX generation failed: Timeout');
    });
  });

  describe('Ollama Adapter', () => {
    beforeEach(() => {
      mockConfig.provider = ModelProvider.OLLAMA;
      mockConfig.model = 'llama2';
      mockConfig.endpoint = 'http://localhost:11434';
    });

    it('should create Ollama adapter with correct configuration', () => {
      const adapter = createOllamaAdapter(mockConfig);

      expect(adapter.getName()).toBe('Ollama-llama2');
      expect(adapter.getVersion()).toBe('1.0.0');
    });

    it('should generate text using Ollama API', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
        maxTokens: 1000,
        temperature: 0.7,
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() =>
          Promise.resolve({
            status: 200,
            data: {
              response: 'Ollama generated text',
              done: true,
              eval_count: 20,
              eval_duration: 1000000000,
              prompt_eval_count: 10,
              prompt_eval_duration: 500000000,
            },
          }),
        ),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createOllamaAdapter(mockConfig);

      const result = await adapter.generateText(request);

      expect(result).toEqual({
        content: 'Ollama generated text',
        confidence: expect.any(Number),
        metadata: expect.any(Object),
        modelUsed: adapter.getName(),
        processingTime: expect.any(Number),
        success: true,
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/generate',
        {
          model: 'llama2',
          prompt: expect.stringContaining('Test prompt'),
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1000,
          },
        },
        expect.any(Object),
      );
    });

    it('should handle streaming responses', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const mockStreamResponse = [
        { response: 'Hello', done: false },
        { response: ' world', done: false },
        { response: '!', done: true, eval_count: 15, eval_duration: 800000000 },
      ];

      let callCount = 0;
      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() =>
          Promise.resolve({
            status: 200,
            data: mockStreamResponse[callCount++],
          }),
        ),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createOllamaAdapter(mockConfig);

      const result = await adapter.generateText(request);

      // Ollama adapter currently reads a single response chunk; expect first chunk
      expect(result.content).toBe('Hello');
    });

    it('should handle Ollama API errors', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() => Promise.reject(new Error("model 'llama2' not found"))),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createOllamaAdapter(mockConfig);

      await expect(adapter.generateText(request)).rejects.toThrow(
        "Ollama generation failed: model 'llama2' not found",
      );
    });

    it('should check health status', async () => {
      const mockAxiosInstance = {
        get: vi.fn(() =>
          Promise.resolve({
            status: 200,
            data: { models: [{ name: 'llama2' }] },
          }),
        ),
        post: vi.fn(),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createOllamaAdapter(mockConfig);

      const isHealthy = await adapter.isHealthy();

      expect(isHealthy).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tags', { timeout: 5000 });
    });

    it('should generate embeddings using Ollama', async () => {
      const request: EmbeddingRequest = {
        text: 'Test text',
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() =>
          Promise.resolve({
            status: 200,
            data: {
              embedding: [0.1, 0.2, 0.3],
            },
          }),
        ),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createOllamaAdapter(mockConfig);

      const result = await adapter.generateEmbedding(request);

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3],
        dimensions: 3,
        modelUsed: adapter.getName(),
        processingTime: expect.any(Number),
        success: true,
      });
    });

    it('should handle model not available', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() => Promise.reject(new Error("model 'llama2' not found"))),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createOllamaAdapter(mockConfig);

      await expect(adapter.generateText(request)).rejects.toThrow(
        "Ollama generation failed: model 'llama2' not found",
      );
    });
  });

  describe('Common Local Adapter Functionality', () => {
    it('should return adapter statistics', async () => {
      const mlxAdapter = createMLXAdapter(mockConfig);
      const ollamaAdapter = createOllamaAdapter({ ...mockConfig, provider: ModelProvider.OLLAMA });

      const mlxStats = mlxAdapter.getStats();
      const ollamaStats = ollamaAdapter.getStats();

      expect(mlxStats).toEqual({
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        lastUsed: null,
        isAvailable: true,
      });

      expect(ollamaStats).toEqual({
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        lastUsed: null,
        isAvailable: true,
      });
    });

    it('should cleanup resources', async () => {
      const mlxAdapter = createMLXAdapter(mockConfig);
      const ollamaAdapter = createOllamaAdapter({ ...mockConfig, provider: ModelProvider.OLLAMA });

      await expect(mlxAdapter.cleanup()).resolves.toBeUndefined();
      await expect(ollamaAdapter.cleanup()).resolves.toBeUndefined();
    });

    it('should handle reranking requests', async () => {
      const request: RerankingRequest = {
        query: 'query',
        items: ['doc1', 'doc2'],
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        // Rerank uses generateText internally; return a response string with indices
        post: vi.fn(() =>
          Promise.resolve({
            status: 200,
            data: {
              response: '0,1',
              done: true,
            },
          }),
        ),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createOllamaAdapter({ ...mockConfig, provider: ModelProvider.OLLAMA });

      const result = await adapter.rerank(request);

      expect(result).toEqual({
        rankedItems: [
          { index: 0, score: 1.0, content: 'doc1' },
          { index: 1, score: 0.5, content: 'doc2' },
        ],
        modelUsed: adapter.getName(),
        processingTime: expect.any(Number),
        success: true,
      });
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle server startup delays', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      // First call fails with connection refused
      let callCount = 0;
      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('Connection refused'));
          }
          return Promise.resolve({
            data: {
              choices: [
                {
                  message: { content: 'Success after retry' },
                  finish_reason: 'stop',
                },
              ],
              usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
            },
          });
        }),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      const result = await adapter.generateText(request);

      expect(result.content).toBe('Success after retry');
      expect(callCount).toBe(2);
    });

    it('should handle model loading delays', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      let callCount = 0;
      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('model is loading'));
          }
          return Promise.resolve({
            data: {
              response: 'Model loaded successfully',
              done: true,
              eval_count: 20,
            },
          });
        }),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createOllamaAdapter({ ...mockConfig, provider: ModelProvider.OLLAMA });

      const result = await adapter.generateText(request);

      expect(result.content).toBe('Model loaded successfully');
    });

    it('should handle insufficient resources', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() => Promise.reject(new Error('Insufficient memory'))),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      await expect(adapter.generateText(request)).rejects.toThrow(
        'MLX generation failed: Insufficient memory',
      );
    });

    it('should handle malformed responses', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() =>
          Promise.resolve({
            data: {
              invalid_response: 'malformed',
              // Missing required fields
            },
          }),
        ),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createOllamaAdapter({ ...mockConfig, provider: ModelProvider.OLLAMA });

      await expect(adapter.generateText(request)).rejects.toThrow(
        'Ollama generation failed: Unexpected token',
      );
    });

    it('should handle network timeouts', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn().mockRejectedValue(new Error('Network timeout')),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      await expect(adapter.generateText(request)).rejects.toThrow('MLX generation failed: Timeout');
    });
  });

  describe('Resource Management', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(() =>
          Promise.resolve({
            data: {
              response: 'Concurrent response',
              done: true,
              eval_count: 15,
            },
          }),
        ),
      };

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createOllamaAdapter({ ...mockConfig, provider: ModelProvider.OLLAMA });

      const requests: AIRequest[] = [
        { prompt: 'Prompt 1', capability: AICapability.SEMANTIC_ROUTING },
        { prompt: 'Prompt 2', capability: AICapability.SEMANTIC_ROUTING },
        { prompt: 'Prompt 3', capability: AICapability.SEMANTIC_ROUTING },
      ];

      const promises = requests.map((request) => adapter.generateText(request));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.content).toBe('Concurrent response');
      });
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    it('should handle request cancellation', async () => {
      const request: AIRequest = {
        prompt: 'Test prompt',
        capability: AICapability.SEMANTIC_ROUTING,
      };

      const mockAxiosInstance = createCancelableMockAxios();

      (axios.create as any).mockReturnValue(mockAxiosInstance);

      const adapter = createMLXAdapter(mockConfig);

      const abortController = new AbortController();
      setTimeout(() => abortController.abort(), 100);

      await expect(
        // pass the signal so the adapter forwards it to axios and the mock
        // can reject when aborted
        adapter.generateText({ ...request, timeout: 100, signal: abortController.signal }),
      ).rejects.toThrow('MLX generation failed: Request aborted');
    });
  });
});
