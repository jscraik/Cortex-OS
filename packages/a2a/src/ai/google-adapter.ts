/**
 * @file Google Model Adapter Implementation
 * @description Functional adapter for Google Gemini models
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import { z } from 'zod';
import {
  AIModelAdapter,
  AIRequest,
  AIResponse,
  AIResponseSchema,
  EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingResponseSchema,
  RerankingRequest,
  RerankingResponse,
  RerankingResponseSchema,
} from './adapter.js';
import { ModelConfig } from './config.js';

/**
 * Google Gemini API request/response schemas
 */
const GoogleMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(
    z.object({
      text: z.string(),
    }),
  ),
});

const GoogleGenerateRequestSchema = z.object({
  contents: z.array(GoogleMessageSchema),
  generationConfig: z
    .object({
      temperature: z.number().optional(),
      maxOutputTokens: z.number().optional(),
      topP: z.number().optional(),
      topK: z.number().optional(),
    })
    .optional(),
});

const GoogleEmbeddingRequestSchema = z.object({
  content: z.object({
    parts: z.array(
      z.object({
        text: z.string(),
      }),
    ),
  }),
});

/**
 * Google Adapter state
 */
export interface GoogleAdapterState {
  config: ModelConfig;
  client: AxiosInstance;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    totalResponseTime: number;
    lastUsed: Date | null;
    isAvailable: boolean;
    totalTokensUsed: number;
  };
}

/**
 * Create Google Gemini adapter
 */
export const createGoogleAdapter = (config: ModelConfig): AIModelAdapter => {
  const state: GoogleAdapterState = {
    config,
    client: axios.create({
      baseURL: config.endpoint || 'https://generativelanguage.googleapis.com',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    stats: {
      totalRequests: 0,
      successfulRequests: 0,
      totalResponseTime: 0,
      lastUsed: null,
      isAvailable: true,
      totalTokensUsed: 0,
    },
  };

  const getName = (): string => `Google-${state.config.model}`;

  const getVersion = (): string => '1.0.0';

  const isHealthy = async (): Promise<boolean> => {
    try {
      const startTime = Date.now();
      const response = await state.client.get(`/v1beta/models/${state.config.model}`, {
        headers: {
          'x-goog-api-key': state.config.apiKey,
        },
        timeout: 5000,
      });
      const responseTime = Date.now() - startTime;

      state.stats.isAvailable = response.status === 200;
      state.stats.lastUsed = new Date();
      state.stats.totalResponseTime += responseTime;
      return state.stats.isAvailable;
    } catch (error) {
      console.warn(`Google health check failed: ${getErrorMessage(error)}`);
      state.stats.isAvailable = false;
      return false;
    }
  };

  const generateText = async (request: AIRequest): Promise<AIResponse> => {
    const startTime = Date.now();
    state.stats.totalRequests++;

    try {
      const systemPrompt = getSystemPrompt(request.capability);

      const geminiRequest = GoogleGenerateRequestSchema.parse({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt ? `${systemPrompt}\n\n${request.prompt}` : request.prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: request.temperature || state.config.temperature || 0.7,
          maxOutputTokens: request.maxTokens || state.config.maxTokens || 2048,
        },
      });

      const response = await state.client.post(
        `/v1beta/models/${state.config.model}:generateContent`,
        geminiRequest,
        {
          headers: {
            'x-goog-api-key': state.config.apiKey,
          },
          timeout: request.timeout || state.config.timeout,
        },
      );

      const responseTime = Date.now() - startTime;
      state.stats.totalResponseTime += responseTime;
      state.stats.successfulRequests++;
      state.stats.lastUsed = new Date();

      const content = extractContent(response.data);
      const confidence = calculateConfidence(response.data);

      return AIResponseSchema.parse({
        content,
        confidence,
        metadata: {
          model: state.config.model,
          provider: 'google',
        },
        modelUsed: getName(),
        processingTime: responseTime,
        success: true,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      state.stats.totalResponseTime += responseTime;

      console.error(`Google generateText failed: ${getErrorMessage(error)}`);
      return AIResponseSchema.parse({
        content: '',
        confidence: 0,
        metadata: { error: getErrorMessage(error) },
        modelUsed: getName(),
        processingTime: responseTime,
        success: false,
      });
    }
  };

  const generateEmbedding = async (request: EmbeddingRequest): Promise<EmbeddingResponse> => {
    const startTime = Date.now();
    state.stats.totalRequests++;

    try {
      const embeddingRequest = GoogleEmbeddingRequestSchema.parse({
        content: {
          parts: [{ text: request.text }],
        },
      });

      const response = await state.client.post(
        `/v1beta/models/${state.config.model}:embedContent`,
        embeddingRequest,
        {
          headers: {
            'x-goog-api-key': state.config.apiKey,
          },
          timeout: request.timeout || state.config.timeout,
        },
      );

      const responseTime = Date.now() - startTime;
      state.stats.totalResponseTime += responseTime;
      state.stats.successfulRequests++;
      state.stats.lastUsed = new Date();

      const embedding = extractEmbedding(response.data);

      return EmbeddingResponseSchema.parse({
        embedding,
        dimensions: embedding.length,
        modelUsed: getName(),
        processingTime: responseTime,
        success: true,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      state.stats.totalResponseTime += responseTime;

      console.error(`Google generateEmbedding failed: ${getErrorMessage(error)}`);
      return EmbeddingResponseSchema.parse({
        embedding: [],
        dimensions: 0,
        modelUsed: getName(),
        processingTime: responseTime,
        success: false,
      });
    }
  };

  const rerank = async (request: RerankingRequest): Promise<RerankingResponse> => {
    // Google doesn't have a native reranking API, so we'll use generation
    const startTime = Date.now();
    state.stats.totalRequests++;

    try {
      const rerankPrompt = buildRerankPrompt(request.query, request.items);

      const genRequest: AIRequest = {
        prompt: rerankPrompt,
        capability: 'priority_ranking' as any,
        maxTokens: 2048,
        temperature: 0.1,
      };

      const response = await generateText(genRequest);
      const responseTime = Date.now() - startTime;

      if (!response.success) {
        throw new Error('Generation failed for reranking');
      }

      const rankedItems = parseRerankingResponse(response.content, request.items);

      state.stats.successfulRequests++;
      state.stats.lastUsed = new Date();

      return RerankingResponseSchema.parse({
        rankedItems: rankedItems.slice(0, request.topK || 10),
        modelUsed: getName(),
        processingTime: responseTime,
        success: true,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      state.stats.totalResponseTime += responseTime;

      console.error(`Google rerank failed: ${getErrorMessage(error)}`);
      return RerankingResponseSchema.parse({
        rankedItems: [],
        modelUsed: getName(),
        processingTime: responseTime,
        success: false,
      });
    }
  };

  const getStats = () => ({
    totalRequests: state.stats.totalRequests,
    successfulRequests: state.stats.successfulRequests,
    averageResponseTime:
      state.stats.totalRequests > 0 ? state.stats.totalResponseTime / state.stats.totalRequests : 0,
    lastUsed: state.stats.lastUsed,
    isAvailable: state.stats.isAvailable,
  });

  const cleanup = async (): Promise<void> => {
    // Google models don't require special cleanup
    state.stats.isAvailable = false;
  };

  const getSystemPrompt = (capability: string): string => {
    switch (capability) {
      case 'semantic_routing':
        return 'You are an expert at analyzing message content and determining optimal routing strategies for agent-to-agent communication.';
      case 'message_validation':
        return 'You are a security expert specializing in message validation and anomaly detection.';
      case 'load_balancing':
        return 'You are a load balancing specialist analyzing message complexity and agent workloads.';
      case 'priority_ranking':
        return 'You are an expert at ranking and prioritizing items based on relevance and urgency.';
      default:
        return 'You are a helpful AI assistant specialized in agent-to-agent communication processing.';
    }
  };

  const extractContent = (data: any): string => {
    try {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      console.warn(`Failed to extract Google content: ${getErrorMessage(error)}`);
      return '';
    }
  };

  const extractEmbedding = (data: any): number[] => {
    try {
      return data.embedding?.values || [];
    } catch (error) {
      console.warn(`Failed to extract Google embedding: ${getErrorMessage(error)}`);
      return [];
    }
  };

  const calculateConfidence = (data: any): number => {
    // Google doesn't provide confidence scores, use completion status
    try {
      const finishReason = data.candidates?.[0]?.finishReason;
      return finishReason === 'STOP' ? 0.9 : 0.7;
    } catch {
      return 0.8;
    }
  };

  const buildRerankPrompt = (query: string, items: string[]): string => {
    const itemsList = items.map((item, index) => `${index}: ${item}`).join('\n');

    return `Rank the following items by relevance to the query "${query}".
Return only the indices in order of relevance (most relevant first), separated by commas.

Items:
${itemsList}

Ranking (indices only):`;
  };

  const parseRerankingResponse = (response: string, originalItems: string[]) => {
    try {
      const indices = response
        .trim()
        .split(/[,\s]+/)
        .map((idx) => parseInt(idx.trim()))
        .filter((idx) => !isNaN(idx) && idx >= 0 && idx < originalItems.length);

      return indices.map((index, rank) => ({
        index,
        score: 1.0 - rank / indices.length,
        content: originalItems[index],
      }));
    } catch (error) {
      console.warn(`Failed to parse Google reranking response: ${getErrorMessage(error)}`);
      return originalItems.map((content, index) => ({
        index,
        score: 1.0 - index / originalItems.length,
        content,
      }));
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof AxiosError) {
      return error.response?.data?.error?.message || error.response?.data?.error || error.message;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  };

  return {
    getName,
    getVersion,
    isHealthy,
    generateText,
    generateEmbedding,
    rerank,
    getStats,
    cleanup,
  };
};
