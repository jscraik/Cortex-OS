/**
 * @file Cohere Model Adapter Implementation
 * @description Functional adapter for Cohere models
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
 * Cohere API request/response schemas
 */
const CohereMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const CohereGenerateRequestSchema = z.object({
  model: z.string(),
  message: z.string(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  k: z.number().optional(),
  p: z.number().optional(),
});

const CohereEmbeddingRequestSchema = z.object({
  texts: z.array(z.string()),
  model: z.string(),
  input_type: z
    .enum(['search_document', 'search_query', 'classification', 'clustering'])
    .default('search_document'),
});

/**
 * Cohere Adapter state
 */
export interface CohereAdapterState {
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
 * Create Cohere adapter
 */
export const createCohereAdapter = (config: ModelConfig): AIModelAdapter => {
  const state: CohereAdapterState = {
    config,
    client: axios.create({
      baseURL: config.endpoint || 'https://api.cohere.ai',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
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

  const getName = (): string => `Cohere-${state.config.model}`;

  const getVersion = (): string => '1.0.0';

  const isHealthy = async (): Promise<boolean> => {
    try {
      const startTime = Date.now();
      const response = await state.client.get('/v1/models', { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      state.stats.isAvailable = response.status === 200;
      state.stats.lastUsed = new Date();
      state.stats.totalResponseTime += responseTime;
      return state.stats.isAvailable;
    } catch (error) {
      console.warn(`Cohere health check failed: ${getErrorMessage(error)}`);
      state.stats.isAvailable = false;
      return false;
    }
  };

  const generateText = async (request: AIRequest): Promise<AIResponse> => {
    const startTime = Date.now();
    state.stats.totalRequests++;

    try {
      const systemPrompt = getSystemPrompt(request.capability);

      const cohereRequest = CohereGenerateRequestSchema.parse({
        model: state.config.model,
        message: systemPrompt ? `${systemPrompt}\n\n${request.prompt}` : request.prompt,
        max_tokens: request.maxTokens || state.config.maxTokens || 2048,
        temperature: request.temperature || state.config.temperature || 0.7,
      });

      const response = await state.client.post('/v1/chat', cohereRequest, {
        timeout: request.timeout || state.config.timeout,
      });

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
          provider: 'cohere',
        },
        modelUsed: getName(),
        processingTime: responseTime,
        success: true,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      state.stats.totalResponseTime += responseTime;

      console.error(`Cohere generateText failed: ${getErrorMessage(error)}`);
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
      const embeddingRequest = CohereEmbeddingRequestSchema.parse({
        texts: [request.text],
        model: state.config.model,
        input_type: 'search_document',
      });

      const response = await state.client.post('/v1/embed', embeddingRequest, {
        timeout: request.timeout || state.config.timeout,
      });

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

      console.error(`Cohere generateEmbedding failed: ${getErrorMessage(error)}`);
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
    // Cohere has a native reranking API
    const startTime = Date.now();
    state.stats.totalRequests++;

    try {
      const rerankRequest = {
        model: state.config.model,
        query: request.query,
        documents: request.items,
        top_n: request.topK || 10,
      };

      const response = await state.client.post('/v1/rerank', rerankRequest, {
        timeout: request.timeout || state.config.timeout,
      });

      const responseTime = Date.now() - startTime;
      state.stats.totalResponseTime += responseTime;
      state.stats.successfulRequests++;
      state.stats.lastUsed = new Date();

      const rankedItems = response.data.results.map((result: any) => ({
        index: result.index,
        score: result.relevance_score,
        content: request.items[result.index],
      }));

      return RerankingResponseSchema.parse({
        rankedItems,
        modelUsed: getName(),
        processingTime: responseTime,
        success: true,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      state.stats.totalResponseTime += responseTime;

      console.error(`Cohere rerank failed: ${getErrorMessage(error)}`);
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
    // Cohere models don't require special cleanup
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
      return data.text || '';
    } catch (error) {
      console.warn(`Failed to extract Cohere content: ${getErrorMessage(error)}`);
      return '';
    }
  };

  const extractEmbedding = (data: any): number[] => {
    try {
      return data.embeddings?.[0] || [];
    } catch (error) {
      console.warn(`Failed to extract Cohere embedding: ${getErrorMessage(error)}`);
      return [];
    }
  };

  const calculateConfidence = (data: any): number => {
    // Cohere doesn't provide confidence scores, use likelihood if available
    try {
      const likelihood = data.likelihood;
      if (typeof likelihood === 'number') {
        return Math.max(0.1, Math.min(0.95, likelihood));
      }
      return 0.8;
    } catch {
      return 0.8;
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof AxiosError) {
      return error.response?.data?.message || error.response?.data?.error || error.message;
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
