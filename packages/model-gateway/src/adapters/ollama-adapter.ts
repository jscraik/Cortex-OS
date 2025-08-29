/**
 * @file_path packages/model-gateway/src/adapters/ollama-adapter.ts
 * Ollama adapter for model gateway - interfaces with Ollama API
 */

import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import { estimateTokenCount, cosineSimilarity } from '../../../../src/lib/math.js';

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

export interface OllamaAdapter {
  generateEmbedding(text: string, model?: string): Promise<GatewayEmbeddingResponse>;
  generateEmbeddings(texts: string[], model?: string): Promise<GatewayEmbeddingResponse[]>;
  generateChat(request: OllamaChatRequest): Promise<GatewayChatResponse>;
  rerank(query: string, documents: string[], model?: string): Promise<GatewayRerankResponse>;
  isAvailable(model?: string): Promise<boolean>;
  listModels(): Promise<string[]>;
}

/**
 * Factory to create an Ollama adapter
 */
export function createOllamaAdapter(baseURL: string = 'http://localhost:11434'): OllamaAdapter {
  const client: AxiosInstance = axios.create({
    baseURL,
    timeout: 60000, // 60 seconds for potentially long-running requests
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const generateEmbedding = async (
    text: string,
    model: string = 'nomic-embed-text',
  ): Promise<GatewayEmbeddingResponse> => {
    try {
      const response = await client.post('/api/embeddings', {
        model,
        prompt: text,
      });
      const data = OllamaEmbeddingResponseSchema.parse(response.data);
      return GatewayEmbeddingResponseSchema.parse({
        embedding: data.embedding,
        model,
        usage: {
          tokens: estimateTokenCount(text),
          cost: 0,
        },
      });
    } catch (error) {
      console.error('Ollama embedding failed:', error);
      throw new Error(
        `Ollama embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const generateEmbeddings = async (
    texts: string[],
    model?: string,
  ): Promise<GatewayEmbeddingResponse[]> => {
    return Promise.all(texts.map((t) => generateEmbedding(t, model)));
  };

  const generateChat = async (request: OllamaChatRequest): Promise<GatewayChatResponse> => {
    try {
      const response = await client.post('/api/chat', {
        ...request,
      });
      const data = OllamaChatResponseSchema.parse(response.data);
      const promptTokens = request.messages
        .map((m) => estimateTokenCount(m.content))
        .reduce((a, b) => a + b, 0);
      const completionTokens = estimateTokenCount(data.message.content);
      return GatewayChatResponseSchema.parse({
        content: data.message.content,
        model: request.model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          cost: 0,
        },
      });
    } catch (error) {
      console.error('Ollama chat failed:', error);
      throw new Error(
        `Ollama chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const rerank = async (
    query: string,
    documents: string[],
    model: string = 'nomic-embed-text',
  ): Promise<GatewayRerankResponse> => {
    try {
      const [queryEmbedding, ...documentEmbeddings] = await Promise.all([
        generateEmbedding(query, model),
        ...documents.map((doc) => generateEmbedding(doc, model)),
      ]);
      const scores = documentEmbeddings.map((docEmbedding) =>
        cosineSimilarity(queryEmbedding.embedding, docEmbedding.embedding),
      );
      const totalTokens =
        estimateTokenCount(query) +
        documents.reduce((sum, doc) => sum + estimateTokenCount(doc), 0);
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
  };

  const isAvailable = async (model?: string): Promise<boolean> => {
    try {
      const response = await client.get('/api/tags', {
        timeout: 2000,
        validateStatus: () => true,
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
  };

  const listModels = async (): Promise<string[]> => {
    try {
      const response = await client.get('/api/tags');
      const models = response.data.models || [];
      return models.map((m: any) => m.name);
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  };

  return {
    generateEmbedding,
    generateEmbeddings,
    generateChat,
    rerank,
    isAvailable,
    listModels,
  };
}
