/**
 * @file Frontier Model Adapter Factory
 * @description Factory for creating frontier AI model adapters
 */

import { AIModelAdapter } from './adapter.js';
import { createAnthropicAdapter } from './anthropic-adapter.js';
import { createCohereAdapter } from './cohere-adapter.js';
import { ModelConfig, ModelProvider } from './config.js';
import { createGoogleAdapter } from './google-adapter.js';
import { createMistralAdapter } from './mistral-adapter.js';
import { createOpenAIAdapter } from './openai-adapter.js';

/**
 * Create frontier adapter based on provider
 * This factory replaces the monolithic frontier adapter with
 * separate, focused adapter implementations
 */
export const createFrontierAdapter = async (config: ModelConfig): Promise<AIModelAdapter> => {
  switch (config.provider) {
    case ModelProvider.OPENAI:
      return createOpenAIAdapter(config);

    case ModelProvider.ANTHROPIC:
      return createAnthropicAdapter(config);

    case ModelProvider.GOOGLE:
      return createGoogleAdapter(config);

    case ModelProvider.COHERE:
      return createCohereAdapter(config);

    case ModelProvider.MISTRAL:
      return createMistralAdapter(config);

    default:
      throw new Error(`Unsupported frontier provider: ${config.provider}`);
  }
};

/**
 * Get available frontier providers
 */
export const getAvailableFrontierProviders = (): ModelProvider[] => [
  ModelProvider.OPENAI,
  ModelProvider.ANTHROPIC,
  ModelProvider.GOOGLE,
  ModelProvider.COHERE,
  ModelProvider.MISTRAL,
];

/**
 * Check if provider is a frontier provider
 */
export const isFrontierProvider = (provider: ModelProvider): boolean => {
  return getAvailableFrontierProviders().includes(provider);
};
