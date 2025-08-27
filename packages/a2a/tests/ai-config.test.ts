/**
 * @file AI Configuration Tests
 * @description Comprehensive TDD tests for AI configuration module
 */

import { describe, expect, it } from 'vitest';
import {
  A2AAIConfig,
  A2AAIConfigSchema,
  AICapability,
  ModelConfig,
  ModelConfigSchema,
  ModelProvider,
} from '../src/ai/config.js';

describe('AI Configuration', () => {
  describe('AICapability enum', () => {
    it('should have all required capabilities', () => {
      expect(AICapability.SEMANTIC_ROUTING).toBe('semantic_routing');
      expect(AICapability.MESSAGE_VALIDATION).toBe('message_validation');
      expect(AICapability.LOAD_BALANCING).toBe('load_balancing');
      expect(AICapability.PRIORITY_RANKING).toBe('priority_ranking');
    });

    it('should be immutable', () => {
      const original = AICapability.SEMANTIC_ROUTING;
      // This should not change the original value
      (AICapability as any).SEMANTIC_ROUTING = 'modified';
      expect(AICapability.SEMANTIC_ROUTING).toBe(original);
    });
  });

  describe('ModelProvider enum', () => {
    it('should have all required providers', () => {
      expect(ModelProvider.MLX).toBe('mlx');
      expect(ModelProvider.OLLAMA).toBe('ollama');
      expect(ModelProvider.OPENAI).toBe('openai');
      expect(ModelProvider.ANTHROPIC).toBe('anthropic');
      expect(ModelProvider.GOOGLE).toBe('google');
      expect(ModelProvider.COHERE).toBe('cohere');
      expect(ModelProvider.MISTRAL).toBe('mistral');
    });

    it('should be immutable', () => {
      const original = ModelProvider.OPENAI;
      (ModelProvider as any).OPENAI = 'modified';
      expect(ModelProvider.OPENAI).toBe(original);
    });
  });

  describe('ModelConfig schema', () => {
    it('should validate valid MLX configuration', () => {
      const validConfig = {
        provider: ModelProvider.MLX,
        model: 'mlx-community/Qwen2.5-7B-Instruct-4bit',
        endpoint: 'http://localhost:8080',
        timeout: 30000,
        temperature: 0.7,
        maxTokens: 2048,
      };

      const result = ModelConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe(ModelProvider.MLX);
        expect(result.data.model).toBe('mlx-community/Qwen2.5-7B-Instruct-4bit');
      }
    });

    it('should validate valid OpenAI configuration', () => {
      const validConfig = {
        provider: ModelProvider.OPENAI,
        model: 'gpt-4',
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com',
        timeout: 30000,
        temperature: 0.7,
        maxTokens: 2048,
      };

      const result = ModelConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe(ModelProvider.OPENAI);
        expect(result.data.apiKey).toBe('sk-test123');
      }
    });

    it('should validate valid Anthropic configuration', () => {
      const validConfig = {
        provider: ModelProvider.ANTHROPIC,
        model: 'claude-3-sonnet-20240229',
        apiKey: 'sk-ant-test123',
        endpoint: 'https://api.anthropic.com',
        timeout: 30000,
        temperature: 0.7,
        maxTokens: 2048,
      };

      const result = ModelConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe(ModelProvider.ANTHROPIC);
        expect(result.data.apiKey).toBe('sk-ant-test123');
      }
    });

    it('should validate valid Google configuration', () => {
      const validConfig = {
        provider: ModelProvider.GOOGLE,
        model: 'gemini-pro',
        apiKey: 'AIzaSyTest123',
        endpoint: 'https://generativelanguage.googleapis.com',
        timeout: 30000,
        temperature: 0.7,
        maxTokens: 2048,
      };

      const result = ModelConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe(ModelProvider.GOOGLE);
        expect(result.data.apiKey).toBe('AIzaSyTest123');
      }
    });

    it('should validate valid Cohere configuration', () => {
      const validConfig = {
        provider: ModelProvider.COHERE,
        model: 'command',
        apiKey: 'cohere-test123',
        endpoint: 'https://api.cohere.ai',
        timeout: 30000,
        temperature: 0.7,
        maxTokens: 2048,
      };

      const result = ModelConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe(ModelProvider.COHERE);
        expect(result.data.apiKey).toBe('cohere-test123');
      }
    });

    it('should validate valid Mistral configuration', () => {
      const validConfig = {
        provider: ModelProvider.MISTRAL,
        model: 'mistral-medium',
        apiKey: 'mistral-test123',
        endpoint: 'https://api.mistral.ai',
        timeout: 30000,
        temperature: 0.7,
        maxTokens: 2048,
      };

      const result = ModelConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe(ModelProvider.MISTRAL);
        expect(result.data.apiKey).toBe('mistral-test123');
      }
    });

    it('should reject invalid provider', () => {
      const invalidConfig = {
        provider: 'invalid_provider',
        model: 'test-model',
        apiKey: 'test-key',
      };

      const result = ModelConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid enum value');
      }
    });

    it('should reject missing required fields', () => {
      const invalidConfig = {
        provider: ModelProvider.OPENAI,
        // missing model and apiKey
      };

      const result = ModelConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should provide default values', () => {
      const minimalConfig = {
        provider: ModelProvider.MLX,
        model: 'test-model',
      };

      const result = ModelConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timeout).toBe(30000);
        expect(result.data.temperature).toBe(0.7);
        expect(result.data.maxTokens).toBe(2048);
      }
    });

    it('should validate temperature range', () => {
      const invalidConfig = {
        provider: ModelProvider.OPENAI,
        model: 'gpt-4',
        apiKey: 'test',
        temperature: 3.0, // Invalid: should be 0-2
      };

      const result = ModelConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should validate maxTokens range', () => {
      const invalidConfig = {
        provider: ModelProvider.OPENAI,
        model: 'gpt-4',
        apiKey: 'test',
        maxTokens: -1, // Invalid: should be positive
      };

      const result = ModelConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('A2AAIConfig schema', () => {
    it('should validate complete A2A AI configuration', () => {
      const validConfig = {
        enabled: true,
        models: {
          [AICapability.SEMANTIC_ROUTING]: {
            provider: ModelProvider.OPENAI,
            model: 'gpt-4',
            apiKey: 'sk-test123',
          },
          [AICapability.MESSAGE_VALIDATION]: {
            provider: ModelProvider.ANTHROPIC,
            model: 'claude-3-sonnet-20240229',
            apiKey: 'sk-ant-test123',
          },
          [AICapability.LOAD_BALANCING]: {
            provider: ModelProvider.MLX,
            model: 'mlx-community/Qwen2.5-7B-Instruct-4bit',
            endpoint: 'http://localhost:8080',
          },
          [AICapability.PRIORITY_RANKING]: {
            provider: ModelProvider.COHERE,
            model: 'command',
            apiKey: 'cohere-test123',
          },
        },
      };

      const result = A2AAIConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(Object.keys(result.data.models)).toHaveLength(4);
      }
    });

    it('should provide default values', () => {
      const minimalConfig = {
        models: {},
      };

      const result = A2AAIConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.models).toEqual({});
      }
    });

    it('should reject invalid capability keys', () => {
      const invalidConfig = {
        models: {
          invalid_capability: {
            provider: ModelProvider.OPENAI,
            model: 'gpt-4',
            apiKey: 'test',
          },
        },
      };

      const result = A2AAIConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should validate nested model configurations', () => {
      const invalidConfig = {
        models: {
          [AICapability.SEMANTIC_ROUTING]: {
            provider: 'invalid_provider',
            model: 'gpt-4',
          },
        },
      };

      const result = A2AAIConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('Configuration type safety', () => {
    it('should ensure ModelConfig type matches schema', () => {
      const config: ModelConfig = {
        provider: ModelProvider.OPENAI,
        model: 'gpt-4',
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com',
        timeout: 30000,
        temperature: 0.7,
        maxTokens: 2048,
      };

      // This should compile without errors
      const result = ModelConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should ensure A2AAIConfig type matches schema', () => {
      const config: A2AAIConfig = {
        enabled: true,
        models: {
          [AICapability.SEMANTIC_ROUTING]: {
            provider: ModelProvider.OPENAI,
            model: 'gpt-4',
            apiKey: 'sk-test123',
          },
        },
      };

      // This should compile without errors
      const result = A2AAIConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});
