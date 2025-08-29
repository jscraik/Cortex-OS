// Minimal ModelRouter for tests - clean replacement

import { z } from 'zod';
import { FrontierAdapter, FrontierConfig } from './adapters/frontier-adapter';
import { MLXAdapter } from './adapters/mlx-adapter';
import { OllamaAdapter } from './adapters/ollama-adapter';
import type {
  FrontierAdapterInterface,
  MLXAdapterInterface,
  Message,
  OllamaAdapterInterface,
} from './adapters/types';

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
  private readonly mlxAdapter: MLXAdapterInterface;
  private readonly ollamaAdapter: OllamaAdapterInterface;
  private readonly frontierAdapter?: FrontierAdapterInterface;
  private readonly availableModels: Map<ModelCapability, ModelConfig[]> = new Map();

  constructor(
    mlxAdapter?: MLXAdapterInterface,
    ollamaAdapter?: OllamaAdapterInterface,
    frontierConfig?: FrontierConfig,
  ) {
    // Accept injected adapters or construct defaults (cast to interface)
    this.mlxAdapter = mlxAdapter || (new MLXAdapter() as unknown as MLXAdapterInterface);
    this.ollamaAdapter =
      ollamaAdapter || (new OllamaAdapter() as unknown as OllamaAdapterInterface);
    this.frontierAdapter = frontierConfig
      ? (new FrontierAdapter(frontierConfig) as unknown as FrontierAdapterInterface)
      : undefined;
  }

  async initialize(): Promise<void> {
    const mlxAvailable = await this.mlxAdapter.isAvailable();
    const ollamaAvailable = await this.ollamaAdapter.isAvailable();
    const frontierAvailable = this.frontierAdapter
      ? await this.frontierAdapter.isAvailable()
      : false;

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
        priority: 50,
      });
    }

    // Frontier fallback (lowest)
    if (frontierAvailable) {
      embeddingModels.push({
        name: 'text-embedding-3-small',
        provider: 'frontier',
        capabilities: ['embedding'],
        priority: 10,
      });
    }

    // Sort by priority (high -> low)
    embeddingModels.sort((a, b) => b.priority - a.priority);
    this.availableModels.set('embedding', embeddingModels);
  }

  // Select the highest-priority available model for a capability
  private selectModel(capability: ModelCapability) {
    const candidates = this.availableModels.get(capability) || [];
    return candidates.length > 0 ? candidates[0] : undefined;
  }

  // Public helper: does router have any model for capability
  public hasCapability(capability: ModelCapability): boolean {
    const list = this.availableModels.get(capability) || [];
    return list.length > 0;
  }

  // Public helper: return available models for a capability (sorted by priority desc)
  public getAvailableModels(capability: ModelCapability): ModelConfig[] {
    return this.availableModels.get(capability) || [];
  }

  async generateEmbedding(request: EmbeddingRequest) {
    const candidates = this.availableModels.get('embedding') || [];
    if (candidates.length === 0) {
      throw new Error('No embedding models available');
    }

    for (const candidate of candidates) {
      const chosenModel = request.model || candidate.name;
      try {
        if (candidate.provider === 'mlx' && (this.mlxAdapter as any).generateEmbedding) {
          const res = await (this.mlxAdapter as any).generateEmbedding({
            text: request.text,
            model: chosenModel,
          } as any);
          return { embedding: res.embedding, model: res.model ?? chosenModel };
        }

        if (candidate.provider === 'ollama') {
          const res = await this.ollamaAdapter.generateEmbedding(request.text, chosenModel);
          return { embedding: res.embedding, model: res.model ?? chosenModel };
        }

        if (candidate.provider === 'frontier' && this.frontierAdapter) {
          const res = await this.frontierAdapter.generateEmbedding(request.text, chosenModel);
          return { embedding: res.embedding, model: res.model ?? chosenModel };
        }
      } catch (e: any) {
        // try next candidate on error
      }
    }

    // If we reach here, all candidates failed
    throw new Error('All embedding models failed');
  }

  async generateEmbeddings(request: EmbeddingBatchRequest) {
    const model = this.selectModel('embedding');
    if (model?.provider === 'mlx') {
      const res = await this.mlxAdapter.generateEmbeddings({
        texts: request.texts,
        model: request.model,
      });
      // MLX returns Embedding[]; normalize to { embeddings, model }
      return { embeddings: res.map((r) => r.embedding), model: res[0]?.model ?? request.model };
    }

    if (model?.provider === 'ollama') {
      const chosen = model.name || request.model;
      const res = await this.ollamaAdapter.generateEmbeddings(request.texts, chosen);
      return { embeddings: res.map((r) => r.embedding), model: res[0]?.model ?? chosen };
    }

    throw new Error('No embeddings model available');
  }

  async generateChat(request: ChatRequest) {
    // Build a candidate list: prefer chat models, then embedding-capable models
    const chatCandidates = this.availableModels.get('chat') || [];
    const fallbackCandidates = this.availableModels.get('embedding') || [];
    const candidates = chatCandidates.concat(fallbackCandidates);

    if (candidates.length === 0) throw new Error('No chat models available');

    for (const candidate of candidates) {
      const chosenModel = request.model || candidate.name;
      try {
        if (candidate.provider === 'mlx') {
          const res = await this.mlxAdapter.generateChat({
            messages: request.messages as Message[],
            model: chosenModel,
            max_tokens: request.max_tokens,
            temperature: request.temperature,
          } as any);
          return { content: res.content, model: res.model ?? chosenModel };
        }

        if (candidate.provider === 'ollama') {
          const res = await this.ollamaAdapter.generateChat(
            request.messages as Message[],
            chosenModel,
            {
              temperature: request.temperature,
              max_tokens: request.max_tokens,
            },
          );
          return { content: res.content, model: res.model ?? chosenModel };
        }

        if (candidate.provider === 'frontier' && this.frontierAdapter) {
          const res = await this.frontierAdapter.generateChat(
            request.messages as any,
            chosenModel,
            {
              temperature: request.temperature,
              max_tokens: request.max_tokens,
            },
          );
          return { content: res.content, model: res.model ?? chosenModel };
        }
      } catch {
        // try next candidate
      }
    }

    throw new Error('All chat models failed');
  }

  // Rerank documents using the highest priority available reranking (or embedding) provider
  async rerank(request: RerankRequest) {
    const candidates =
      this.availableModels.get('reranking') || this.availableModels.get('embedding') || [];
    if (candidates.length === 0) throw new Error('No rerank models available');

    for (const candidate of candidates) {
      const chosenModel = request.model || candidate.name;
      try {
        if (candidate.provider === 'mlx' && (this.mlxAdapter as any).generateReranking) {
          // MLX returns array of {index, score}
          const scores = await (this.mlxAdapter as any).generateReranking(
            request.query,
            request.documents,
            chosenModel as any,
          );
          return { scores, documents: request.documents, model: chosenModel } as any;
        }

        if (candidate.provider === 'ollama') {
          const res = await this.ollamaAdapter.rerank(
            request.query,
            request.documents,
            chosenModel,
          );
          return { scores: res.scores, documents: request.documents, model: chosenModel } as any;
        }

        if (candidate.provider === 'frontier' && this.frontierAdapter) {
          // Frontier adapter may not implement rerank; skip to next
          continue;
        }
      } catch {
        // try next candidate
      }
    }

    throw new Error('All rerank models failed');
  }
}
