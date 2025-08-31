/**
 * MLX Integration utilities for A2A package
 * Provides MLX model inference capabilities with proper error handling
 */

import { z } from 'zod';
import { logWithContext, withErrorBoundary, guardValid } from './error-utils';

/**
 * MLX Model Configuration Schema
 */
export const MLX_MODEL_CONFIG_SCHEMA = z.object({
  name: z.string(),
  path: z.string(),
  quantization: z.string().optional(),
  contextLength: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
  dimensions: z.number().int().positive().optional(),
  supportsVision: z.boolean().optional(),
  recommendedFor: z.array(z.string()).optional(),
});

/**
 * MLX Inference Request Schema
 */
export const MLX_INFERENCE_REQUEST_SCHEMA = z.object({
  model: z.string(),
  prompt: z.string(),
  maxTokens: z.number().int().positive().default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
  stream: z.boolean().default(false),
  systemPrompt: z.string().optional(),
  context: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      }),
    )
    .optional(),
});

/**
 * MLX Embedding Request Schema
 */
export const MLX_EMBEDDING_REQUEST_SCHEMA = z.object({
  model: z.string(),
  texts: z.array(z.string()),
  normalize: z.boolean().default(true),
});

/**
 * MLX Response Schemas
 */
export const MLX_INFERENCE_RESPONSE_SCHEMA = z.object({
  content: z.string(),
  model: z.string(),
  usage: z
    .object({
      promptTokens: z.number().int().min(0),
      completionTokens: z.number().int().min(0),
      totalTokens: z.number().int().min(0),
    })
    .optional(),
  finishReason: z.enum(['stop', 'length', 'error']).optional(),
});

export const MLX_EMBEDDING_RESPONSE_SCHEMA = z.object({
  embeddings: z.array(z.array(z.number())),
  model: z.string(),
  dimensions: z.number().int().positive(),
});

/**
 * MLX Configuration
 */
export interface MlxConfig {
  readonly serverUrl: string;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly models: Record<string, z.infer<typeof MLX_MODEL_CONFIG_SCHEMA>>;
}

/**
 * Default MLX configuration
 */
export const DEFAULT_MLX_CONFIG: MlxConfig = {
  serverUrl: 'http://localhost:8000',
  timeout: 30000,
  retryAttempts: 3,
  models: {},
};

/**
 * Create MLX client with functional approach
 */
export const createMlxClient = (config: Partial<MlxConfig> = {}) => {
  const finalConfig: MlxConfig = { ...DEFAULT_MLX_CONFIG, ...config };

  /**
   * Health check for MLX server
   */
  const healthCheck = async (): Promise<boolean> => {
    return withErrorBoundary(
      async () => {
        const response = await fetch(`${finalConfig.serverUrl}/health`, {
          timeout: finalConfig.timeout,
        });
        return response.ok;
      },
      false,
      (error) => {
        logWithContext('error', 'MLX health check failed', { error: error.message });
      },
    );
  };

  /**
   * Generate text using MLX model
   */
  const generate = async (
    request: z.infer<typeof MLX_INFERENCE_REQUEST_SCHEMA>,
  ): Promise<z.infer<typeof MLX_INFERENCE_RESPONSE_SCHEMA>> => {
    const validatedRequest = guardValid(MLX_INFERENCE_REQUEST_SCHEMA, request);

    if (!validatedRequest.success) {
      throw new Error(`Invalid MLX request: ${validatedRequest.error.message}`);
    }

    return withErrorBoundary(
      async () => {
        const response = await fetch(`${finalConfig.serverUrl}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validatedRequest.data),
          signal: AbortSignal.timeout(finalConfig.timeout),
        });

        if (!response.ok) {
          throw new Error(`MLX server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return guardValid(MLX_INFERENCE_RESPONSE_SCHEMA, data).data;
      },
      { content: '', model: request.model },
      (error) => {
        logWithContext('error', 'MLX generation failed', {
          error: error.message,
          model: request.model,
        });
      },
    );
  };

  /**
   * Generate embeddings using MLX model
   */
  const embed = async (
    request: z.infer<typeof MLX_EMBEDDING_REQUEST_SCHEMA>,
  ): Promise<z.infer<typeof MLX_EMBEDDING_RESPONSE_SCHEMA>> => {
    const validatedRequest = guardValid(MLX_EMBEDDING_REQUEST_SCHEMA, request);

    if (!validatedRequest.success) {
      throw new Error(`Invalid MLX embedding request: ${validatedRequest.error.message}`);
    }

    return withErrorBoundary(
      async () => {
        const response = await fetch(`${finalConfig.serverUrl}/embed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validatedRequest.data),
          signal: AbortSignal.timeout(finalConfig.timeout),
        });

        if (!response.ok) {
          throw new Error(`MLX server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return guardValid(MLX_EMBEDDING_RESPONSE_SCHEMA, data).data;
      },
      { embeddings: [], model: request.model, dimensions: 0 },
      (error) => {
        logWithContext('error', 'MLX embedding failed', {
          error: error.message,
          model: request.model,
        });
      },
    );
  };

  /**
   * List available models
   */
  const listModels = async (): Promise<string[]> => {
    return withErrorBoundary(
      async () => {
        const response = await fetch(`${finalConfig.serverUrl}/models`, {
          signal: AbortSignal.timeout(finalConfig.timeout),
        });

        if (!response.ok) {
          throw new Error(`MLX server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
      },
      [],
      (error) => {
        logWithContext('error', 'Failed to list MLX models', { error: error.message });
      },
    );
  };

  /**
   * Get model information
   */
  const getModelInfo = async (modelName: string) => {
    const models = await listModels();
    return models.find((model) => model === modelName) || null;
  };

  /**
   * Get client statistics
   */
  const getStats = () => {
    return {
      serverUrl: finalConfig.serverUrl,
      timeout: finalConfig.timeout,
      retryAttempts: finalConfig.retryAttempts,
      availableModels: Object.keys(finalConfig.models),
    };
  };

  return {
    healthCheck,
    generate,
    embed,
    listModels,
    getModelInfo,
    getStats,
  };
};

/**
 * MLX integration for A2A message processing
 * Provides AI-powered message analysis and generation
 */
export const createMlxMessageProcessor = (mlxClient: ReturnType<typeof createMlxClient>) => {
  /**
   * Analyze message content using MLX
   */
  const analyzeMessage = async (content: string, model = 'qwen2.5-0.5b') => {
    const prompt = `Analyze the following message and provide insights:

Message: ${content}

Provide:
1. Sentiment (positive/negative/neutral)
2. Key topics
3. Action items (if any)
4. Priority level (high/medium/low)

Response format: JSON`;

    const response = await mlxClient.generate({
      model,
      prompt,
      maxTokens: 500,
      temperature: 0.3,
    });

    return response;
  };

  /**
   * Generate response suggestions using MLX
   */
  const generateResponse = async (
    message: string,
    context: string[] = [],
    model = 'qwen2.5-0.5b',
  ) => {
    const contextStr = context.length > 0 ? `\n\nContext:\n${context.join('\n')}` : '';

    const prompt = `Generate an appropriate response to the following message. Consider the context provided.

Message: ${message}${contextStr}

Generate a helpful, professional response:`;

    const response = await mlxClient.generate({
      model,
      prompt,
      maxTokens: 300,
      temperature: 0.7,
    });

    return response;
  };

  /**
   * Classify message type/intent
   */
  const classifyMessage = async (content: string, model = 'qwen2.5-0.5b') => {
    const prompt = `Classify the following message into one of these categories:
- question
- request
- statement
- command
- feedback
- other

Message: ${content}

Respond with only the category name:`;

    const response = await mlxClient.generate({
      model,
      prompt,
      maxTokens: 50,
      temperature: 0.1,
    });

    return response.content.trim().toLowerCase();
  };

  return {
    analyzeMessage,
    generateResponse,
    classifyMessage,
  };
};
