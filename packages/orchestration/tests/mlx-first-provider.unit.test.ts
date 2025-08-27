/**
 * MLX-First Provider Unit Tests
 * Tests the actual MLXFirstModelProvider with mocked dependencies
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MLXFirstModelProvider } from '../src/providers/mlx-first-provider.js';

// Test constants
const TEST_CONSTANTS = {
  TASKS: {
    QUICK_REASONING: 'quickReasoning',
    EMBEDDINGS: 'embeddings',
    RERANKING: 'reranking',
    UNKNOWN: 'unknown-task',
  },
  PROVIDERS: {
    MLX: 'mlx',
    OLLAMA: 'ollama',
  },
  MODELS: {
    MLX_DEFAULT: 'mlx-model',
    OLLAMA_DEFAULT: 'ollama-model',
  },
  URLS: {
    MLX: 'http://localhost:8765',
    OLLAMA: 'http://localhost:11434',
  },
} as const;

// Mock fetch globally
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

// Mock environment variables / strategy
vi.mock('../../../../config/model-strategy.js', () => ({
  MODEL_STRATEGY: {
    [TEST_CONSTANTS.TASKS.QUICK_REASONING]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'light' },
    },
    [TEST_CONSTANTS.TASKS.EMBEDDINGS]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'heavy' },
    },
    [TEST_CONSTANTS.TASKS.RERANKING]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'moderate' },
    },
  },
}));

// Prevent background health checks from starting during tests
const originalSetInterval = global.setInterval;
global.setInterval = vi.fn() as any;

/**
 * MLX-First Provider Unit Tests
 * Tests the actual MLXFirstModelProvider with mocked dependencies
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MLXFirstModelProvider } from '../src/providers/mlx-first-provider.js';

// Test constants
const TEST_CONSTANTS = {
  TASKS: {
    QUICK_REASONING: 'quickReasoning',
    EMBEDDINGS: 'embeddings',
    RERANKING: 'reranking',
    UNKNOWN: 'unknown-task',
  },
  PROVIDERS: {
    MLX: 'mlx',
    OLLAMA: 'ollama',
  },
  MODELS: {
    MLX_DEFAULT: 'mlx-model',
    OLLAMA_DEFAULT: 'ollama-model',
  },
  URLS: {
    MLX: 'http://localhost:8765',
    OLLAMA: 'http://localhost:11434',
  },
} as const;

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
vi.mock('../../../../config/model-strategy.js', () => ({
  MODEL_STRATEGY: {
    [TEST_CONSTANTS.TASKS.QUICK_REASONING]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'light' },
    },
    [TEST_CONSTANTS.TASKS.EMBEDDINGS]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'heavy' },
    },
    [TEST_CONSTANTS.TASKS.RERANKING]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'moderate' },
    },
  },
}));

// Mock setInterval to prevent background health checks during tests
const originalSetInterval = global.setInterval;
global.setInterval = vi.fn() as any;

describe('MLXFirstModelProvider', () => {
  let provider: MLXFirstModelProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    provider = new MLXFirstModelProvider();
  });

  afterAll(() => {
    global.setInterval = originalSetInterval;
  });

  describe('generate', () => {
    it('should use MLX service when healthy', async () => {
      const mockRequest = { 
        prompt: 'test prompt',
      };
      const mockResponse = { 
        content: 'test response',
      };

      // Mock MLX health check (200 response)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      // Mock MLX generate call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, mockRequest as any);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${TEST_CONSTANTS.URLS.MLX}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: TEST_CONSTANTS.MODELS.MLX_DEFAULT,
          ...mockRequest,
        }),
      });
      expect(result.content).toBe(mockResponse.content);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama when MLX is unhealthy', async () => {
      const mockRequest = { 
        prompt: 'test prompt',
      };
      const mockResponse = { 
        response: 'ollama response',
      };

      // Mock MLX health check (unhealthy)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Mock Ollama health check (healthy)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      // Mock Ollama generate call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, mockRequest as any);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${TEST_CONSTANTS.URLS.MLX}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.OLLAMA}/api/tags`);
      expect(mockFetch).toHaveBeenNthCalledWith(3, `${TEST_CONSTANTS.URLS.OLLAMA}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT,
          prompt: mockRequest.prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1000,
          },
        }),
      });
      expect(result.content).toBe(mockResponse.response);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
    });

    it('should throw error when both services are unhealthy', async () => {
      // Mock both services as unhealthy
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, { prompt: 'test' } as any)
      ).rejects.toThrow(`All providers failed for task: ${TEST_CONSTANTS.TASKS.QUICK_REASONING}`);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error for unknown task', async () => {
      await expect(
        provider.generate(TEST_CONSTANTS.TASKS.UNKNOWN, { prompt: 'test' } as any)
      ).rejects.toThrow(`Unknown task: ${TEST_CONSTANTS.TASKS.UNKNOWN}`);
      
      // Should not make any fetch calls for unknown task
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('embed', () => {
    it('should use MLX service for embeddings when healthy', async () => {
      const mockRequest = { texts: ['embed this text'] };
      const mockResponse = { 
        embeddings: [[0.1, 0.2, 0.3]],
        dimensions: 3
      };

      // Mock MLX health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      // Mock MLX embed call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.embed(mockRequest as any);

      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/embed`, expect.any(Object));
      expect(result.embeddings).toEqual(mockResponse.embeddings);
      expect(result.dimensions).toEqual(mockResponse.dimensions);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama for embeddings when MLX is unhealthy', async () => {
      const mockRequest = { texts: ['embed this text'] };
      
      // Mock successful Ollama generation (for semantic vectors)
      const mockOllamaResponse = { response: '0.1,0.2,0.3' };

      // Mock MLX health check (unhealthy)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Mock Ollama health check (healthy)
      mockFetch.mockResolvedValueOnce({
        ok: true, 
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      // Mock Ollama generate call (for each text in the array)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockOllamaResponse),
      });

      const result = await provider.embed(mockRequest as any);

      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
      expect(result.embeddings).toBeDefined();
      expect(Array.isArray(result.embeddings)).toBe(true);
      expect(result.embeddings.length).toBe(1); // One embedding per text
      expect(result.dimensions).toBeGreaterThan(0);
    });
  });

  describe('rerank', () => {
    it('should use MLX service for reranking when healthy', async () => {
      const query = 'test query';
      const documents = ['doc1', 'doc2'];
      const mockResponse = { scores: [0.9, 0.7] };

      // Mock MLX health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      // Mock MLX rerank call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.rerank(query, documents);

      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/rerank`, expect.any(Object));
      expect(result.scores).toEqual(mockResponse.scores);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama for reranking when MLX is unhealthy', async () => {
      const query = 'test query';
      const documents = ['doc1', 'doc2'];
      
      // Mock MLX health check (unhealthy)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Mock Ollama health check (healthy)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      // Mock Ollama generate calls (one for each document)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: '0.8' }),
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: '0.6' }),
      });

      const result = await provider.rerank(query, documents);

      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
      expect(result.scores).toHaveLength(2);
      expect(result.scores.every((score: number) => score >= 0 && score <= 1)).toBe(true);
    });
  });

  describe('getOptimalModel', () => {
    it('should return primary model when MLX is healthy', () => {
      const result = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any);
      expect(result).toEqual({
        model: TEST_CONSTANTS.MODELS.MLX_DEFAULT,
      });
    });

    it('should return fallback model when MLX is unhealthy', () => {
      // Mark MLX as unhealthy
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });
      
      // Make the health check run immediately
      (provider as any).checkMLXHealth();
      
      const result = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any);
      expect(result).toEqual({
        model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT,
      });
    });

    it('should honor latency constraints', () => {
      const result = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any, { maxLatency: 50 });
      expect(result).toEqual({
        model: TEST_CONSTANTS.MODELS.MLX_DEFAULT,
      });
    });

    it('should return null for unknown task', () => {
      const result = provider.getOptimalModel(TEST_CONSTANTS.TASKS.UNKNOWN as any);
      expect(result).toBeNull();
    });
    
    it('should honor memory constraints', () => {
      const lightResult = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any, { maxMemory: 'light' } as any);
      expect(lightResult).toEqual({
        model: TEST_CONSTANTS.MODELS.MLX_DEFAULT, 
      });
      
      const heavyResult = provider.getOptimalModel(TEST_CONSTANTS.TASKS.EMBEDDINGS as any, { maxMemory: 'light' } as any);
      expect(heavyResult).toEqual({
        model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT,
      });
    });
  });

  describe('error handling', () => {
    it('should catch and log MLX errors during generation', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock MLX health check (healthy)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });
      
      // Mock MLX generate call (failure)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      
      // Mock Ollama health check (healthy)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });
      
      // Mock Ollama generate call (success)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: 'fallback response' }),
      });
      
      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING as any, { prompt: 'test' } as any);
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
      
      consoleWarnSpy.mockRestore();
    });
  });
});

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    provider = new MLXFirstModelProvider();
  });

  afterAll(() => {
    global.setInterval = originalSetInterval;
  });

  describe('generate', () => {
    it('should use MLX service when healthy', async () => {
      const mockRequest = { prompt: 'test prompt' };
      const mockResponse = { content: 'test response' };

      // Mock MLX health check
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });
      // Mock MLX generate
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockResponse) });

      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, mockRequest as any);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${TEST_CONSTANTS.URLS.MLX}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: TEST_CONSTANTS.MODELS.MLX_DEFAULT, ...mockRequest }),
      });
      expect(result.content).toBe(mockResponse.content);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama when MLX is unhealthy', async () => {
      const mockRequest = { prompt: 'test prompt' };
      const ollamaResponse = { response: 'ollama response' };

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }); // MLX health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) }); // Ollama health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(ollamaResponse) }); // Ollama generate

      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, mockRequest as any);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${TEST_CONSTANTS.URLS.MLX}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.OLLAMA}/api/tags`);
      expect(mockFetch).toHaveBeenNthCalledWith(3, `${TEST_CONSTANTS.URLS.OLLAMA}/api/generate`, expect.any(Object));
      expect(result.content).toBe(ollamaResponse.response);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
    });

    it('should throw when both services fail', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, { prompt: 'test' } as any)).rejects.toThrow(
        `All providers failed for task: ${TEST_CONSTANTS.TASKS.QUICK_REASONING}`,
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw for unknown task without calling services', async () => {
      await expect(provider.generate(TEST_CONSTANTS.TASKS.UNKNOWN, { prompt: 'x' } as any)).rejects.toThrow(
        `Unknown task: ${TEST_CONSTANTS.TASKS.UNKNOWN}`,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('embed', () => {
    it('should use MLX embed when healthy', async () => {
      const request = { texts: ['embed me'] };
      const mlxResponse = { embeddings: [[0.1, 0.2, 0.3]], dimensions: 3 };

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mlxResponse) });

      const res = await provider.embed(request as any);

      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/embed`, expect.any(Object));
      expect(res.embeddings).toEqual(mlxResponse.embeddings);
      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama embeddings when MLX fails', async () => {
      const request = { texts: ['one'] };

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }); // MLX health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) }); // Ollama health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ response: '0.1,0.2,0.3' }) }); // Ollama generate

      const res = await provider.embed(request as any);

      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
      expect(Array.isArray(res.embeddings)).toBe(true);
      expect(res.dimensions).toBeGreaterThan(0);
    });
  });

  describe('rerank', () => {
    it('should use MLX rerank when healthy', async () => {
      const query = 'q';
      const docs = ['a', 'b'];
      const mlxResponse = { scores: [0.9, 0.7] };

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mlxResponse) });

      const res = await provider.rerank(query, docs);

      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/rerank`, expect.any(Object));
      expect(res.scores).toEqual(mlxResponse.scores);
      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama rerank when MLX fails', async () => {
      const query = 'q';
      const docs = ['a'];

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }); // MLX health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) }); // Ollama health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ response: '0.5' }) }); // Ollama generate

      const res = await provider.rerank(query, docs);

      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
      expect(res.scores.length).toBe(1);
    });
  });

  describe('getOptimalModel', () => {
    it('returns primary when healthy', () => {
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any);
      expect(r).toEqual({ model: TEST_CONSTANTS.MODELS.MLX_DEFAULT });
    });

    it('returns fallback when unhealthy', () => {
      (provider as any).healthChecks.set('mlx', false);
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any);
      expect(r).toEqual({ model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT });
    });

    it('honors latency constraint', () => {
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any, { maxLatency: 50 });
      expect(r).toEqual({ model: TEST_CONSTANTS.MODELS.MLX_DEFAULT });
    });

    it('returns null for unknown task', () => {
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.UNKNOWN as any);
      expect(r).toBeNull();
    });
  });
});
/**
 * MLX-First Provider Unit Tests
 * Tests the actual MLXFirstModelProvider with mocked dependencies
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MLXFirstModelProvider } from '../src/providers/mlx-first-provider.js';

// Test constants
const TEST_CONSTANTS = {
  TASKS: {
    QUICK_REASONING: 'quickReasoning',
    EMBEDDINGS: 'embeddings',
    RERANKING: 'reranking',
    UNKNOWN: 'unknown-task',
  },
  PROVIDERS: {
    MLX: 'mlx',
    OLLAMA: 'ollama',
  },
  MODELS: {
    MLX_DEFAULT: 'mlx-model',
    OLLAMA_DEFAULT: 'ollama-model',
  },
  URLS: {
    MLX: 'http://localhost:8765',
    OLLAMA: 'http://localhost:11434',
  },
} as const;

// Mock fetch globally
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

// Mock environment variables / strategy
vi.mock('../../../../config/model-strategy.js', () => ({
  MODEL_STRATEGY: {
    [TEST_CONSTANTS.TASKS.QUICK_REASONING]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'light' },
    },
    [TEST_CONSTANTS.TASKS.EMBEDDINGS]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'heavy' },
    },
    [TEST_CONSTANTS.TASKS.RERANKING]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'moderate' },
    },
  },
}));

// Prevent background health checks from starting during tests
const originalSetInterval = global.setInterval;
global.setInterval = vi.fn() as any;

describe('MLXFirstModelProvider', () => {
  let provider: MLXFirstModelProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    provider = new MLXFirstModelProvider();
  });

  afterAll(() => {
    global.setInterval = originalSetInterval;
  });

  describe('generate', () => {
    it('should use MLX service when healthy', async () => {
      const mockRequest = { prompt: 'test prompt' };
      const mockResponse = { content: 'test response' };

      // Mock MLX health check
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });
      // Mock MLX generate
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockResponse) });

      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, mockRequest as any);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${TEST_CONSTANTS.URLS.MLX}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: TEST_CONSTANTS.MODELS.MLX_DEFAULT, ...mockRequest }),
      });
      expect(result.content).toBe(mockResponse.content);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama when MLX is unhealthy', async () => {
      const mockRequest = { prompt: 'test prompt' };
      const ollamaResponse = { response: 'ollama response' };

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }); // MLX health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) }); // Ollama health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(ollamaResponse) }); // Ollama generate

      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, mockRequest as any);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${TEST_CONSTANTS.URLS.MLX}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.OLLAMA}/api/tags`);
      expect(mockFetch).toHaveBeenNthCalledWith(3, `${TEST_CONSTANTS.URLS.OLLAMA}/api/generate`, expect.any(Object));
      expect(result.content).toBe(ollamaResponse.response);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
    });

    it('should throw when both services fail', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, { prompt: 'test' } as any)).rejects.toThrow(
        `All providers failed for task: ${TEST_CONSTANTS.TASKS.QUICK_REASONING}`,
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw for unknown task without calling services', async () => {
      await expect(provider.generate(TEST_CONSTANTS.TASKS.UNKNOWN, { prompt: 'x' } as any)).rejects.toThrow(
        `Unknown task: ${TEST_CONSTANTS.TASKS.UNKNOWN}`,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('embed', () => {
    it('should use MLX embed when healthy', async () => {
      const request = { texts: ['embed me'] };
      const mlxResponse = { embeddings: [[0.1, 0.2, 0.3]], dimensions: 3 };

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mlxResponse) });

      const res = await provider.embed(request as any);

      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/embed`, expect.any(Object));
      expect(res.embeddings).toEqual(mlxResponse.embeddings);
      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama embeddings when MLX fails', async () => {
      const request = { texts: ['one'] };

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }); // MLX health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) }); // Ollama health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ response: '0.1,0.2,0.3' }) }); // Ollama generate

      const res = await provider.embed(request as any);

      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
      expect(Array.isArray(res.embeddings)).toBe(true);
      expect(res.dimensions).toBeGreaterThan(0);
    });
  });

  describe('rerank', () => {
    it('should use MLX rerank when healthy', async () => {
      const query = 'q';
      const docs = ['a', 'b'];
      const mlxResponse = { scores: [0.9, 0.7] };

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mlxResponse) });

      const res = await provider.rerank(query, docs);

      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/rerank`, expect.any(Object));
      expect(res.scores).toEqual(mlxResponse.scores);
      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama rerank when MLX fails', async () => {
      const query = 'q';
      const docs = ['a'];

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }); // MLX health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) }); // Ollama health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ response: '0.5' }) }); // Ollama generate

      const res = await provider.rerank(query, docs);

      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
      expect(res.scores.length).toBe(1);
    });
  });

  describe('getOptimalModel', () => {
    it('returns primary when healthy', () => {
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any);
      expect(r).toEqual({ model: TEST_CONSTANTS.MODELS.MLX_DEFAULT });
    });

    it('returns fallback when unhealthy', () => {
      (provider as any).healthChecks.set('mlx', false);
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any);
      expect(r).toEqual({ model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT });
    });

    it('honors latency constraint', () => {
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any, { maxLatency: 50 });
      expect(r).toEqual({ model: TEST_CONSTANTS.MODELS.MLX_DEFAULT });
    });

    it('returns null for unknown task', () => {
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.UNKNOWN as any);
      expect(r).toBeNull();
    });
  });
});
/**
 * MLX-First Provider Unit Tests
 * Tests the actual MLXFirstModelProvider with mocked dependencies
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MLXFirstModelProvider } from '../src/providers/mlx-first-provider.js';

// Test constants
const TEST_CONSTANTS = {
  TASKS: {
    QUICK_REASONING: 'quickReasoning',
    EMBEDDINGS: 'embeddings',
    RERANKING: 'reranking',
    UNKNOWN: 'unknown-task',
  },
  PROVIDERS: {
    MLX: 'mlx',
    OLLAMA: 'ollama',
  },
  MODELS: {
    MLX_DEFAULT: 'mlx-model',
    OLLAMA_DEFAULT: 'ollama-model',
  },
  URLS: {
    MLX: 'http://localhost:8765',
    OLLAMA: 'http://localhost:11434',
  },
} as const;

// Mock fetch globally
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

// Mock environment variables / strategy
vi.mock('../../../../config/model-strategy.js', () => ({
  MODEL_STRATEGY: {
    [TEST_CONSTANTS.TASKS.QUICK_REASONING]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'light' },
    },
    [TEST_CONSTANTS.TASKS.EMBEDDINGS]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'heavy' },
    },
    [TEST_CONSTANTS.TASKS.RERANKING]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
      performance: { memory: 'moderate' },
    },
  },
}));

// Prevent background health checks from starting during tests
const originalSetInterval = global.setInterval;
global.setInterval = vi.fn() as any;

describe('MLXFirstModelProvider', () => {
  let provider: MLXFirstModelProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    provider = new MLXFirstModelProvider();
  });

  afterAll(() => {
    global.setInterval = originalSetInterval;
  });

  describe('generate', () => {
    it('should use MLX service when healthy', async () => {
      const mockRequest = { prompt: 'test prompt' };
      const mockResponse = { content: 'test response' };

      // Mock MLX health check
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });
      // Mock MLX generate
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockResponse) });

      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, mockRequest as any);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${TEST_CONSTANTS.URLS.MLX}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: TEST_CONSTANTS.MODELS.MLX_DEFAULT, ...mockRequest }),
      });
      expect(result.content).toBe(mockResponse.content);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama when MLX is unhealthy', async () => {
      const mockRequest = { prompt: 'test prompt' };
      const ollamaResponse = { response: 'ollama response' };

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }); // MLX health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) }); // Ollama health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(ollamaResponse) }); // Ollama generate

      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, mockRequest as any);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${TEST_CONSTANTS.URLS.MLX}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.OLLAMA}/api/tags`);
      expect(mockFetch).toHaveBeenNthCalledWith(3, `${TEST_CONSTANTS.URLS.OLLAMA}/api/generate`, expect.any(Object));
      expect(result.content).toBe(ollamaResponse.response);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
    });

    it('should throw when both services fail', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, { prompt: 'test' } as any)).rejects.toThrow(
        `All providers failed for task: ${TEST_CONSTANTS.TASKS.QUICK_REASONING}`,
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw for unknown task without calling services', async () => {
      await expect(provider.generate(TEST_CONSTANTS.TASKS.UNKNOWN, { prompt: 'x' } as any)).rejects.toThrow(
        `Unknown task: ${TEST_CONSTANTS.TASKS.UNKNOWN}`,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('embed', () => {
    it('should use MLX embed when healthy', async () => {
      const request = { texts: ['embed me'] };
      const mlxResponse = { embeddings: [[0.1, 0.2, 0.3]], dimensions: 3 };

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mlxResponse) });

      const res = await provider.embed(request as any);

      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/embed`, expect.any(Object));
      expect(res.embeddings).toEqual(mlxResponse.embeddings);
      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama embeddings when MLX fails', async () => {
      const request = { texts: ['one'] };

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }); // MLX health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) }); // Ollama health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ response: '0.1,0.2,0.3' }) }); // Ollama generate

      const res = await provider.embed(request as any);

      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
      expect(Array.isArray(res.embeddings)).toBe(true);
      expect(res.dimensions).toBeGreaterThan(0);
    });
  });

  describe('rerank', () => {
    it('should use MLX rerank when healthy', async () => {
      const query = 'q';
      const docs = ['a', 'b'];
      const mlxResponse = { scores: [0.9, 0.7] };

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) });
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mlxResponse) });

      const res = await provider.rerank(query, docs);

      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/rerank`, expect.any(Object));
      expect(res.scores).toEqual(mlxResponse.scores);
      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama rerank when MLX fails', async () => {
      const query = 'q';
      const docs = ['a'];

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }); // MLX health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ status: 'healthy' }) }); // Ollama health
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ response: '0.5' }) }); // Ollama generate

      const res = await provider.rerank(query, docs);

      expect(res.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
      expect(res.scores.length).toBe(1);
    });
  });

  describe('getOptimalModel', () => {
    it('returns primary when healthy', () => {
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any);
      expect(r).toEqual({ model: TEST_CONSTANTS.MODELS.MLX_DEFAULT });
    });

    it('returns fallback when unhealthy', () => {
      (provider as any).healthChecks.set('mlx', false);
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any);
      expect(r).toEqual({ model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT });
    });

    it('honors latency constraint', () => {
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.QUICK_REASONING as any, { maxLatency: 50 });
      expect(r).toEqual({ model: TEST_CONSTANTS.MODELS.MLX_DEFAULT });
    });

    it('returns null for unknown task', () => {
      const r = provider.getOptimalModel(TEST_CONSTANTS.TASKS.UNKNOWN as any);
      expect(r).toBeNull();
    });
  });
});
/**
 * MLX-First Provider Unit Tests
 * Tests the actual MLXFirstModelProvider with mocked dependencies
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MLXFirstModelProvider } from '../src/providers/mlx-first-provider.js';

// Test constants
const TEST_CONSTANTS = {
  TASKS: {
    QUICK_REASONING: 'quickReasoning',
    UNKNOWN: 'unknown-task',
  },
  PROVIDERS: {
    MLX: 'mlx',
    OLLAMA: 'ollama',
  },
  MODELS: {
    MLX_DEFAULT: 'mlx-model',
    OLLAMA_DEFAULT: 'ollama-model',
  },
  URLS: {
    MLX: 'http://localhost:8765',
    OLLAMA: 'http://localhost:11434',
  },
} as const;

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
vi.mock('../../../../config/model-strategy.js', () => ({
  MODEL_STRATEGY: {
    [TEST_CONSTANTS.TASKS.QUICK_REASONING]: {
      primary: { model: TEST_CONSTANTS.MODELS.MLX_DEFAULT },
      fallback: { model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT },
    },
  },
}));

describe('MLXFirstModelProvider', () => {
  let provider: MLXFirstModelProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MLXFirstModelProvider();
  });

  describe('generate', () => {
    it('should use MLX service when healthy', async () => {
      const mockRequest = { 
        prompt: 'test prompt',
        model: TEST_CONSTANTS.MODELS.MLX_DEFAULT 
      };
      const mockResponse = { 
        text: 'test response',
        provider: TEST_CONSTANTS.PROVIDERS.MLX 
      };

      // Mock MLX health check (200 response)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      // Mock MLX generate call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, mockRequest);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${TEST_CONSTANTS.URLS.MLX}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockRequest),
      });
      expect(result.text).toBe(mockResponse.text);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.MLX);
    });

    it('should fallback to Ollama when MLX is unhealthy', async () => {
      const mockRequest = { 
        prompt: 'test prompt',
        model: TEST_CONSTANTS.MODELS.OLLAMA_DEFAULT 
      };
      const mockResponse = { 
        text: 'ollama response',
        provider: TEST_CONSTANTS.PROVIDERS.OLLAMA 
      };

      // Mock MLX health check (unhealthy)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Mock Ollama health check (healthy)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      // Mock Ollama generate call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, mockRequest);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${TEST_CONSTANTS.URLS.MLX}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.OLLAMA}/health`);
      expect(mockFetch).toHaveBeenNthCalledWith(3, `${TEST_CONSTANTS.URLS.OLLAMA}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockRequest),
      });
      expect(result.text).toBe(mockResponse.text);
      expect(result.provider).toBe(TEST_CONSTANTS.PROVIDERS.OLLAMA);
    });

    it('should throw error when both services are unhealthy', async () => {
      // Mock both services as unhealthy
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        provider.generate(TEST_CONSTANTS.TASKS.QUICK_REASONING, { prompt: 'test' })
      ).rejects.toThrow('All model providers are unavailable');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error for unknown task', async () => {
      await expect(
        provider.generate(TEST_CONSTANTS.TASKS.UNKNOWN, { prompt: 'test' })
      ).rejects.toThrow(`Unknown task: ${TEST_CONSTANTS.TASKS.UNKNOWN}`);
    });
  });

  describe('embed', () => {
    it('should use MLX service for embeddings when healthy', async () => {
      const mockRequest = { text: 'embed this text' };
      const mockResponse = { embedding: [0.1, 0.2, 0.3] };

      // Mock MLX health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      // Mock MLX embed call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.embed(mockRequest);

      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockRequest),
      });
      expect(result.embedding).toEqual(mockResponse.embedding);
    });
  });

  describe('rerank', () => {
    it('should use MLX service for reranking when healthy', async () => {
      const mockRequest = { 
        query: 'test query', 
        documents: ['doc1', 'doc2'] 
      };
      const mockResponse = { 
        rankings: [{ index: 0, score: 0.9 }, { index: 1, score: 0.7 }] 
      };

      // Mock MLX health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      // Mock MLX rerank call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.rerank(mockRequest);

      expect(mockFetch).toHaveBeenNthCalledWith(2, `${TEST_CONSTANTS.URLS.MLX}/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockRequest),
      });
      expect(result.rankings).toEqual(mockResponse.rankings);
    });
  });
});
    if (request.model === 'failing-model') {
      throw new Error('Ollama service error');
    }
    return {
      content: `Ollama response for ${request.prompt}`,
    };
  }

  async generateSemanticVectors(texts: string[]) {
    return texts.map(() => Array.from({ length: 768 }, () => Math.random()));
  }

  async compareRelevance(query: string, documents: string[]) {
    return documents.map(() => Math.random());
  }

  async healthCheck() {
    return { healthy: true };
  }
}

describe('MLXFirstModelProvider - Unit Tests', () => {
  let provider: TestMLXFirstModelProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new TestMLXFirstModelProvider();
  });

  describe('Health Checking', () => {
    it('should default to healthy when no health check has run', () => {
      const optimal = provider.getOptimalModel('quickReasoning');
      expect(optimal).toBeDefined();
      expect(optimal?.model).toBeDefined();
    });

    it('should mark provider unhealthy after failure', async () => {
      const request = {
        task: 'quickReasoning',
        prompt: 'Test prompt',
        maxTokens: 100,
      };

      // Mock MLX service to fail on next call
      const mlxService = (provider as any).mlxService;
      mlxService.generate = vi.fn().mockRejectedValueOnce(new Error('MLX failed'));

      try {
        await provider.generate('quickReasoning', request);
      } catch {
        // Expected to fail and mark unhealthy
      }

      // Verify fallback to Ollama
      const optimalAfterFailure = provider.getOptimalModel('quickReasoning');
      expect(optimalAfterFailure?.provider).toBe('ollama');
    });
  });

  describe('MLX-First Strategy', () => {
    it('should try MLX first for generation', async () => {
      const request = {
        task: 'quickReasoning',
        prompt: 'Test prompt',
        maxTokens: 100,
      };

      const result = await provider.generate('quickReasoning', request);

      expect(result.provider).toBe('mlx');
      expect(result.content).toContain('MLX response');
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should fallback to Ollama when MLX fails', async () => {
      const request = {
        task: 'quickReasoning',
        prompt: 'Test prompt',
        maxTokens: 100,
      };

      // Force MLX to fail
      const mlxService = (provider as any).mlxService;
      mlxService.generate = vi.fn().mockRejectedValue(new Error('MLX failed'));

      const result = await provider.generate('quickReasoning', request);

      expect(result.provider).toBe('ollama');
      expect(result.content).toContain('Ollama response');
    });

    it('should throw error when both providers fail', async () => {
      const request = {
        task: 'quickReasoning',
        prompt: 'Test prompt',
        maxTokens: 100,
      };

      // Mock both services to fail
      const mlxService = (provider as any).mlxService;
      const ollamaService = (provider as any).ollamaService;
      mlxService.generate = vi.fn().mockRejectedValue(new Error('MLX failed'));
      ollamaService.generate = vi.fn().mockRejectedValue(new Error('Ollama failed'));

      await expect(provider.generate('quickReasoning', request)).rejects.toThrow(
        'All providers failed for task: quickReasoning',
      );
    });
  });

  describe('Embedding Generation', () => {
    it('should use MLX for embeddings when healthy', async () => {
      const request = {
        texts: ['Hello world', 'Machine learning'],
      };

      const result = await provider.embed(request);

      expect(result.provider).toBe('mlx');
      expect(result.embeddings).toHaveLength(2);
      expect(result.dimensions).toBe(3);
    });

    it('should fallback to Ollama for embeddings when MLX fails', async () => {
      const request = {
        texts: ['Hello world', 'Machine learning'],
      };

      // Force MLX to fail
      const mlxService = (provider as any).mlxService;
      mlxService.embed = vi.fn().mockRejectedValue(new Error('MLX failed'));

      const result = await provider.embed(request);

      expect(result.provider).toBe('ollama');
      expect(result.embeddings).toHaveLength(2);
      expect(result.dimensions).toBe(768);
    });
  });

  describe('Document Reranking', () => {
    it('should use MLX for reranking when healthy', async () => {
      const query = 'machine learning';
      const documents = ['ML is great', 'Weather is nice', 'AI is future', 'Cooking recipes'];

      const result = await provider.rerank(query, documents);

      expect(result.provider).toBe('mlx');
      expect(result.scores).toHaveLength(4);
      expect(result.scores).toEqual([0.9, 0.7, 0.5, 0.3]);
    });

    it('should fallback to Ollama for reranking when MLX fails', async () => {
      const query = 'machine learning';
      const documents = ['ML is great', 'Weather is nice'];

      // Force MLX to fail
      const mlxService = (provider as any).mlxService;
      mlxService.rerank = vi.fn().mockRejectedValue(new Error('MLX failed'));

      const result = await provider.rerank(query, documents);

      expect(result.provider).toBe('ollama');
      expect(result.scores).toHaveLength(2);
      expect(result.scores.every((score) => score >= 0 && score <= 1)).toBe(true);
    });
  });

  describe('Model Selection', () => {
    it('should select MLX model when healthy', () => {
      const optimal = provider.getOptimalModel('quickReasoning');
      expect(optimal?.provider).toBe('mlx');
    });

    it('should select Ollama model when MLX is unhealthy', () => {
      // Mark MLX as unhealthy
      (provider as any).healthChecks.set('mlx', false);

      const optimal = provider.getOptimalModel('quickReasoning');
      expect(optimal?.provider).toBe('ollama');
    });

    it('should consider latency constraints', () => {
      const optimal = provider.getOptimalModel('quickReasoning', { maxLatency: 50 });
      expect(optimal?.provider).toBe('mlx');
    });

    it('should return null for unknown task', () => {
      const optimal = provider.getOptimalModel('unknown-task' as any);
      expect(optimal).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown task in generate', async () => {
      const request = {
        task: 'unknown',
        prompt: 'Test',
      };

      await expect(provider.generate('unknown-task' as any, request)).rejects.toThrow(
        'Unknown task: unknown-task',
      );
    });

    it('should handle network errors gracefully', async () => {
      const request = {
        task: 'quickReasoning',
        prompt: 'Test prompt',
      };

      // Mock network failure
      const mlxService = (provider as any).mlxService;
      mlxService.generate = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await provider.generate('quickReasoning', request);
      expect(result.provider).toBe('ollama');
    });
  });
});
