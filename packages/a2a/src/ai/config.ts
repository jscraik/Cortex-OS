/**
 * @file AI Model Configuration
 * @description Simplified configuration for AI models used in A2A processing
 */

import { z } from 'zod';

/**
 * AI processing capabilities
 */
export const AICapability = {
  SEMANTIC_ROUTING: 'semantic_routing',
  MESSAGE_VALIDATION: 'message_validation',
  LOAD_BALANCING: 'load_balancing',
  PRIORITY_RANKING: 'priority_ranking',
} as const;

export type AICapability = (typeof AICapability)[keyof typeof AICapability];

/**
 * Model provider types
 */
export const ModelProvider = {
  MLX: 'mlx',
  OLLAMA: 'ollama',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  COHERE: 'cohere',
  MISTRAL: 'mistral',
} as const;

export type ModelProvider = (typeof ModelProvider)[keyof typeof ModelProvider];

/**
 * Simplified model configuration
 */
export const ModelConfigSchema = z.object({
  provider: z.nativeEnum(ModelProvider),
  model: z.string(),
  endpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  maxTokens: z.number().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  timeout: z.number().default(30000),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * A2A AI configuration - simplified
 */
export const A2AAIConfigSchema = z.object({
  enabled: z.boolean().default(false), // Disabled by default for safety
  models: z.record(z.nativeEnum(AICapability), ModelConfigSchema).default({}),
});

export type A2AAIConfig = z.infer<typeof A2AAIConfigSchema>;

/**
 * Default empty config - user must explicitly configure
 */
export const DEFAULT_A2A_AI_CONFIG: A2AAIConfig = {
  enabled: false,
  models: {},
};
