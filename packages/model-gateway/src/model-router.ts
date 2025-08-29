/**
 * MLX-first model router with Ollama fallback for the model gateway
 */

import { createProvider, withFallback } from '@cortex-os/utils';
import { z } from 'zod';
import { MLXAdapter } from './adapters/mlx-adapter';
import { OllamaAdapter } from './adapters/ollama-adapter';
import { FrontierAdapter, FrontierConfig } from './adapters/frontier-adapter';

export type ModelCapability = 'embedding' | 'chat' | 'reranking';
export type ModelProvider = 'mlx' | 'ollama' | 'frontier';

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
  private readonly ollamaAdapter: OllamaAdapter;
  private readonly frontierAdapter?: FrontierAdapter;
  private readonly availableModels: Map<ModelCapability, ModelConfig[]>;

  constructor(
    mlxAdapter?: MLXAdapter, 
    ollamaAdapter?: OllamaAdapter,
    frontierConfig?: FrontierConfig
  ) {
    this.mlxAdapter = mlxAdapter || new MLXAdapter();
    this.ollamaAdapter = ollamaAdapter || new OllamaAdapter();
    this.frontierAdapter = frontierConfig ? new FrontierAdapter(frontierConfig) : undefined;
    this.availableModels = new Map();
  }

  async initialize(): Promise<void> {
    const mlxAvailable = await this.mlxAdapter.isAvailable();
    const ollamaAvailable = await this.ollamaAdapter.isAvailable();
    const frontierAvailable = this.frontierAdapter ? await this.frontierAdapter.isAvailable() : false;

    const embeddingModels: ModelConfig[] = [];
    
    // MLX models (highest priority)
    if (mlxAvailable) {
      embeddingModels.push(
        {
          name: 'qwen3-embedding-4b-mlx',
          provider: 'mlx',
          capabilities: ['embedding'],
          priority: 100,
          fallback: ['nomic-embed-text', 'text-embedding-3-small'],
        },
        {
          name: 'qwen3-embedding-8b-mlx',
          provider: 'mlx',
          capabilities: ['embedding'],
          priority: 90,
          fallback: ['qwen3-embedding-4b-mlx', 'nomic-embed-text', 'text-embedding-3-small'],
        },
      );
    }

    // Ollama models (medium priority)
    if (ollamaAvailable) {
      embeddingModels.push({
        name: 'nomic-embed-text',
        provider: 'ollama',
        capabilities: ['embedding'],
        priority: mlxAvailable ? 50 : 100,
        fallback: frontierAvailable ? ['text-embedding-3-small'] : [],
      });
    }

    // Frontier models (fallback priority)
    if (frontierAvailable) {
      const frontierModels = this.frontierAdapter!.getAvailableModels();
      for (const model of frontierModels.embedding) {
        embeddingModels.push({
          name: model,
          provider: 'frontier',
          capabilities: ['embedding'],
          priority: 10,
          fallback: [],
        });
      }
    }

    this.availableModels.set('embedding', embeddingModels);

    const chatModels: ModelConfig[] = [];
    
    // Ollama chat models
    if (ollamaAvailable) {
      const ollamaModels = await this.ollamaAdapter.listModels().catch(() => []);
      const desiredChat = [
        { name: 'llama2', priority: 100, fallback: frontierAvailable ? ['gpt-3.5-turbo'] : [] },
        { name: 'llama3', priority: 95, fallback: frontierAvailable ? ['gpt-3.5-turbo'] : [] },
        { name: 'codellama', priority: 90, fallback: frontierAvailable ? ['gpt-4'] : [] }
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

    // Frontier chat models
    if (frontierAvailable) {
      const frontierModels = this.frontierAdapter!.getAvailableModels();
      for (const model of frontierModels.chat) {
        chatModels.push({
          name: model,
          provider: 'frontier',
          capabilities: ['chat'],
          priority: ollamaAvailable ? 20 : 100, // Lower priority if Ollama available
          fallback: [],
        });
      }
    }

    this.availableModels.set('chat', chatModels);

    const rerankingModels: ModelConfig[] = [];
    if (ollamaAvailable) {
      rerankingModels.push({
        name: 'nomic-embed-text',
        provider: 'ollama',
        capabilities: ['reranking'],
        priority: 100,
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

  public hasCapability(capability: ModelCapability): boolean {
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
      } else if (m.provider === 'frontier' && this.frontierAdapter) {
        const response = await this.frontierAdapter.generateEmbedding(request.text, m.name);
        return { embedding: response.embedding, model: m.name };
      } else {
        throw new Error(`Unsupported provider: ${m.provider}`);
      }
    };

    // Create providers for primary model and fallbacks
    const providers = [
      createProvider(model.name, () => tryModel(model)),
      ...((model.fallback || [])
        .map((fallbackName) => {
          const fallbackModel = this.availableModels
            .get('embedding')
            ?.find((m) => m.name === fallbackName);

          return fallbackModel ? createProvider(fallbackName, () => tryModel(fallbackModel)) : null;
        })
        .filter(Boolean) as any[]),
    ];

    return await withFallback(providers, {
      errorMessage: 'All embedding models failed',
    });
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
      } else if (m.provider === 'frontier' && this.frontierAdapter) {
        const responses = await this.frontierAdapter.generateEmbeddings(request.texts, m.name);
        return { embeddings: responses.map((r) => r.embedding), model: m.name };
      } else {
        throw new Error(`Unsupported provider: ${m.provider}`);
      }
    };

    // Create providers for primary model and fallbacks
    const providers = [
      createProvider(model.name, () => tryModel(model)),
      ...((model.fallback || [])
        .map((fallbackName) => {
          const fallbackModel = this.availableModels
            .get('embedding')
            ?.find((m) => m.name === fallbackName);

          return fallbackModel ? createProvider(fallbackName, () => tryModel(fallbackModel)) : null;
        })
        .filter(Boolean) as any[]),
    ];

    return await withFallback(providers, {
      errorMessage: 'All batch embedding models failed',
    });
  }

  async generateChat(request: ChatRequest): Promise<{ content: string; model: string }> {
    const model = this.selectModel('chat', request.model);
    if (!model) throw new Error('No chat models available');

    const tryModel = async (m: ModelConfig): Promise<{ content: string; model: string }> => {
      if (m.provider === 'ollama') {
        const response = await this.ollamaAdapter.generateChat(
          request.messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
          m.name,
          { temperature: request.temperature, max_tokens: request.max_tokens },
        );
        return { content: response.content, model: m.name };
      } else if (m.provider === 'frontier' && this.frontierAdapter) {
        const response = await this.frontierAdapter.generateChat(
          request.messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
          m.name,
          { temperature: request.temperature, max_tokens: request.max_tokens },
        );
        return { content: response.content, model: m.name };
      } else {
        throw new Error(`Unsupported provider for chat: ${m.provider}`);
      }
    };

    // Create providers for primary model and fallbacks
    const providers = [
      createProvider(model.name, () => tryModel(model)),
      ...((model.fallback || [])
        .map((fallbackName) => {
          const fallbackModel = this.availableModels
            .get('chat')
            ?.find((m) => m.name === fallbackName);

          return fallbackModel ? createProvider(fallbackName, () => tryModel(fallbackModel)) : null;
        })
        .filter(Boolean) as any[]),
    ];

    return await withFallback(providers, {
      errorMessage: 'All chat models failed',
    });
  }

  async rerank(
    request: RerankRequest,
  ): Promise<{ documents: string[]; scores: number[]; model: string }> {
    const model = this.selectModel('reranking', request.model);
    if (!model) throw new Error('No reranking models available');

    const tryModel = async (
      m: ModelConfig,
    ): Promise<{ documents: string[]; scores: number[]; model: string }> => {
      const response = await this.ollamaAdapter.rerank(request.query, request.documents, m.name);
      return { documents: request.documents, scores: response.scores, model: m.name };
    };

    // Create providers for primary model and fallbacks
    const providers = [
      createProvider(model.name, () => tryModel(model)),
      ...((model.fallback || [])
        .map((fallbackName) => {
          const fallbackModel = this.availableModels
            .get('reranking')
            ?.find((m) => m.name === fallbackName);

          return fallbackModel ? createProvider(fallbackName, () => tryModel(fallbackModel)) : null;
        })
        .filter(Boolean) as any[]),
    ];

    return await withFallback(providers, {
      errorMessage: 'All reranking models failed',
    });
  }

  getAvailableModels(capability: ModelCapability): ModelConfig[] {
    return this.availableModels.get(capability) || [];
  }

  hasAvailableModels(capability: ModelCapability): boolean {
    const models = this.availableModels.get(capability);
    return !!models && models.length > 0;
  }
}
