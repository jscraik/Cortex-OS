/**
 * @file AI Manager
 * @description Functional AI model management with simple fallback strategy
 */

import { AIModelAdapter } from './adapter.js';
import { A2AAIConfig, AICapability, ModelConfig, ModelProvider } from './config.js';
import { createFrontierAdapter } from './frontier-adapter.js';
import { createMLXAdapter } from './mlx-adapter.js';
import { createOllamaAdapter } from './ollama-adapter.js';

/**
 * AI Manager state
 */
export interface AIManagerState {
  adapters: Map<string, AIModelAdapter>;
  config: A2AAIConfig;
  initialized: boolean;
}

/**
 * Create AI manager state
 */
export const createAIManager = (config: A2AAIConfig): AIManagerState => ({
  adapters: new Map(),
  config,
  initialized: false,
});

/**
 * Initialize AI manager with configured models
 */
export const initializeAIManager = async (state: AIManagerState): Promise<void> => {
  if (state.initialized || !state.config.enabled) {
    return;
  }

  // Initialize adapters for each configured capability
  for (const [capability, modelConfig] of Object.entries(state.config.models)) {
    try {
      const adapter = await createAdapter(modelConfig);
      state.adapters.set(capability, adapter);
    } catch (error) {
      console.warn(`Failed to initialize ${capability} adapter: ${error}`);
    }
  }

  state.initialized = true;
};

/**
 * Get adapter for specific capability
 */
export const getAdapter = (
  state: AIManagerState,
  capability: AICapability,
): AIModelAdapter | null => {
  return state.adapters.get(capability) || null;
};

/**
 * Get all available adapters
 */
export const getAvailableAdapters = (state: AIManagerState): AIModelAdapter[] => {
  return Array.from(state.adapters.values());
};

/**
 * Check if AI is available for capability
 */
export const isCapabilityAvailable = async (
  state: AIManagerState,
  capability: AICapability,
): Promise<boolean> => {
  const adapter = getAdapter(state, capability);
  if (!adapter) return false;

  try {
    return await adapter.isHealthy();
  } catch {
    return false;
  }
};

/**
 * Create adapter based on model configuration
 */
const createAdapter = async (config: ModelConfig): Promise<AIModelAdapter> => {
  switch (config.provider) {
    case ModelProvider.MLX:
      return createMLXAdapter(config);
    case ModelProvider.OLLAMA:
      return createOllamaAdapter(config);
    case ModelProvider.OPENAI:
    case ModelProvider.ANTHROPIC:
    case ModelProvider.GOOGLE:
    case ModelProvider.COHERE:
    case ModelProvider.MISTRAL:
      return createFrontierAdapter(config);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
};
