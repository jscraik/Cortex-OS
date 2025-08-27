/**
 * @file Anthropic Model Adapter Implementation
 * @description Functional adapter for Anthropic models
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
  RerankingRequest,
  RerankingResponse,
  RerankingResponseSchema,
} from './adapter.js';
import { ModelConfig } from './config.js';

/**
 * Anthropic API request/response schemas
 */
const AnthropicMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const AnthropicRequestSchema = z.object({
  model: z.string(),
  max_tokens: z.number(),
  messages: z.array(AnthropicMessageSchema),
  temperature: z.number().optional(),
});

/**
 * Anthropic Adapter state
 */
export interface AnthropicAdapterState {
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
 * Create Anthropic adapter
 */
export const createAnthropicAdapter = (config: ModelConfig): AIModelAdapter => {
  const state: AnthropicAdapterState = {
    config,
    client: axios.create({
      baseURL: config.endpoint || 'https://api.anthropic.com/v1',
      timeout: config.timeout,
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
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

  const getName = (): string => `Anthropic-${state.config.model}`;

  const getVersion = (): string => '1.0.0';

  const isHealthy = async (): Promise<boolean> => {
    try {
      // Simple health check - Anthropic doesn't have a models endpoint
      const response = await state.client.post(
        '/messages',
        {
          model: state.config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        },
        { timeout: 5000 },
      );

      state.stats.isAvailable = response.status === 200;
      return state.stats.isAvailable;
    } catch (error) {
      console.warn(`Anthropic health check failed: ${getErrorMessage(error)}`);
      state.stats.isAvailable = false;
      return false;
    }
  };

  const generateText = async (request: AIRequest): Promise<AIResponse> => {
    const startTime = Date.now();
    state.stats.totalRequests++;
    state.stats.lastUsed = new Date();

    try {
      const systemPrompt = getSystemPrompt(request.capability);

      const anthropicRequest = AnthropicRequestSchema.parse({
        model: state.config.model,
        max_tokens: request.maxTokens || state.config.maxTokens,
        messages: [{ role: 'user', content: `${systemPrompt}\n\n${request.prompt}` }],
        temperature: request.temperature || state.config.temperature,
      });

      const response = await state.client.post('/messages', anthropicRequest);
      const processingTime = Date.now() - startTime;

      state.stats.successfulRequests++;
      state.stats.totalResponseTime += processingTime;

      const content = response.data.content[0]?.text || '';
      const confidence = calculateConfidence(response.data);
      const tokensUsed =
        response.data.usage?.input_tokens + response.data.usage?.output_tokens || 0;

      state.stats.totalTokensUsed += tokensUsed;

      return AIResponseSchema.parse({
        content,
        confidence,
        metadata: {
          usage: response.data.usage,
          model: response.data.model,
        },
        modelUsed: getName(),
        processingTime,
        success: true,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      state.stats.totalResponseTime += processingTime;

      throw new Error(`Anthropic generation failed: ${getErrorMessage(error)}`);
    }
  };

  const generateEmbedding = async (request: EmbeddingRequest): Promise<EmbeddingResponse> => {
    // Anthropic doesn't have a dedicated embedding API
    // This would need to be implemented with a third-party embedding service
    throw new Error('Anthropic does not support embeddings directly');
  };

  const rerank = async (request: RerankingRequest): Promise<RerankingResponse> => {
    const startTime = Date.now();
    state.stats.totalRequests++;
    state.stats.lastUsed = new Date();

    try {
      // Fall back to using generation for reranking
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

      throw new Error(`Anthropic reranking failed: ${getErrorMessage(error)}`);
    }
  };

  const getStats = () => ({
    totalRequests: state.stats.totalRequests,
    successfulRequests: state.stats.successfulRequests,
    averageResponseTime:
      state.stats.totalRequests > 0 ? state.stats.totalResponseTime / state.stats.totalRequests : 0,
    lastUsed: state.stats.lastUsed,
    isAvailable: state.stats.isAvailable,
    totalTokensUsed: state.stats.totalTokensUsed,
  });

  const cleanup = async (): Promise<void> => {
    // Anthropic doesn't require special cleanup
  };

  const getSystemPrompt = (capability: string): string => {
    switch (capability) {
      case 'semantic_routing':
        return 'You are an expert at analyzing message content and determining optimal routing strategies for agent-to-agent communication. Respond with clear, actionable routing decisions.';

      case 'message_validation':
        return 'You are a security expert specializing in message validation and anomaly detection. Analyze the content for potential issues and respond with validation results.';

      case 'load_balancing':
        return 'You are a load balancing specialist. Analyze message complexity and agent workloads to make optimal distribution decisions.';

      case 'priority_ranking':
        return 'You are an expert at ranking and prioritizing items based on relevance, urgency, and business value. Provide clear ranking rationale.';

      default:
        return 'You are a helpful AI assistant specialized in agent-to-agent communication processing.';
    }
  };

  const calculateConfidence = (responseData: any): number => {
    // Use usage metrics if available
    const usage = responseData.usage;
    if (usage?.input_tokens && usage?.output_tokens) {
      // Simple heuristic: higher input to output ratio tends to be more confident
      const ratio = usage.input_tokens / (usage.input_tokens + usage.output_tokens);
      return Math.min(0.95, Math.max(0.1, ratio));
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
      return error.response?.data?.error?.message || error.message;
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
