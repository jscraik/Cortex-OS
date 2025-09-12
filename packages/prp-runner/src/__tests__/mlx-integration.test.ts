/**
 * @file mlx-integration.test.ts
 * @description Test real MLX integration with mlx-knife
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  checkProviderHealth,
  configureLLM,
  generate,
  getMLXAdapter as getMLXAdapterFromState,
  getModel,
  getProvider,
  listMLXModels,
  type LLMConfig,
  type LLMState,
} from '../llm-bridge.js';
import {
  AVAILABLE_MLX_MODELS,
  createMLXAdapter,
  MLXAdapter,
} from '../mlx-adapter.js';

describe('🔬 MLX Integration Tests', () => {
  let mlxAdapter: MLXAdapter;
  let llmState: LLMState;
  let runtimeAvailable = true;

  beforeAll(async () => {
    // Use the smallest, fastest model for testing
    mlxAdapter = createMLXAdapter(AVAILABLE_MLX_MODELS.QWEN_SMALL);

    // Quick capability probe – if listModels returns empty we assume runtime unavailable and mark tests to skip
    try {
      const models = await mlxAdapter.listModels();
      if (models.length === 0) runtimeAvailable = false;
    } catch {
      runtimeAvailable = false;
    }

    llmState = configureLLM({
      provider: 'mlx',
      endpoint: 'http://localhost:8000', // Use standard MLX endpoint
      mlxModel: 'QWEN_SMALL', // Use key for config
    });
  });

  describe('MLXAdapter Direct Tests', () => {
    if (!runtimeAvailable) {
      it.skip('skipped – MLX runtime unavailable', () => {
        expect(true).toBe(true);
      });
      return; // skip nested tests
    }
    it('should list available MLX models', async () => {
      const models = await mlxAdapter.listModels();

      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      // Should include our test model
      const hasQwen = models.some(
        (model) => model.name.includes('Qwen2.5-0.5B-Instruct-4bit'), // valid, no change
      );
      expect(hasQwen).toBe(true);
    }, 10000);

    it('should check model availability', async () => {
      const available = await mlxAdapter.isModelAvailable(
        AVAILABLE_MLX_MODELS.QWEN_SMALL,
      );
      expect(available).toBe(true);

      const notAvailable =
        await mlxAdapter.isModelAvailable('nonexistent-model');
      expect(notAvailable).toBe(false);
    }, 15000);

    it('should get model information', async () => {
      const info = await mlxAdapter.getModelInfo();

      expect(info).toBeDefined();
      expect(info?.name).toContain('Qwen2.5-0.5B-Instruct-4bit'); // valid, no change
      expect(info?.health).toBe('[OK]');
      expect(info?.size).toBeDefined();
    }, 5000);

    it('should check model health', async () => {
      const health = await mlxAdapter.checkHealth();

      expect(health).toBeDefined();
      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Model is healthy');
    }, 5000);

    it('should generate text with MLX model', async () => {
      const result = await mlxAdapter.generate({
        prompt: 'What is 2+2?',
        maxTokens: 50,
        temperature: 0.1, // Low temperature for consistent results
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Should contain the answer in some form (digit or word)
      expect(result.toLowerCase()).toMatch(/(?:4|four)/);
    }, 15000);
  });

  describe('LLMBridge MLX Integration Tests', () => {
    if (!runtimeAvailable) {
      it.skip('skipped – MLX runtime unavailable', () => {
        expect(true).toBe(true);
      });
      return;
    }
    it('should create MLX state with correct configuration', () => {
      expect(getProvider(llmState)).toBe('mlx');
      // getModel should return the value, so compare to AVAILABLE_MLX_MODELS.QWEN_SMALL
      expect(getModel(llmState)).toBe(AVAILABLE_MLX_MODELS.QWEN_SMALL);
    });

    it('should access MLX adapter from state', () => {
      const adapter = getMLXAdapterFromState(llmState);
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(MLXAdapter);
    });

    it('should list MLX models through helpers', async () => {
      const models = await listMLXModels(llmState);

      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    }, 10000);

    it('should check provider health through helpers', async () => {
      const health = await checkProviderHealth(llmState);

      expect(health).toBeDefined();
      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Model is healthy');
    }, 5000);

    it('should generate text through helpers', async () => {
      const result = await generate(llmState, 'Count from 1 to 5', {
        maxTokens: 30,
        temperature: 0.1,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // Should contain counting elements
      const hasNumbers = /[1-5]/.test(result);
      expect(hasNumbers).toBe(true);
    }, 15000);

    it('should handle generation errors gracefully', async () => {
      const badState = configureLLM({
        provider: 'mlx',
        endpoint: 'http://localhost:8000',
        mlxModel: 'QWEN_SMALL', // use valid model for type safety
      });

      // Use a prompt that triggers the mock error (contains "ERROR")
      await expect(generate(badState, 'ERROR: test prompt')).rejects.toThrow();
    }, 5000);
  });

  describe('Error Handling and Edge Cases', () => {
    if (!runtimeAvailable) {
      it.skip('skipped – MLX runtime unavailable', () => {
        expect(true).toBe(true);
      });
      return;
    }
    it('should handle empty prompts', async () => {
      // MLX actually generates text even with empty prompts, so test that it returns something
      const result = await mlxAdapter.generate({
        prompt: '',
        maxTokens: 10,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      // With empty prompt, MLX might generate something like a conversation starter
    }, 10000);

    it('should handle very long prompts', async () => {
      const longPrompt = `Repeat this sentence: ${'word '.repeat(1000)}`;

      const result = await mlxAdapter.generate({
        prompt: longPrompt,
        maxTokens: 50,
        temperature: 0.1,
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    }, 20000);

    it('should validate configuration properly', () => {
      expect(() => {
        configureLLM({
          provider: 'mlx',
          endpoint: '',
          // Missing mlxModel
        } as LLMConfig);
      }).toThrow('MLX model is required for MLX provider');
    });
  });

  describe('Performance and Constraints', () => {
    it('should complete generation within reasonable time', async () => {
      const startTime = Date.now();

      await mlxAdapter.generate({
        prompt: 'Hello world',
        maxTokens: 10,
        temperature: 0.1,
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
    }, 25000);

    it('should respect token limits', async () => {
      const result = await mlxAdapter.generate({
        prompt: 'Write a very long story about',
        maxTokens: 5,
        temperature: 0.1,
      });

      expect(result).toBeDefined();
      // With only 5 tokens, result should be quite short
      expect(result.split(' ').length).toBeLessThan(20);
    }, 10000);
  });
});

describe('🚀 MLX Model Variants', () => {
  // Test different models if available
  const testModels = [
    AVAILABLE_MLX_MODELS.QWEN_SMALL,
    AVAILABLE_MLX_MODELS.PHI_MINI,
  ];

  testModels.forEach((modelName) => {
    describe(`Model: ${modelName}`, () => {
      it(`should successfully generate with ${modelName}`, async () => {
        const adapter = createMLXAdapter(modelName);

        // Check if model is available before testing
        const available = await adapter.isModelAvailable(modelName);

        if (available) {
          const result = await adapter.generate({
            prompt: 'Hello',
            maxTokens: 10,
            temperature: 0.1,
          });

          expect(result).toBeDefined();
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        } else {
          console.warn(`Model ${modelName} not available, skipping test`);
        }
      }, 15000);
    });
  });
});
