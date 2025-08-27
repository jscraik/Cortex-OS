/**
 * MLX-first model router with Ollama fallback for the model gateway
 */

import { z } from 'zod';
import { MLXAdapter } from './adapters/mlx-adapter';
import { OllamaAdapter } from './adapters/ollama-adapter';

// Model capability types
export type ModelCapability = 'embedding' | 'chat' | 'reranking';

// Model provider types
export type ModelProvider = 'mlx' | 'ollama';

// Model configuration
export interface ModelConfig {
  name: string;
  provider: ModelProvider;
  capabilities: ModelCapability[];
  priority: number; // Higher number = higher priority
  fallback?: string[]; // Fallback model names
}

// Model mappings for different capabilities
const MODEL_MAPPINGS = {
  embedding: {
    mlx: ['qwen3-embedding-4b-mlx', 'qwen3-embedding-8b-mlx', 'qwen3-embedding-0.6b-mlx'],
    ollama: ['nomic-embed-text', 'all-minilm', 'mxbai-embed-large'],
  },
  chat: {
    mlx: ['qwen3-chat-mlx'], // Placeholder - would need actual MLX chat models
    ollama: ['llama2', 'codellama', 'mistral', 'phi', 'gemma'],
  },
  reranking: {
    mlx: ['qwen3-rerank-mlx'], // Placeholder - would need actual MLX reranking models
    ollama: ['nomic-embed-text'], // Using embedding model for reranking
  },
} as const;

// Request/Response schemas
const EmbeddingRequestSchema = z.object({
  text: z.string(),
  model: z.string().optional(),
});

const EmbeddingBatchRequestSchema = z.object({
  texts: z.array(z.string()),
  model: z.string().optional(),
});

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    }),
  ),
  model: z.string().optional(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
});

const RerankRequestSchema = z.object({
  query: z.string(),
  documents: z.array(z.string()),
  model: z.string().optional(),
});

export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;
export type EmbeddingBatchRequest = z.infer<typeof EmbeddingBatchRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type RerankRequest = z.infer<typeof RerankRequestSchema>;

/**
 * MLX-first model router with Ollama fallback
 */
export class ModelRouter {
  private readonly mlxAdapter: MLXAdapter;
  private readonly ollamaAdapter: OllamaAdapter;
  private readonly availableModels: Map<ModelCapability, ModelConfig[]>;

  constructor(mlxAdapter?: MLXAdapter, ollamaAdapter?: OllamaAdapter) {
    this.mlxAdapter = mlxAdapter || new MLXAdapter();
    this.ollamaAdapter = ollamaAdapter || new OllamaAdapter();
    this.availableModels = new Map();
  }

  /**
   * Initialize model configurations with priorities
   */
  async initialize(): Promise<void> {
    // Check MLX availability
    const mlxAvailable = await this.mlxAdapter.isAvailable();

    // Check Ollama availability
    const ollamaAvailable = await this.ollamaAdapter.isAvailable();

    // Configure embedding models
    const embeddingModels: ModelConfig[] = [];

    if (mlxAvailable) {
      embeddingModels.push(
        {
          name: 'qwen3-embedding-4b-mlx',
          provider: 'mlx',
          capabilities: ['embedding'],
          priority: 100,
          fallback: ['nomic-embed-text'],
        },
        {
          name: 'qwen3-embedding-8b-mlx',
          provider: 'mlx',
          capabilities: ['embedding'],
          priority: 90,
          fallback: ['qwen3-embedding-4b-mlx', 'nomic-embed-text'],
        },
      );
    }

    if (ollamaAvailable) {
      embeddingModels.push(
        {
          name: 'nomic-embed-text',
          provider: 'ollama',
          capabilities: ['embedding'],
          priority: mlxAvailable ? 50 : 100,
          fallback: [],
        },
        {
          name: 'all-minilm',
          provider: 'ollama',
          capabilities: ['embedding'],
          priority: mlxAvailable ? 40 : 90,
          fallback: ['nomic-embed-text'],
        },
      );
    }

    this.availableModels.set('embedding', embeddingModels);

    // Configure chat models
    const chatModels: ModelConfig[] = [];

    if (ollamaAvailable) {
      // Query Ollama for available models and only register those present
      const ollamaModels = await this.ollamaAdapter.listModels().catch(() => []);
      const desiredChat = [
        { name: 'llama2', priority: 100, fallback: ['codellama', 'mistral'] },
        { name: 'codellama', priority: 90, fallback: ['llama2', 'mistral'] },
      ];

      for (const m of desiredChat) {
        if (ollamaModels.some((name) => name === m.name || name.startsWith(m.name))) {
          chatModels.push({
            name: m.name,
            provider: 'ollama',
            capabilities: ['chat'],
            priority: m.priority,
            fallback: m.fallback,
          });
        } else {
          console.log(`[model-router] Ollama model ${m.name} not installed; skipping`);
        }
      }
    }

    this.availableModels.set('chat', chatModels);

    // Configure reranking models
    const rerankingModels: ModelConfig[] = [];

    if (mlxAvailable) {
      rerankingModels.push({
        name: 'qwen3-rerank-mlx',
        provider: 'mlx',
        capabilities: ['reranking'],
        priority: 100,
        fallback: ['nomic-embed-text'],
      });
    }

    if (ollamaAvailable) {
      rerankingModels.push({
        name: 'nomic-embed-text',
        provider: 'ollama',
        capabilities: ['reranking'],
        priority: mlxAvailable ? 50 : 100,
        fallback: [],
      });
    }

    this.availableModels.set('reranking', rerankingModels);
  }

  /**
   * Select the best model for a capability
   */
  private selectModel(capability: ModelCapability, requestedModel?: string): ModelConfig | null {
    const models = this.availableModels.get(capability);
    if (!models || models.length === 0) {
      return null;
    }

    if (requestedModel) {
      const requested = models.find((m) => m.name === requestedModel);
      if (requested) {
        return requested;
      }
    }

    // Sort by priority (highest first) and return the best available
    const sortedModels = [...models].sort((a, b) => b.priority - a.priority);
    return sortedModels[0];
  }

  /**
   * Whether we have any models for a given capability
   */
  public hasCapability(capability: ModelCapability): boolean {
    const models = this.availableModels.get(capability);
    return !!models && models.length > 0;
  }

  /**
   * Generate embeddings with MLX-first fallback to Ollama
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<number[]> {
    const model = this.selectModel('embedding', request.model);
    console.log('[model-router] generateEmbedding selected model:', model);

    if (!model) {
      throw new Error('No embedding models available');
    }

    try {
      if (model.provider === 'mlx') {
        const response = await this.mlxAdapter.generateEmbedding({
          text: request.text,
          model: model.name,
        });
        return response.embedding;
      } else {
        const response = await this.ollamaAdapter.generateEmbedding(request.text, model.name);
        return response.embedding;
      }
    } catch (error) {
      console.warn(`Primary embedding model ${model.name} failed, attempting fallback:`, error);

      // Try fallback models
      for (const fallbackModelName of model.fallback || []) {
        try {
          const fallbackModel = this.availableModels
            .get('embedding')
            ?.find((m) => m.name === fallbackModelName);
          if (!fallbackModel) continue;

          if (fallbackModel.provider === 'mlx') {
            const response = await this.mlxAdapter.generateEmbedding({
              text: request.text,
              model: fallbackModel.name,
            });
            return response.embedding;
          } else {
            const response = await this.ollamaAdapter.generateEmbedding(
              request.text,
              fallbackModel.name,
            );
            return response.embedding;
          }
        } catch (fallbackError) {
          console.warn(`Fallback embedding model ${fallbackModelName} also failed:`, fallbackError);
        }
      }

      throw new Error(
        `All embedding models failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate batch embeddings with MLX-first fallback to Ollama
   */
  async generateEmbeddings(request: EmbeddingBatchRequest): Promise<number[][]> {
    const model = this.selectModel('embedding', request.model);

    if (!model) {
      throw new Error('No embedding models available');
    }

    try {
      if (model.provider === 'mlx') {
        const responses = await this.mlxAdapter.generateEmbeddings(request.texts, model.name);
        return responses.map((r) => r.embedding);
      } else {
        const responses = await this.ollamaAdapter.generateEmbeddings(request.texts, model.name);
        return responses.map((r) => r.embedding);
      }
    } catch (error) {
      console.warn(
        `Primary batch embedding model ${model.name} failed, attempting fallback:`,
        error,
      );

      // Try fallback models
      for (const fallbackModelName of model.fallback || []) {
        try {
          const fallbackModel = this.availableModels
            .get('embedding')
            ?.find((m) => m.name === fallbackModelName);
          if (!fallbackModel) continue;

          if (fallbackModel.provider === 'mlx') {
            const responses = await this.mlxAdapter.generateEmbeddings(
              request.texts,
              fallbackModel.name,
            );
            return responses.map((r) => r.embedding);
          } else {
            const responses = await this.ollamaAdapter.generateEmbeddings(
              request.texts,
              fallbackModel.name,
            );
            return responses.map((r) => r.embedding);
          }
        } catch (fallbackError) {
          console.warn(
            `Fallback batch embedding model ${fallbackModelName} also failed:`,
            fallbackError,
          );
        }
      }

      throw new Error(
        `All batch embedding models failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate chat response with Ollama (MLX chat models not yet available)
   */
  async generateChat(request: ChatRequest): Promise<string> {
    const model = this.selectModel('chat', request.model);

    if (!model) {
      throw new Error('No chat models available');
    }

    try {
      const response = await this.ollamaAdapter.generateChat(
        request.messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        model.name,
        {
          temperature: request.temperature,
          max_tokens: request.max_tokens,
        },
      );
      return response.content;
    } catch (error) {
      console.warn(`Primary chat model ${model.name} failed, attempting fallback:`, error);

      // Try fallback models
      for (const fallbackModelName of model.fallback || []) {
        try {
          const fallbackModel = this.availableModels
            .get('chat')
            ?.find((m) => m.name === fallbackModelName);
          if (!fallbackModel) continue;

          const response = await this.ollamaAdapter.generateChat(
            request.messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
            fallbackModel.name,
            {
              temperature: request.temperature,
              max_tokens: request.max_tokens,
            },
          );
          return response.content;
        } catch (fallbackError) {
          console.warn(`Fallback chat model ${fallbackModelName} also failed:`, fallbackError);
        }
      }

      throw new Error(
        `All chat models failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Rerank documents with MLX-first fallback to Ollama
   */
  async rerank(request: RerankRequest): Promise<{ documents: string[]; scores: number[] }> {
    const model = this.selectModel('reranking', request.model);

    if (!model) {
      throw new Error('No reranking models available');
    }

    try {
      if (model.provider === 'mlx') {
        const response = await this.mlxAdapter.rerank({
          query: request.query,
          documents: request.documents,
          model: model.name,
        });
        return {
          documents: request.documents,
          scores: response.scores,
        };
      } else {
        const response = await this.ollamaAdapter.rerank(
          request.query,
          request.documents,
          model.name,
        );
        return {
          documents: request.documents,
          scores: response.scores,
        };
      }
    } catch (error) {
      console.warn(`Primary reranking model ${model.name} failed, attempting fallback:`, error);

      // Try fallback models
      for (const fallbackModelName of model.fallback || []) {
        try {
          const fallbackModel = this.availableModels
            .get('reranking')
            ?.find((m) => m.name === fallbackModelName);
          if (!fallbackModel) continue;

          if (fallbackModel.provider === 'mlx') {
            const response = await this.mlxAdapter.rerank({
              query: request.query,
              documents: request.documents,
              model: fallbackModel.name,
            });
            return {
              documents: request.documents,
              scores: response.scores,
            };
          } else {
            const response = await this.ollamaAdapter.rerank(
              request.query,
              request.documents,
              fallbackModel.name,
            );
            return {
              documents: request.documents,
              scores: response.scores,
            };
          }
        } catch (fallbackError) {
          console.warn(`Fallback reranking model ${fallbackModelName} also failed:`, fallbackError);
        }
      }

      throw new Error(
        `All reranking models failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get available models for a capability
   */
  getAvailableModels(capability: ModelCapability): ModelConfig[] {
    return this.availableModels.get(capability) || [];
  }

  /**
   * Check if any models are available for a capability
   */
  hasAvailableModels(capability: ModelCapability): boolean {
    const models = this.availableModels.get(capability);
    return models && models.length > 0;
  }
}
