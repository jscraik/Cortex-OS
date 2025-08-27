/**
 * @file AI Model Adapter Interface and inline production adapters
 * @description Provides concrete MLX and Ollama adapters and a factory that validates configuration and instantiates them.
 */

import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import { AICapability, ModelConfig, ModelConfigSchema, ModelProvider } from './config.js';

/**
 * AI model response schema
 */
export const AIResponseSchema = z.object({
  content: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional(),
  modelUsed: z.string(),
  processingTime: z.number(),
  success: z.boolean(),
});

/**
 * Embedding response schema
 */
export const EmbeddingResponseSchema = z.object({
  embedding: z.array(z.number()),
  dimensions: z.number(),
  modelUsed: z.string(),
  processingTime: z.number(),
  success: z.boolean(),
});

/**
 * Reranking response schema
 */
export const RerankingResponseSchema = z.object({
  rankedItems: z.array(
    z.object({
      index: z.number(),
      score: z.number(),
      content: z.string(),
    }),
  ),
  modelUsed: z.string(),
  processingTime: z.number(),
  success: z.boolean(),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;
export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;
export type RerankingResponse = z.infer<typeof RerankingResponseSchema>;

/**
 * AI processing request interface
 */
export interface AIRequest {
  prompt: string;
  capability: AICapability;
  context?: Record<string, any>;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Embedding request interface
 */
export interface EmbeddingRequest {
  text: string;
  context?: Record<string, any>;
  timeout?: number;
}

/**
 * Reranking request interface
 */
export interface RerankingRequest {
  query: string;
  items: string[];
  topK?: number;
  timeout?: number;
}

/**
 * AI Model Adapter interface
 */
export interface AIModelAdapter {
  getName(): string;
  getVersion(): string;
  isHealthy(): Promise<boolean>;
  generateText(request: AIRequest): Promise<AIResponse>;
  generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  rerank(request: RerankingRequest): Promise<RerankingResponse>;
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    averageResponseTime: number;
    lastUsed: Date | null;
    isAvailable: boolean;
  };
  cleanup(): Promise<void>;
}

/**
 * Model adapter factory interface
 */
export interface AIModelAdapterFactory {
  createMLXAdapter(modelName: string, config: Record<string, any>): Promise<AIModelAdapter>;
  createOllamaAdapter(modelName: string, config: Record<string, any>): Promise<AIModelAdapter>;
  createAdapter(capability: AICapability, preferMLX?: boolean): Promise<AIModelAdapter>;
}

// ------------------
// Inline concrete adapters
// ------------------

const DEFAULT_MLX_ENDPOINT = process.env.MLX_URL ?? 'http://localhost:8765';
const DEFAULT_OLLAMA_ENDPOINT = process.env.OLLAMA_URL ?? 'http://localhost:11434';

function normalizeEndpoint(e?: string) {
  return (e || '').replace(/\/*$/, '');
}

class HTTPBaseAdapter implements AIModelAdapter {
  protected name: string;
  protected version = '1.0.0';
  protected endpoint: string;
  protected client: AxiosInstance;
  protected stats = {
    totalRequests: 0,
    successfulRequests: 0,
    totalTimeMs: 0,
    lastUsed: null as Date | null,
    isAvailable: true,
  };

  constructor(name: string, endpoint: string) {
    this.name = name;
    this.endpoint = endpoint;
    this.client = axios.create({
      baseURL: normalizeEndpoint(this.endpoint),
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  getName() {
    return this.name;
  }
  getVersion() {
    return this.version;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.client.get('/health', { timeout: 5000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async generateText(_request: AIRequest): Promise<AIResponse> {
    throw new Error('Not implemented');
  }
  async generateEmbedding(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new Error('Not implemented');
  }
  async rerank(_request: RerankingRequest): Promise<RerankingResponse> {
    throw new Error('Not implemented');
  }

  getStats() {
    const avg =
      this.stats.totalRequests === 0 ? 0 : this.stats.totalTimeMs / this.stats.totalRequests;
    return { ...this.stats, averageResponseTime: Math.round(avg) } as any;
  }

  async cleanup(): Promise<void> {
    this.stats.isAvailable = false;
  }
}

class MLXAdapter extends HTTPBaseAdapter {
  constructor(modelName: string, config: ModelConfig) {
    super(`mlx:${modelName}`, config.endpoint ?? DEFAULT_MLX_ENDPOINT);
  }

  async generateText(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    this.stats.totalRequests += 1;
    const res = await this.client.post('/generate', {
      prompt: request.prompt,
      maxTokens: request.maxTokens,
    });
    const json: any = res.data || {};
    const time = Date.now() - start;
    if (res.status === 200) {
      this.stats.successfulRequests += 1;
    }
    this.stats.totalTimeMs += time;
    this.stats.lastUsed = new Date();
    return AIResponseSchema.parse({
      content: json.content ?? json.text ?? '',
      confidence: json.confidence ?? undefined,
      metadata: json.metadata ?? {},
      modelUsed: this.getName(),
      processingTime: time,
      success: res.status === 200,
    });
  }

  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const start = Date.now();
    this.stats.totalRequests += 1;
    const res = await this.client.post('/embed', { texts: [request.text] });
    const json: any = res.data || {};
    const embedding = json.embeddings?.[0] ?? json.embedding ?? [];
    const time = Date.now() - start;
    if (res.status === 200) {
      this.stats.successfulRequests += 1;
    }
    this.stats.totalTimeMs += time;
    this.stats.lastUsed = new Date();
    return EmbeddingResponseSchema.parse({
      embedding: embedding as number[],
      dimensions: embedding?.length ?? 0,
      modelUsed: this.getName(),
      processingTime: time,
      success: res.status === 200,
    });
  }

  async rerank(request: RerankingRequest): Promise<RerankingResponse> {
    const start = Date.now();
    this.stats.totalRequests += 1;
    const res = await this.client.post('/rerank', {
      query: request.query,
      documents: request.items,
    });
    const json: any = res.data || {};
    const time = Date.now() - start;
    if (res.status === 200) {
      this.stats.successfulRequests += 1;
    }
    this.stats.totalTimeMs += time;
    this.stats.lastUsed = new Date();
    const rankedItems = json.scores
      ? json.scores.map((s: number, i: number) => ({
          index: i,
          score: s,
          content: request.items[i],
        }))
      : (json.rankedItems ?? []);
    return RerankingResponseSchema.parse({
      rankedItems,
      modelUsed: this.getName(),
      processingTime: time,
      success: res.status === 200,
    });
  }
}

class OllamaAdapter extends HTTPBaseAdapter {
  constructor(modelName: string, config: ModelConfig) {
    super(`ollama:${modelName}`, config.endpoint ?? DEFAULT_OLLAMA_ENDPOINT);
  }

  async generateText(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    this.stats.totalRequests += 1;
    const res = await this.client.post('/api/generate', { prompt: request.prompt });
    const json: any = res.data || {};
    const time = Date.now() - start;
    if (res.status === 200) {
      this.stats.successfulRequests += 1;
    }
    this.stats.totalTimeMs += time;
    this.stats.lastUsed = new Date();
    return AIResponseSchema.parse({
      content: json.response ?? '',
      confidence: undefined,
      metadata: {},
      modelUsed: this.getName(),
      processingTime: time,
      success: res.status === 200,
    });
  }

  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const start = Date.now();
    this.stats.totalRequests += 1;
    const res = await this.client.post('/api/embed', { text: request.text });
    const json: any = res.data || {};
    const raw = json.embedding ?? json.response ?? '';
    const embedding = Array.isArray(raw)
      ? raw
      : String(raw)
          .split(/[,\s]+/)
          .filter(Boolean)
          .map(Number);
    const time = Date.now() - start;
    if (res.status === 200) {
      this.stats.successfulRequests += 1;
    }
    this.stats.totalTimeMs += time;
    this.stats.lastUsed = new Date();
    return EmbeddingResponseSchema.parse({
      embedding,
      dimensions: embedding.length,
      modelUsed: this.getName(),
      processingTime: time,
      success: res.status === 200,
    });
  }

  async rerank(request: RerankingRequest): Promise<RerankingResponse> {
    const start = Date.now();
    this.stats.totalRequests += 1;
    const rankedItems: Array<{ index: number; score: number; content: string }> = [];
    for (let i = 0; i < request.items.length; i++) {
      const doc = request.items[i];
      const res = await this.client.post('/api/generate', {
        prompt: `${request.query}\nScore relevance (0-1): ${doc}`,
      });
      const json: any = res.data || {};
      const score = Number(json.response ?? 0);
      rankedItems.push({ index: i, score: isNaN(score) ? 0 : score, content: doc });
    }
    const time = Date.now() - start;
    this.stats.successfulRequests += 1;
    this.stats.totalTimeMs += time;
    this.stats.lastUsed = new Date();
    return RerankingResponseSchema.parse({
      rankedItems,
      modelUsed: this.getName(),
      processingTime: time,
      success: true,
    });
  }
}

/**
 * Default production-ready adapter factory.
 * Validates configs and instantiates inline adapters.
 */
export class DefaultAIModelAdapterFactory implements AIModelAdapterFactory {
  private readonly modelConfigs: Record<string, ModelConfig>;

  constructor(modelConfigs: Record<string, ModelConfig>) {
    this.modelConfigs = modelConfigs || {};
  }

  public async createMLXAdapter(
    modelName: string,
    config: Record<string, any>,
  ): Promise<AIModelAdapter> {
    const parsed = ModelConfigSchema.parse({
      ...config,
      model: modelName,
      provider: ModelProvider.MLX,
    });
    return new MLXAdapter(modelName, parsed);
  }

  public async createOllamaAdapter(
    modelName: string,
    config: Record<string, any>,
  ): Promise<AIModelAdapter> {
    const parsed = ModelConfigSchema.parse({
      ...config,
      model: modelName,
      provider: ModelProvider.OLLAMA,
    });
    return new OllamaAdapter(modelName, parsed);
  }

  public async createAdapter(capability: AICapability, preferMLX = true): Promise<AIModelAdapter> {
    const entries = Object.entries(this.modelConfigs);
    if (entries.length === 0) throw new Error('No AI models configured');

    const mlxEntry = entries.find(([, cfg]) => cfg.provider === ModelProvider.MLX);
    if (preferMLX && mlxEntry) return this.createMLXAdapter(mlxEntry[0], mlxEntry[1] as any);

    const ollamaEntry = entries.find(([, cfg]) => cfg.provider === ModelProvider.OLLAMA);
    if (ollamaEntry) return this.createOllamaAdapter(ollamaEntry[0], ollamaEntry[1] as any);

    // fallback: instantiate first
    const [name, cfg] = entries[0];
    if (cfg.provider === ModelProvider.MLX) return this.createMLXAdapter(name, cfg as any);
    if (cfg.provider === ModelProvider.OLLAMA) return this.createOllamaAdapter(name, cfg as any);
    throw new Error('Unsupported provider in configuration');
  }
}

/**
 * Helper to build a DefaultAIModelAdapterFactory from a raw config object.
 */
export const createDefaultFactory = (rawConfig: Record<string, any> = {}) => {
  const validated: Record<string, ModelConfig> = {};
  for (const [name, cfg] of Object.entries(rawConfig)) {
    validated[name] = ModelConfigSchema.parse({ ...cfg, model: name });
  }
  return new DefaultAIModelAdapterFactory(validated);
};
