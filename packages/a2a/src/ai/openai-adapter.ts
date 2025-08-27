/**
 * @file OpenAI Model Adapter Implementation
 * @description Functional adapter for OpenAI models
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
 * OpenAI API request/response schemas
 */
const OpenAIMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const OpenAIRequestSchema = z.object({
  model: z.string(),
  messages: z.array(OpenAIMessageSchema),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  stream: z.boolean().default(false),
});

const OpenAIEmbeddingRequestSchema = z.object({
  model: z.string(),
  input: z.string(),
  encoding_format: z.enum(['float', 'base64']).default('float'),
});

/**
 * OpenAI Adapter state
 */
export interface OpenAIAdapterState {
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
 * Create OpenAI adapter
 */
export const createOpenAIAdapter = (config: ModelConfig): AIModelAdapter => {
  const state: OpenAIAdapterState = {
    config,
    client: axios.create({
      baseURL: config.endpoint || 'https://api.openai.com/v1',
      timeout: config.timeout,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
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

  const getName = (): string => `OpenAI-${state.config.model}`;

  const getVersion = (): string => '1.0.0';

  const isHealthy = async (): Promise<boolean> => {
    try {
      const response = await state.client.get('/models', { timeout: 5000 });
      state.stats.isAvailable = response.status === 200;

      // Check if our specific model is available
      const models = response.data.data || [];
      const modelExists = models.some((model: any) => model.id === state.config.model);

      state.stats.isAvailable = state.stats.isAvailable && modelExists;
      return state.stats.isAvailable;
    } catch (error) {
      console.warn(`OpenAI health check failed: ${getErrorMessage(error)}`);
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

      const openaiRequest = OpenAIRequestSchema.parse({
        model: state.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens || state.config.maxTokens,
        temperature: request.temperature || state.config.temperature,
      });

      const response = await state.client.post('/chat/completions', openaiRequest);
      const processingTime = Date.now() - startTime;

      state.stats.successfulRequests++;
      state.stats.totalResponseTime += processingTime;

      const content = response.data.choices[0]?.message?.content || '';
      const confidence = calculateConfidence(response.data);
      const tokensUsed = response.data.usage?.total_tokens || 0;

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

      throw new Error(`OpenAI generation failed: ${getErrorMessage(error)}`);
    }
  };

  const generateEmbedding = async (request: EmbeddingRequest): Promise<EmbeddingResponse> => {
    const startTime = Date.now();
    state.stats.totalRequests++;
    state.stats.lastUsed = new Date();

    try {
      const openaiRequest = OpenAIEmbeddingRequestSchema.parse({
        model: state.config.model,
        input: request.text,
      });

      const response = await state.client.post('/embeddings', openaiRequest);
      const processingTime = Date.now() - startTime;

      state.stats.successfulRequests++;
      state.stats.totalResponseTime += processingTime;

      const embedding = response.data.data[0]?.embedding || [];
      const dimensions = embedding.length;
      const tokensUsed = response.data.usage?.total_tokens || 0;

      state.stats.totalTokensUsed += tokensUsed;

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

      throw new Error(`OpenAI embedding failed: ${getErrorMessage(error)}`);
    }
  };

  const rerank = async (request: RerankingRequest): Promise<RerankingResponse> => {
    const startTime = Date.now();
    state.stats.totalRequests++;
    state.stats.lastUsed = new Date();

    try {
      // Use OpenAI's reranking model if available, otherwise fall back to generation
      if (state.config.model.includes('rerank')) {
        return await rerankWithAPI(request);
      } else {
        return await rerankWithGeneration(request);
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      state.stats.totalResponseTime += processingTime;

      throw new Error(`OpenAI reranking failed: ${getErrorMessage(error)}`);
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
    // OpenAI doesn't require special cleanup
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
    // Use logprobs or other metrics if available
    const usage = responseData.usage;
    if (usage?.completion_tokens && usage?.prompt_tokens) {
      // Simple heuristic: shorter responses with longer prompts tend to be more confident
      const ratio = usage.prompt_tokens / (usage.completion_tokens + usage.prompt_tokens);
      return Math.min(0.95, Math.max(0.1, ratio));
    }
    return 0.8; // Default confidence
  };

  const rerankWithAPI = async (request: RerankingRequest): Promise<RerankingResponse> => {
    // Implementation for OpenAI's reranking API
    const rerankRequest = {
      model: state.config.model,
      query: request.query,
      documents: request.items,
      top_n: request.topK || 10,
    };

    const response = await state.client.post('/rerank', rerankRequest);
    const processingTime = Date.now() - startTime;

    const rankedItems = response.data.results.map((result: any, index: number) => ({
      index: result.index,
      score: result.relevance_score,
      content: request.items[result.index],
    }));

    return RerankingResponseSchema.parse({
      rankedItems,
      modelUsed: getName(),
      processingTime,
      success: true,
    });
  };

  const rerankWithGeneration = async (request: RerankingRequest): Promise<RerankingResponse> => {
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
