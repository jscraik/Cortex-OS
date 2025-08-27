/**
 * @file Frontier Adapter Tests
 * @description Tests for frontier adapter implementations (OpenAI, Anthropic, Google, Cohere, Mistral)
 */

import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelProvider } from '../src/ai/config.js';
import {
  createAnthropicAdapter,
  createCohereAdapter,
  createGoogleAdapter,
  createMistralAdapter,
  createOpenAIAdapter,
} from '../src/ai/frontier-adapter.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('Frontier Adapters', () => {
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      provider: ModelProvider.OPENAI,
      model: 'gpt-4',
      apiKey: 'sk-test123',
      temperature: 0.7,
      maxTokens: 1000,
    };

    // Reset axios mocks
    vi.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockedAxios as any);
  });

  describe('OpenAI Adapter', () => {
    it('should create OpenAI adapter with correct configuration', () => {
      const adapter = createOpenAIAdapter(mockConfig);

      expect(adapter.getName()).toBe('OpenAI');
      expect(adapter.getVersion()).toBe('gpt-4');
    });

    it('should generate text successfully', async () => {
      const adapter = createOpenAIAdapter(mockConfig);
      const mockResponse = {
        data: {
          choices: [
            {
              message: { content: 'Generated text response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.generateText('Test prompt');

      expect(result).toEqual({
        text: 'Generated text response',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        finishReason: 'stop',
      });
      expect(mockedAxios.post).toHaveBeenCalledWith('/chat/completions', {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test prompt' }],
        temperature: 0.7,
        max_tokens: 1000,
      });
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const adapter = createOpenAIAdapter(mockConfig);
      const error = new Error('API rate limit exceeded');
      (error as any).response = {
        status: 429,
        data: { error: { message: 'Rate limit exceeded' } },
      };

      mockedAxios.post.mockRejectedValue(error);

      await expect(adapter.generateText('Test prompt')).rejects.toThrow('Rate limit exceeded');
    });

    it('should generate embeddings', async () => {
      const adapter = createOpenAIAdapter(mockConfig);
      const mockResponse = {
        data: {
          data: [{ embedding: [0.1, 0.2, 0.3] }],
          usage: { prompt_tokens: 5, total_tokens: 5 },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.generateEmbedding('Test text');

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3],
        usage: { prompt_tokens: 5, total_tokens: 5 },
      });
    });

    it('should check health status', async () => {
      const adapter = createOpenAIAdapter(mockConfig);
      mockedAxios.get.mockResolvedValue({ status: 200 });

      const isHealthy = await adapter.isHealthy();

      expect(isHealthy).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith('/models');
    });

    it('should return false for health check when API fails', async () => {
      const adapter = createOpenAIAdapter(mockConfig);
      mockedAxios.get.mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await adapter.isHealthy();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Anthropic Adapter', () => {
    beforeEach(() => {
      mockConfig.provider = ModelProvider.ANTHROPIC;
      mockConfig.model = 'claude-3-sonnet-20240229';
    });

    it('should create Anthropic adapter with correct configuration', () => {
      const adapter = createAnthropicAdapter(mockConfig);

      expect(adapter.getName()).toBe('Anthropic');
      expect(adapter.getVersion()).toBe('claude-3-sonnet-20240229');
    });

    it('should generate text with Anthropic format', async () => {
      const adapter = createAnthropicAdapter(mockConfig);
      const mockResponse = {
        data: {
          content: [{ text: 'Anthropic response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 20 },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.generateText('Test prompt');

      expect(result).toEqual({
        text: 'Anthropic response',
        usage: { input_tokens: 10, output_tokens: 20 },
        finishReason: 'end_turn',
      });
      expect(mockedAxios.post).toHaveBeenCalledWith('/messages', {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 1000,
        temperature: 0.7,
      });
    });

    it('should handle Anthropic API errors', async () => {
      const adapter = createAnthropicAdapter(mockConfig);
      const error = new Error('Anthropic API error');
      (error as any).response = { status: 400, data: { error: { message: 'Invalid request' } } };

      mockedAxios.post.mockRejectedValue(error);

      await expect(adapter.generateText('Test prompt')).rejects.toThrow('Invalid request');
    });
  });

  describe('Google Adapter', () => {
    beforeEach(() => {
      mockConfig.provider = ModelProvider.GOOGLE;
      mockConfig.model = 'gemini-pro';
    });

    it('should create Google adapter with correct configuration', () => {
      const adapter = createGoogleAdapter(mockConfig);

      expect(adapter.getName()).toBe('Google');
      expect(adapter.getVersion()).toBe('gemini-pro');
    });

    it('should generate text with Google format', async () => {
      const adapter = createGoogleAdapter(mockConfig);
      const mockResponse = {
        data: {
          candidates: [
            {
              content: { parts: [{ text: 'Google response' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.generateText('Test prompt');

      expect(result).toEqual({
        text: 'Google response',
        usage: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
        finishReason: 'STOP',
      });
    });
  });

  describe('Cohere Adapter', () => {
    beforeEach(() => {
      mockConfig.provider = ModelProvider.COHERE;
      mockConfig.model = 'command';
    });

    it('should create Cohere adapter with correct configuration', () => {
      const adapter = createCohereAdapter(mockConfig);

      expect(adapter.getName()).toBe('Cohere');
      expect(adapter.getVersion()).toBe('command');
    });

    it('should generate text with Cohere format', async () => {
      const adapter = createCohereAdapter(mockConfig);
      const mockResponse = {
        data: {
          generations: [{ text: 'Cohere response' }],
          prompt: 'Test prompt',
          likelihood: 0.8,
          token_likelihoods: [],
          finish_reason: 'COMPLETE',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.generateText('Test prompt');

      expect(result).toEqual({
        text: 'Cohere response',
        usage: { likelihood: 0.8 },
        finishReason: 'COMPLETE',
      });
    });

    it('should generate embeddings with Cohere', async () => {
      const adapter = createCohereAdapter(mockConfig);
      const mockResponse = {
        data: {
          embeddings: [[0.1, 0.2, 0.3]],
          meta: { api_version: { version: '1' } },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.generateEmbedding('Test text');

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3],
        usage: { api_version: '1' },
      });
    });
  });

  describe('Mistral Adapter', () => {
    beforeEach(() => {
      mockConfig.provider = ModelProvider.MISTRAL;
      mockConfig.model = 'mistral-medium';
    });

    it('should create Mistral adapter with correct configuration', () => {
      const adapter = createMistralAdapter(mockConfig);

      expect(adapter.getName()).toBe('Mistral');
      expect(adapter.getVersion()).toBe('mistral-medium');
    });

    it('should generate text with Mistral format', async () => {
      const adapter = createMistralAdapter(mockConfig);
      const mockResponse = {
        data: {
          choices: [
            {
              message: { content: 'Mistral response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.generateText('Test prompt');

      expect(result).toEqual({
        text: 'Mistral response',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        finishReason: 'stop',
      });
    });
  });

  describe('Common Adapter Functionality', () => {
    it('should return adapter statistics', async () => {
      const adapter = createOpenAIAdapter(mockConfig);

      const stats = await adapter.getStats();

      expect(stats).toEqual({
        name: 'OpenAI',
        version: 'gpt-4',
        provider: 'openai',
        capabilities: ['text-generation', 'embedding'],
        isHealthy: false, // Not mocked, so will be false
      });
    });

    it('should cleanup resources', async () => {
      const adapter = createOpenAIAdapter(mockConfig);

      await expect(adapter.cleanup()).resolves.toBeUndefined();
    });

    it('should handle reranking requests', async () => {
      const adapter = createOpenAIAdapter(mockConfig);
      const mockResponse = {
        data: {
          data: [
            { relevance_score: 0.9, index: 0 },
            { relevance_score: 0.7, index: 1 },
          ],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.rerank('query', ['doc1', 'doc2']);

      expect(result).toEqual([
        { score: 0.9, index: 0 },
        { score: 0.7, index: 1 },
      ]);
    });

    it('should handle network timeouts', async () => {
      const adapter = createOpenAIAdapter(mockConfig);
      const timeoutError = new Error('Timeout');
      (timeoutError as any).code = 'ECONNABORTED';

      mockedAxios.post.mockRejectedValue(timeoutError);

      await expect(adapter.generateText('Test prompt')).rejects.toThrow('Request timeout');
    });

    it('should handle authentication errors', async () => {
      const adapter = createOpenAIAdapter(mockConfig);
      const authError = new Error('Unauthorized');
      (authError as any).response = {
        status: 401,
        data: { error: { message: 'Invalid API key' } },
      };

      mockedAxios.post.mockRejectedValue(authError);

      await expect(adapter.generateText('Test prompt')).rejects.toThrow('Invalid API key');
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle rate limiting with exponential backoff', async () => {
      const adapter = createOpenAIAdapter(mockConfig);

      // First call - rate limited
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = {
        status: 429,
        data: { error: { message: 'Rate limit exceeded' } },
      };

      // Second call - success
      const successResponse = {
        data: {
          choices: [{ message: { content: 'Success response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        },
      };

      mockedAxios.post.mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce(successResponse);

      const result = await adapter.generateText('Test prompt');

      expect(result.text).toBe('Success response');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle server errors gracefully', async () => {
      const adapter = createOpenAIAdapter(mockConfig);
      const serverError = new Error('Internal server error');
      (serverError as any).response = {
        status: 500,
        data: { error: { message: 'Internal server error' } },
      };

      mockedAxios.post.mockRejectedValue(serverError);

      await expect(adapter.generateText('Test prompt')).rejects.toThrow('Internal server error');
    });

    it('should handle network errors', async () => {
      const adapter = createOpenAIAdapter(mockConfig);
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNREFUSED';

      mockedAxios.post.mockRejectedValue(networkError);

      await expect(adapter.generateText('Test prompt')).rejects.toThrow(
        'Network connection failed',
      );
    });

    it('should validate configuration on creation', () => {
      expect(() => createOpenAIAdapter({ ...mockConfig, apiKey: '' })).toThrow(
        'API key is required',
      );
      expect(() => createOpenAIAdapter({ ...mockConfig, model: '' })).toThrow('Model is required');
    });
  });
});
