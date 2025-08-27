/**
 * @file_path packages/model-gateway/src/adapters/ollama-adapter.ts
 * Ollama adapter for model gateway - interfaces with Ollama API
 */

import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// Ollama API schemas
const OllamaEmbeddingRequestSchema = z.object({
  model: z.string(),
  prompt: z.string(),
});

const OllamaEmbeddingResponseSchema = z.object({
  embedding: z.array(z.number()),
});

const OllamaChatRequestSchema = z.object({
  model: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    }),
  ),
  stream: z.boolean().default(false),
  options: z
    .object({
      temperature: z.number().optional(),
      num_predict: z.number().optional(),
      top_p: z.number().optional(),
      top_k: z.number().optional(),
    })
    .optional(),
});

const OllamaChatResponseSchema = z.object({
  message: z.object({
    role: z.string(),
    content: z.string(),
  }),
  done: z.boolean(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional(),
});

const OllamaRerankRequestSchema = z.object({
  model: z.string(),
  query: z.string(),
  documents: z.array(z.string()),
});

const OllamaRerankResponseSchema = z.object({
  rankings: z.array(
    z.object({
      index: z.number(),
      score: z.number(),
    }),
  ),
});

// Model gateway response schemas
const GatewayEmbeddingResponseSchema = z.object({
  embedding: z.array(z.number()),
  model: z.string(),
  usage: z
    .object({
      tokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
});

const GatewayChatResponseSchema = z.object({
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

const GatewayRerankResponseSchema = z.object({
  scores: z.array(z.number()),
  model: z.string(),
  usage: z
    .object({
      tokens: z.number(),
      cost: z.number().optional(),
    })
    .optional(),
});

export type OllamaEmbeddingRequest = z.infer<typeof OllamaEmbeddingRequestSchema>;
export type OllamaEmbeddingResponse = z.infer<typeof OllamaEmbeddingResponseSchema>;
export type OllamaChatRequest = z.infer<typeof OllamaChatRequestSchema>;
export type OllamaChatResponse = z.infer<typeof OllamaChatResponseSchema>;
export type OllamaRerankRequest = z.infer<typeof OllamaRerankRequestSchema>;
export type OllamaRerankResponse = z.infer<typeof OllamaRerankResponseSchema>;

export type GatewayEmbeddingResponse = z.infer<typeof GatewayEmbeddingResponseSchema>;
export type GatewayChatResponse = z.infer<typeof GatewayChatResponseSchema>;
export type GatewayRerankResponse = z.infer<typeof GatewayRerankResponseSchema>;

/**
 * Ollama Adapter for model gateway
 */
export class OllamaAdapter {
  private readonly client: AxiosInstance;
  private readonly baseURL: string;

  constructor(baseURL: string = 'http://localhost:11434') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 60000, // 60 seconds for potentially long-running requests
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate embeddings using Ollama
   */
  async generateEmbedding(
    text: string,
    model: string = 'nomic-embed-text',
  ): Promise<GatewayEmbeddingResponse> {
    try {
      const request = OllamaEmbeddingRequestSchema.parse({
        model,
        prompt: text,
      });

      const response = await this.client.post('/api/embeddings', request);
      const embeddingData = OllamaEmbeddingResponseSchema.parse(response.data);

      return GatewayEmbeddingResponseSchema.parse({
        embedding: embeddingData.embedding,
        model,
        usage: {
          tokens: this.estimateTokenCount(text),
          cost: 0, // Local Ollama has no API cost
        },
      });
    } catch (error) {
      console.error('Ollama embedding generation failed:', error);
      throw new Error(
        `Ollama embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate multiple embeddings in batch
   */
  async generateEmbeddings(
    texts: string[],
    model: string = 'nomic-embed-text',
  ): Promise<GatewayEmbeddingResponse[]> {
    // Ollama doesn't have a native batch API, so we'll process sequentially
    const results: GatewayEmbeddingResponse[] = [];

    for (const text of texts) {
      const result = await this.generateEmbedding(text, model);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate chat completion using Ollama
   */
  async generateChat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string = 'llama2',
    options?: { temperature?: number; max_tokens?: number },
  ): Promise<GatewayChatResponse> {
    try {
      const request = OllamaChatRequestSchema.parse({
        model,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature,
          num_predict: options?.max_tokens,
        },
      });

      const response = await this.client.post('/api/chat', request);
      const chatData = OllamaChatResponseSchema.parse(response.data);

      const promptTokens = messages.reduce(
        (sum, msg) => sum + this.estimateTokenCount(msg.content),
        0,
      );
      const completionTokens = this.estimateTokenCount(chatData.message.content);

      return GatewayChatResponseSchema.parse({
        content: chatData.message.content,
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          cost: 0,
        },
      });
    } catch (error) {
      console.error('Ollama chat generation failed:', error);
      throw new Error(
        `Ollama chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Rerank documents using Ollama
   * Note: This uses a simple approach since Ollama doesn't have native reranking
   * In production, you'd want to use a dedicated reranking model
   */
  async rerank(
    query: string,
    documents: string[],
    model: string = 'nomic-embed-text',
  ): Promise<GatewayRerankResponse> {
    try {
      // Generate embeddings for query and all documents
      const [queryEmbedding, ...documentEmbeddings] = await Promise.all([
        this.generateEmbedding(query, model),
        ...documents.map((doc) => this.generateEmbedding(doc, model)),
      ]);

      // Calculate cosine similarity scores
      const scores = documentEmbeddings.map((docEmbedding) => {
        return this.cosineSimilarity(queryEmbedding.embedding, docEmbedding.embedding);
      });

      const totalTokens =
        this.estimateTokenCount(query) +
        documents.reduce((sum, doc) => sum + this.estimateTokenCount(doc), 0);

      return GatewayRerankResponseSchema.parse({
        scores,
        model,
        usage: {
          tokens: totalTokens,
          cost: 0,
        },
      });
    } catch (error) {
      console.error('Ollama reranking failed:', error);
      throw new Error(
        `Ollama reranking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if Ollama is available and has the specified model
   */
  async isAvailable(model?: string): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags', {
        timeout: 2000, // 2 second timeout to prevent long hangs
        validateStatus: () => true, // Accept any status code
      });

      if (response.status !== 200) {
        console.log(`Ollama not available: Status ${response.status}`);
        return false;
      }

      const models = response.data?.models || [];

      if (model) {
        return models.some((m: any) => m.name === model || m.name.startsWith(model));
      }

      return models.length > 0;
    } catch (error) {
      console.log(
        `Ollama not available: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      return models.map((m: any) => m.name);
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for most models
    return Math.ceil(text.length / 4);
  }
}
