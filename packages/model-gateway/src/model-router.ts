/**
 * MLX-first model router for the model gateway
 */

import { z } from 'zod';
import { createMLXAdapter, type MLXAdapterApi } from './adapters/mlx-adapter.js';
import { createOllamaAdapter, type OllamaAdapterApi } from './adapters/ollama-adapter.js';
import type { Message } from './adapters/types.js';

export type ModelCapability = 'embedding' | 'chat' | 'reranking';
export type ModelProvider = 'mlx' | 'ollama' | 'mcp';

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

export interface IModelRouter {
  initialize(): Promise<void>;
  hasCapability(capability: ModelCapability): boolean;
  generateEmbedding(request: EmbeddingRequest): Promise<{ embedding: number[]; model: string }>;
  generateEmbeddings(
    request: EmbeddingBatchRequest,
  ): Promise<{ embeddings: number[][]; model: string }>;
  generateChat(request: ChatRequest): Promise<{ content: string; model: string }>;
  rerank(request: RerankRequest): Promise<{ documents: string[]; scores: number[]; model: string }>;
  getAvailableModels(capability: ModelCapability): ModelConfig[];
  hasAvailableModels(capability: ModelCapability): boolean;
}

/**
 * Class-based router (compatible with existing tests) with lazy MCP loading.
 */
export class ModelRouter implements IModelRouter {
  private readonly availableModels = new Map<ModelCapability, ModelConfig[]>();
  private mcpAdapter: { isAvailable: () => Promise<boolean>; [k: string]: any } | null = null;

  constructor(
    private readonly mlxAdapter: MLXAdapterApi = createMLXAdapter(),
    private readonly ollamaAdapter: OllamaAdapterApi = createOllamaAdapter(),
  ) {}

  private async ensureMcpLoaded(): Promise<boolean> {
    const transport = (process.env.MCP_TRANSPORT || '').trim();
    if (!transport) return false; // Avoid importing if MCP not configured
    if (this.mcpAdapter) return true;
    try {
      const mod = await import('./adapters/mcp-adapter.js');
      this.mcpAdapter = mod.createMCPAdapter();
      return await this.mcpAdapter.isAvailable();
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    const mlxAvailable = await this.mlxAdapter.isAvailable();
    const ollamaAvailable = await this.ollamaAdapter.isAvailable();
    const mcpAvailable = await this.ensureMcpLoaded();

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

    if (ollamaAvailable) {
      embeddingModels.push({
        name: 'nomic-embed-text',
        provider: 'ollama',
        capabilities: ['embedding'],
        priority: mlxAvailable ? 50 : 100,
        fallback: [],
      });
    }

    if (!mlxAvailable && !ollamaAvailable && mcpAvailable) {
      embeddingModels.push({
        name: 'mcp-embeddings',
        provider: 'mcp',
        capabilities: ['embedding'],
        priority: 80,
        fallback: [],
      });
    }
    this.availableModels.set('embedding', embeddingModels);

    const chatModels: ModelConfig[] = [];
    if (ollamaAvailable) {
      const ollamaModels = await this.ollamaAdapter.listModels().catch(() => []);
      const desiredChat = [{ name: 'llama2', priority: 100, fallback: [] }];

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
    if (!ollamaAvailable && mcpAvailable) {
      chatModels.push({
        name: 'mcp-chat',
        provider: 'mcp',
        capabilities: ['chat'],
        priority: 70,
        fallback: [],
      });
    }
    this.availableModels.set('chat', chatModels);

    const rerankingModels: ModelConfig[] = [];
    if (mlxAvailable) {
      rerankingModels.push({
        name: 'qwen3-reranker-4b-mlx',
        provider: 'mlx',
        capabilities: ['reranking'],
        priority: 100,
        fallback: ollamaAvailable ? ['nomic-embed-text'] : [],
      });
    }
    if (ollamaAvailable) {
      rerankingModels.push({
        name: 'nomic-embed-text',
        provider: 'ollama',
        capabilities: ['reranking'],
        priority: mlxAvailable ? 80 : 100,
        fallback: [],
      });
    }
    if (!mlxAvailable && !ollamaAvailable && mcpAvailable) {
      rerankingModels.push({
        name: 'mcp-rerank',
        provider: 'mcp',
        capabilities: ['reranking'],
        priority: 60,
        fallback: [],
      });
    }
    this.availableModels.set('reranking', rerankingModels);
  }

  private selectModel(capability: ModelCapability, requestedModel?: string): ModelConfig | null {
    const models = this.availableModels.get(capability);
    if (!models || models.length === 0) return null;
    if (requestedModel) {
      const requested = models.find((m) => m.name === requestedModel);
      if (requested) return requested;
    }
    return [...models].sort((a, b) => b.priority - a.priority)[0];
  }

  hasCapability(capability: ModelCapability): boolean {
    const models = this.availableModels.get(capability);
    return !!models && models.length > 0;
  }

  async generateEmbedding(
    request: EmbeddingRequest,
  ): Promise<{ embedding: number[]; model: string }> {
    const model = this.selectModel('embedding', request.model);
    if (!model) throw new Error('No embedding models available');

    const tryModel = async (m: ModelConfig): Promise<{ embedding: number[]; model: string }> => {
      if (m.provider === 'mlx') {
        const response = await this.mlxAdapter.generateEmbedding({
          text: request.text,
          model: m.name,
        });
        return { embedding: response.embedding, model: m.name };
      } else if (m.provider === 'ollama') {
        const response = await this.ollamaAdapter.generateEmbedding(request.text, m.name);
        return { embedding: response.embedding, model: m.name };
      } else {
        const response = await this.mcpAdapter.generateEmbedding(request);
        return { embedding: response.embedding, model: response.model };
      }
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
    if (!model) throw new Error('No embedding models available');

    const tryModel = async (m: ModelConfig): Promise<{ embeddings: number[][]; model: string }> => {
      if (m.provider === 'mlx') {
        const responses = await this.mlxAdapter.generateEmbeddings(request.texts, m.name);
        return { embeddings: responses.map((r) => r.embedding), model: m.name };
      } else if (m.provider === 'ollama') {
        const responses = await this.ollamaAdapter.generateEmbeddings(request.texts, m.name);
        return { embeddings: responses.map((r) => r.embedding), model: m.name };
      } else {
        const res = await this.mcpAdapter.generateEmbeddings(request);
        return { embeddings: res.embeddings, model: res.model };
      }
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

  async generateChat(request: ChatRequest): Promise<{ content: string; model: string }> {
    const model = this.selectModel('chat', request.model);
    if (!model) throw new Error('No chat models available');

    const tryModel = async (m: ModelConfig): Promise<{ content: string; model: string }> => {
      if (m.provider === 'ollama') {
        const response = await this.ollamaAdapter.generateChat({
          messages: request.messages as unknown as Message[],
          model: m.name,
          max_tokens: request.max_tokens,
          temperature: request.temperature,
        });
        return { content: response.content, model: m.name };
      } else if (m.provider === 'mcp') {
        // Lazy load MCP to avoid hard dependency for tests
        const response = await (await import('./adapters/mcp-adapter.js'))
          .createMCPAdapter()
          .generateChat(request);
        return { content: response.content, model: response.model };
      } else {
        throw new Error('MLX chat not routed via gateway');
      }
    };

    try {
      return await tryModel(model);
    } catch (error) {
      console.warn(`Primary chat model ${model.name} failed, attempting fallback:`, error);
      for (const fallbackName of model.fallback || []) {
        const fallbackModel = this.availableModels
          .get('chat')
          ?.find((m) => m.name === fallbackName);
        if (!fallbackModel) continue;
        try {
          return await tryModel(fallbackModel);
        } catch (fallbackError) {
          console.warn(`Fallback chat model ${fallbackName} also failed:`, fallbackError);
        }
      }
      throw new Error(
        `All chat models failed. Last error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async rerank(
    request: RerankRequest,
  ): Promise<{ documents: string[]; scores: number[]; model: string }> {
    const model = this.selectModel('reranking', request.model);
    if (!model) throw new Error('No reranking models available');

    const tryModel = async (
      m: ModelConfig,
    ): Promise<{ documents: string[]; scores: number[]; model: string }> => {
      if (m.provider === 'mlx') {
        const response = await this.mlxAdapter.rerank(request.query, request.documents, m.name);
        return { documents: request.documents, scores: response.scores, model: m.name };
      } else {
        const response = await this.ollamaAdapter.rerank!(request.query, request.documents, m.name);
        return { documents: request.documents, scores: response.scores, model: m.name };
      }
    };

    try {
      return await tryModel(model);
    } catch (error) {
      console.warn(`Primary reranking model ${model.name} failed, attempting fallback:`, error);
      for (const fallbackName of model.fallback || []) {
        const fallbackModel = this.availableModels
          .get('reranking')
          ?.find((m) => m.name === fallbackName);
        if (!fallbackModel) continue;
        try {
          return await tryModel(fallbackModel);
        } catch (fallbackError) {
          console.warn(`Fallback reranking model ${fallbackName} also failed:`, fallbackError);
        }
      }
      throw new Error(
        `All reranking models failed. Last error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  getAvailableModels(capability: ModelCapability): ModelConfig[] {
    return this.availableModels.get(capability) || [];
  }

  hasAvailableModels(capability: ModelCapability): boolean {
    const models = this.availableModels.get(capability);
    return !!models && models.length > 0;
  }
}

/** Factory to create a model router using default adapters */
export function createModelRouter(
  mlxAdapter: MLXAdapterApi = createMLXAdapter(),
  ollamaAdapter: OllamaAdapterApi = createOllamaAdapter(),
): IModelRouter {
  return new ModelRouter(mlxAdapter, ollamaAdapter);
}
