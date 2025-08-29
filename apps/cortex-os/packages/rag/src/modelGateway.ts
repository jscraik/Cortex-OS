/**
 * @file_path src/rag/modelGateway.ts
 * HTTP client for model gateway integration with RAG pipeline.
 * Handles embeddings, reranking, and chat requests with policy enforcement.
 */

import { z } from 'zod';

// Model gateway response schemas
const EmbeddingResponseSchema = z.object({
  embedding: z.array(z.number()),
  model: z.string(),
  usage: z
    .object({
      tokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
});

const BatchEmbeddingResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())),
  modelUsed: z.string(),
  dimensions: z.number().optional(),
});

const RerankResponseSchema = z.object({
  scores: z.array(z.number()),
  model: z.string(),
  usage: z
    .object({
      tokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
});

const ChatResponseSchema = z.object({
  content: z.string(),
  model: z.string(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
});

export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;
export type RerankResponse = z.infer<typeof RerankResponseSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// Model gateway client configuration
export interface ModelGatewayConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

/**
 * HTTP client for model gateway integration
 */
export class ModelGatewayClient {
  private readonly config: Required<ModelGatewayConfig>;

  constructor(config: ModelGatewayConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config,
    };
  }

  /**
   * Generate embeddings for text using model gateway
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    const response = await this.request('/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts: [text] }),
    });

    const parsed = BatchEmbeddingResponseSchema.parse(response);
    return { embedding: parsed.embeddings[0], model: parsed.modelUsed };
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResponse[]> {
    const response = await this.request('/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts }),
    });

    const parsed = BatchEmbeddingResponseSchema.parse(response);
    return parsed.embeddings.map((embedding) => ({ embedding, model: parsed.modelUsed }));
  }

  /**
   * Rerank documents based on query
   */
  async rerank(query: string, documents: string[]): Promise<RerankResponse> {
    const response = await this.request('/rerank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, documents }),
    });

    return RerankResponseSchema.parse(response);
  }

  /**
   * Generate chat completion
   */
  async chat(messages: Array<{ role: string; content: string }>): Promise<ChatResponse> {
    const response = await this.request('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    return ChatResponseSchema.parse(response);
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request(endpoint: string, options: RequestInit): Promise<unknown> {
    const url = `${this.config.baseUrl}${endpoint}`;

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        const isLastAttempt = attempt === this.config.retries;
        const isRetryableError =
          error instanceof Error &&
          (error.name === 'AbortError' ||
            error.message.includes('fetch') ||
            error.message.includes('network'));

        if (isLastAttempt || !isRetryableError) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Request failed after all retries');
  }
}

/**
 * Create model gateway client from environment or config
 */
export function createModelGatewayClient(config?: Partial<ModelGatewayConfig>): ModelGatewayClient {
  const baseUrl = config?.baseUrl || process.env.MODEL_GATEWAY_URL || 'http://localhost:3001';

  return new ModelGatewayClient({
    baseUrl,
    timeout: config?.timeout,
    retries: config?.retries,
  });
}
