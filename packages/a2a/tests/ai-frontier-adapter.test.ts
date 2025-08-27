/**
 * @file Frontier Adapter Factory Tests
 * @description Tests for the frontier adapter factory functionality
 */

import { describe, expect, it, vi } from 'vitest';
import { ModelProvider } from '../src/ai/config.js';
import {
  createFrontierAdapter,
  getAvailableFrontierProviders,
  isFrontierProvider,
} from '../src/ai/frontier-adapter.js';

// Mock the individual adapters
vi.mock('../src/ai/openai-adapter.js', () => ({
  createOpenAIAdapter: vi.fn(() => ({ name: 'OpenAIAdapter' })),
}));

vi.mock('../src/ai/anthropic-adapter.js', () => ({
  createAnthropicAdapter: vi.fn(() => ({ name: 'AnthropicAdapter' })),
}));

vi.mock('../src/ai/google-adapter.js', () => ({
  createGoogleAdapter: vi.fn(() => ({ name: 'GoogleAdapter' })),
}));

vi.mock('../src/ai/cohere-adapter.js', () => ({
  createCohereAdapter: vi.fn(() => ({ name: 'CohereAdapter' })),
}));

vi.mock('../src/ai/mistral-adapter.js', () => ({
  createMistralAdapter: vi.fn(() => ({ name: 'MistralAdapter' })),
}));

describe('Frontier Adapter Factory', () => {
  describe('createFrontierAdapter()', () => {
    it('should create OpenAI adapter for OpenAI provider', async () => {
      const config = {
        provider: ModelProvider.OPENAI,
        model: 'gpt-4',
        apiKey: 'sk-test123',
      };

      const adapter = await createFrontierAdapter(config);

      expect(adapter).toEqual({ name: 'OpenAIAdapter' });
      // Verify the correct adapter was called
      const { createOpenAIAdapter } = await import('../src/ai/openai-adapter.js');
      expect(createOpenAIAdapter).toHaveBeenCalledWith(config);
    });

    it('should create Anthropic adapter for Anthropic provider', async () => {
      const config = {
        provider: ModelProvider.ANTHROPIC,
        model: 'claude-3-sonnet-20240229',
        apiKey: 'sk-ant-test123',
      };

      const adapter = await createFrontierAdapter(config);

      expect(adapter).toEqual({ name: 'AnthropicAdapter' });
      const { createAnthropicAdapter } = await import('../src/ai/anthropic-adapter.js');
      expect(createAnthropicAdapter).toHaveBeenCalledWith(config);
    });

    it('should create Google adapter for Google provider', async () => {
      const config = {
        provider: ModelProvider.GOOGLE,
        model: 'gemini-pro',
        apiKey: 'AIzaSyTest123',
      };

      const adapter = await createFrontierAdapter(config);

      expect(adapter).toEqual({ name: 'GoogleAdapter' });
      const { createGoogleAdapter } = await import('../src/ai/google-adapter.js');
      expect(createGoogleAdapter).toHaveBeenCalledWith(config);
    });

    it('should create Cohere adapter for Cohere provider', async () => {
      const config = {
        provider: ModelProvider.COHERE,
        model: 'command',
        apiKey: 'cohere-test123',
      };

      const adapter = await createFrontierAdapter(config);

      expect(adapter).toEqual({ name: 'CohereAdapter' });
      const { createCohereAdapter } = await import('../src/ai/cohere-adapter.js');
      expect(createCohereAdapter).toHaveBeenCalledWith(config);
    });

    it('should create Mistral adapter for Mistral provider', async () => {
      const config = {
        provider: ModelProvider.MISTRAL,
        model: 'mistral-medium',
        apiKey: 'mistral-test123',
      };

      const adapter = await createFrontierAdapter(config);

      expect(adapter).toEqual({ name: 'MistralAdapter' });
      const { createMistralAdapter } = await import('../src/ai/mistral-adapter.js');
      expect(createMistralAdapter).toHaveBeenCalledWith(config);
    });

    it('should throw error for unsupported provider', async () => {
      const config = {
        provider: 'unsupported_provider' as any,
        model: 'test-model',
      };

      await expect(createFrontierAdapter(config)).rejects.toThrow(
        'Unsupported frontier provider: unsupported_provider',
      );
    });
  });

  describe('getAvailableFrontierProviders()', () => {
    it('should return all available frontier providers', () => {
      const providers = getAvailableFrontierProviders();

      expect(providers).toEqual([
        ModelProvider.OPENAI,
        ModelProvider.ANTHROPIC,
        ModelProvider.GOOGLE,
        ModelProvider.COHERE,
        ModelProvider.MISTRAL,
      ]);
    });

    it('should return a new array each time', () => {
      const providers1 = getAvailableFrontierProviders();
      const providers2 = getAvailableFrontierProviders();

      expect(providers1).not.toBe(providers2);
      expect(providers1).toEqual(providers2);
    });
  });

  describe('isFrontierProvider()', () => {
    it('should return true for frontier providers', () => {
      expect(isFrontierProvider(ModelProvider.OPENAI)).toBe(true);
      expect(isFrontierProvider(ModelProvider.ANTHROPIC)).toBe(true);
      expect(isFrontierProvider(ModelProvider.GOOGLE)).toBe(true);
      expect(isFrontierProvider(ModelProvider.COHERE)).toBe(true);
      expect(isFrontierProvider(ModelProvider.MISTRAL)).toBe(true);
    });

    it('should return false for non-frontier providers', () => {
      expect(isFrontierProvider(ModelProvider.MLX)).toBe(false);
      expect(isFrontierProvider(ModelProvider.OLLAMA)).toBe(false);
    });

    it('should return false for undefined provider', () => {
      expect(isFrontierProvider(undefined as any)).toBe(false);
    });

    it('should return false for null provider', () => {
      expect(isFrontierProvider(null as any)).toBe(false);
    });
  });

  describe('Factory integration', () => {
    it('should handle adapter creation errors gracefully', async () => {
      // Mock createOpenAIAdapter to throw an error
      const { createOpenAIAdapter } = await import('../src/ai/openai-adapter.js');
      vi.mocked(createOpenAIAdapter).mockRejectedValue(new Error('API key invalid'));

      const config = {
        provider: ModelProvider.OPENAI,
        model: 'gpt-4',
        apiKey: 'invalid-key',
      };

      await expect(createFrontierAdapter(config)).rejects.toThrow('API key invalid');
    });

    it('should pass through configuration correctly', async () => {
      const config = {
        provider: ModelProvider.OPENAI,
        model: 'gpt-4-turbo',
        apiKey: 'sk-test123',
        endpoint: 'https://custom.openai.com',
        timeout: 60000,
        temperature: 0.5,
        maxTokens: 4096,
      };

      await createFrontierAdapter(config);

      const { createOpenAIAdapter } = await import('../src/ai/openai-adapter.js');
      expect(createOpenAIAdapter).toHaveBeenCalledWith(config);
    });
  });

  describe('Provider coverage', () => {
    it('should support all major AI providers', () => {
      const providers = getAvailableFrontierProviders();

      // Ensure we have good coverage of major providers
      expect(providers).toContain(ModelProvider.OPENAI);
      expect(providers).toContain(ModelProvider.ANTHROPIC);
      expect(providers).toContain(ModelProvider.GOOGLE);
      expect(providers).toContain(ModelProvider.COHERE);
      expect(providers).toContain(ModelProvider.MISTRAL);

      // Should have at least 5 providers
      expect(providers.length).toBeGreaterThanOrEqual(5);
    });

    it('should have consistent provider definitions', () => {
      const providers = getAvailableFrontierProviders();

      // All providers should be strings
      providers.forEach((provider) => {
        expect(typeof provider).toBe('string');
        expect(provider.length).toBeGreaterThan(0);
      });

      // Should not have duplicates
      const uniqueProviders = new Set(providers);
      expect(uniqueProviders.size).toBe(providers.length);
    });
  });
});
