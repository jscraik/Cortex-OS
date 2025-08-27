/**
 * @file Ollama Model Adapter Implementation
 * @description Adapter for Ollama models with fallback support
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
 * Ollama API request/response schemas
 */
const OllamaGenerateRequestSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  stream: z.boolean().default(false),
  options: z
    .object({
      temperature: z.number().optional(),
      num_predict: z.number().optional(),
    })
    .optional(),
});

const OllamaEmbedRequestSchema = z.object({
  model: z.string(),
  prompt: z.string(),
});

/**
 * Ollama Adapter state
 */
export interface OllamaAdapterState {
  config: ModelConfig;
  client: AxiosInstance;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    totalResponseTime: number;
    lastUsed: Date | null;
    isAvailable: boolean;
  };
}

/**
 * Create Ollama adapter
 */
export const createOllamaAdapter = (config: ModelConfig): AIModelAdapter => {
  const state: OllamaAdapterState = {
    config,
    client: axios.create({
      baseURL: config.endpoint,
      timeout: config.timeout,
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
    },
  };

  const getName = (): string => `Ollama-${state.config.model}`;

  const getVersion = (): string => '1.0.0';

  const isHealthy = async (): Promise<boolean> => {
    try {
      const response = await state.client.get('/api/tags', { timeout: 5000 });
      state.stats.isAvailable = response.status === 200;

      // Check if our specific model is available
      const models = response.data.models || [];
      const modelExists = models.some(
        (model: any) =>
          model.name === state.config.model || model.name.startsWith(state.config.model),
      );

      state.stats.isAvailable = state.stats.isAvailable && modelExists;
      return state.stats.isAvailable;
    } catch (error) {
      console.warn(`Ollama health check failed: ${getErrorMessage(error)}`);
      state.stats.isAvailable = false;
      return false;
    }
  };

  const generateText = async (request: AIRequest): Promise<AIResponse> => {
    const startTime = Date.now();
    state.stats.totalRequests++;
    state.stats.lastUsed = new Date();

    try {
      const fullPrompt = buildPrompt(request.capability, request.prompt);

      const ollamaRequest = OllamaGenerateRequestSchema.parse({
        model: state.config.model,
        prompt: fullPrompt,
        options: {
          temperature: request.temperature || state.config.temperature,
          num_predict: request.maxTokens || state.config.maxTokens,
        },
      });

      // Try once, retry on transient errors like model loading
      let attempts = 0;
      let response: any;
      const maxAttempts = 2;
      while (attempts < maxAttempts) {
        attempts++;
        try {
          response = await state.client.post('/api/generate', ollamaRequest, {
            timeout: (request as any).timeout || state.config.timeout,
            signal: (request as any).signal,
          });
          break;
        } catch (err) {
          const msg = getErrorMessage(err);
          const isTransient = /model is loading|Connection refused|ECONNREFUSED/i.test(msg);
          if (attempts >= maxAttempts || !isTransient) throw err;
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      const processingTime = Date.now() - startTime;

      state.stats.successfulRequests++;
      state.stats.totalResponseTime += processingTime;

      if (!response?.data || typeof response.data.response !== 'string') {
        throw new Error('Unexpected token');
      }
      const content = response.data.response || '';
      const confidence = calculateConfidence(response.data);

      return AIResponseSchema.parse({
        content,
        confidence,
        metadata: {
          usage: response.data,
          model: response.data.model,
        },
        modelUsed: getName(),
        processingTime,
        success: true,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      state.stats.totalResponseTime += processingTime;

      throw new Error(`Ollama generation failed: ${getErrorMessage(error)}`);
    }
  };

  const generateEmbedding = async (request: EmbeddingRequest): Promise<EmbeddingResponse> => {
    const startTime = Date.now();
    state.stats.totalRequests++;
    state.stats.lastUsed = new Date();

    try {
      const ollamaRequest = OllamaEmbedRequestSchema.parse({
        model: state.config.model,
        prompt: request.text,
      });

      const response = await state.client.post('/api/embeddings', ollamaRequest);
      const processingTime = Date.now() - startTime;

      state.stats.successfulRequests++;
      state.stats.totalResponseTime += processingTime;

      const embedding = response.data.embedding || [];
      const dimensions = embedding.length;

      return EmbeddingResponseSchema.parse({
        embedding,
        dimensions,
        modelUsed: getName(),
        processingTime,
        success: true,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      state.stats.totalResponseTime += processingTime;

      throw new Error(`Ollama embedding failed: ${getErrorMessage(error)}`);
    }
  };

  const rerank = async (request: RerankingRequest): Promise<RerankingResponse> => {
    const startTime = Date.now();
    state.stats.totalRequests++;
    state.stats.lastUsed = new Date();

    try {
      // For reranking, we'll use the chat API with a specialized prompt
      const rerankPrompt = buildRerankPrompt(request.query, request.items);

      const chatRequest: AIRequest = {
        prompt: rerankPrompt,
        capability: 'priority_ranking' as any,
        maxTokens: 2048,
        temperature: 0.1,
      };

      const response = await generateText(chatRequest);
      const processingTime = Date.now() - startTime;

      // Parse the reranking response
      const rankedItems = parseRerankingResponse(response.content, request.items);

      return RerankingResponseSchema.parse({
        rankedItems: rankedItems.slice(0, request.topK || 10),
        modelUsed: getName(),
        processingTime,
        success: true,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      state.stats.totalResponseTime += processingTime;

      throw new Error(`Ollama reranking failed: ${getErrorMessage(error)}`);
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
    // Ollama doesn't require special cleanup
  };

  const buildPrompt = (capability: string, userPrompt: string): string => {
    switch (capability) {
      case 'semantic_routing':
        return `You are an expert at analyzing message content and determining optimal routing strategies for agent-to-agent communication. Respond with clear, actionable routing decisions.\n\n${userPrompt}`;

      case 'message_validation':
        return `You are a security expert specializing in message validation and anomaly detection. Analyze the content for potential issues and respond with validation results.\n\n${userPrompt}`;

      case 'load_balancing':
        return `You are a load balancing specialist. Analyze message complexity and agent workloads to make optimal distribution decisions.\n\n${userPrompt}`;

      case 'priority_ranking':
        return `You are an expert at ranking and prioritizing items based on relevance, urgency, and business value. Provide clear ranking rationale.\n\n${userPrompt}`;

      default:
        return `You are a helpful AI assistant specialized in agent-to-agent communication processing.\n\n${userPrompt}`;
    }
  };

  const calculateConfidence = (responseData: any): number => {
    // Use response length and other metrics if available
    const response = responseData.response || '';
    if (response.length > 10) {
      // Simple heuristic: longer responses tend to be more confident
      const ratio = Math.min(response.length / 100, 1);
      return Math.max(0.1, ratio);
    }
    return 0.8; // Default confidence
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
      // Extract indices from response
      const indices = response
        .trim()
        .split(/[,\s]+/)
        .map((idx) => parseInt(idx.trim()))
        .filter((idx) => !isNaN(idx) && idx >= 0 && idx < originalItems.length);

      return indices.map((index, rank) => ({
        index,
        score: 1.0 - rank / indices.length, // Higher score for higher rank
        content: originalItems[index],
      }));
    } catch (error) {
      console.warn(`Failed to parse reranking response: ${getErrorMessage(error)}`);
      // Fallback: return original order
      return originalItems.map((content, index) => ({
        index,
        score: 1.0 - index / originalItems.length,
        content,
      }));
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof AxiosError) {
      const msg = error.response?.data?.error || error.message;
      if (/timeout/i.test(msg)) return 'Timeout';
      if (/abort|canceled|request aborted|Request aborted/i.test(msg)) return 'Request aborted';
      return msg;
    }
    if (error instanceof Error) {
      const msg = error.message;
      if (/timeout/i.test(msg)) return 'Timeout';
      if (/abort|canceled|request aborted|Request aborted/i.test(msg)) return 'Request aborted';
      return msg;
    }
    return 'Unknown error';
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
