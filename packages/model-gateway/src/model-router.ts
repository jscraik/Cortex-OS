/**
 * MLX-only model router for the model gateway
 */

import { z } from 'zod';
import { MLXAdapter } from './adapters/mlx-adapter';

export type ModelCapability = 'embedding' | 'chat' | 'reranking';
export type ModelProvider = 'mlx';

export interface ModelConfig {
  name: string;
  provider: ModelProvider;
  capabilities: ModelCapability[];
  priority: number;
  fallback?: string[];
}

const EmbeddingRequestSchema = z.object({ text: z.string(), model: z.string().optional() });
const EmbeddingBatchRequestSchema = z.object({
  texts: z.array(z.string()),
  model: z.string().optional(),
});
const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({ role: z.enum(['system', 'user', 'assistant']), content: z.string() }),
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

export class ModelRouter {
  private readonly mlxAdapter: MLXAdapter;
  private readonly availableModels: Map<ModelCapability, ModelConfig[]>;

  constructor(mlxAdapter?: MLXAdapter) {
    this.mlxAdapter = mlxAdapter || new MLXAdapter();
    this.availableModels = new Map();
  }

  async initialize(): Promise<void> {
    const mlxAvailable = await this.mlxAdapter.isAvailable();

    const embeddingModels: ModelConfig[] = [];

    // MLX models (highest priority)
    if (mlxAvailable) {
      embeddingModels.push(
        {
          name: 'qwen3-embedding-4b-mlx',
          provider: 'mlx',
          capabilities: ['embedding'],
          priority: 100,
          fallback: ['qwen3-embedding-8b-mlx'],
        },
        {
          name: 'qwen3-embedding-8b-mlx',
          provider: 'mlx',
          capabilities: ['embedding'],
          priority: 90,
          fallback: ['qwen3-embedding-4b-mlx'],
        },
      );
    }

    this.availableModels.set('embedding', embeddingModels);
    this.availableModels.set('chat', []);
    this.availableModels.set('reranking', []);
  }

  // Select the highest-priority available model for a capability
  private selectModel(capability: ModelCapability, preferredModel?: string) {
    const candidates = this.availableModels.get(capability) || [];
    if (preferredModel) {
      const preferred = candidates.find((m) => m.name === preferredModel);
      if (preferred) return preferred;
    }
    return candidates.length > 0 ? candidates[0] : undefined;
  }

  // Public helper: does router have any model for capability
  public hasCapability(capability: ModelCapability): boolean {
    const list = this.availableModels.get(capability) || [];
    return list.length > 0;
  }

  async generateEmbedding(
    request: EmbeddingRequest,
  ): Promise<{ embedding: number[]; model: string }> {
    const model = this.selectModel('embedding', request.model);
    if (!model) throw new Error('No MLX embedding models available');

    const tryModel = async (m: ModelConfig): Promise<{ embedding: number[]; model: string }> => {
      const response = await this.mlxAdapter.generateEmbedding({
        text: request.text,
        model: m.name,
      });
      return { embedding: response.embedding, model: m.name };
    };

    try {
      return await tryModel(model);
    } catch (error) {
      console.warn(`Primary embedding model ${model.name} failed, attempting fallback:`, error);
      for (const fallbackName of model.fallback || []) {
        const fallbackModel = this.availableModels
          .get('embedding')
          ?.find((m) => m.name === fallbackName);
        if (!fallbackModel) continue;
        try {
          return await tryModel(fallbackModel);
        } catch (fallbackError) {
          console.warn(`Fallback embedding model ${fallbackName} also failed:`, fallbackError);
        }
      }
      throw new Error(
        `All embedding models failed. Last error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async generateEmbeddings(
    request: EmbeddingBatchRequest,
  ): Promise<{ embeddings: number[][]; model: string }> {
    const model = this.selectModel('embedding', request.model);
    if (!model) throw new Error('No MLX embedding models available');

    const tryModel = async (m: ModelConfig): Promise<{ embeddings: number[][]; model: string }> => {
      const responses = await this.mlxAdapter.generateEmbeddings(request.texts, m.name);
      return { embeddings: responses.map((r) => r.embedding), model: m.name };
    };

    try {
      return await tryModel(model);
    } catch (error) {
      console.warn(
        `Primary batch embedding model ${model.name} failed, attempting fallback:`,
        error,
      );
      for (const fallbackName of model.fallback || []) {
        const fallbackModel = this.availableModels
          .get('embedding')
          ?.find((m) => m.name === fallbackName);
        if (!fallbackModel) continue;
        try {
          return await tryModel(fallbackModel);
        } catch (fallbackError) {
          console.warn(
            `Fallback batch embedding model ${fallbackName} also failed:`,
            fallbackError,
          );
        }
      }
      throw new Error(
        `All batch embedding models failed. Last error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async generateChat(_request: ChatRequest): Promise<{ content: string; model: string }> {
    throw new Error('Chat capability requires Ollama support, which is not available.');
  }

  async rerank(
    _request: RerankRequest,
  ): Promise<{ documents: string[]; scores: number[]; model: string }> {
    throw new Error('Reranking capability requires Ollama support, which is not available.');
  }

  getAvailableModels(capability: ModelCapability): ModelConfig[] {
    return this.availableModels.get(capability) || [];
  }
}
