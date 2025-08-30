/**
 * @file_path packages/model-gateway/src/adapters/frontier-adapter.ts
 * Frontier API adapter for model gateway - interfaces with Claude/OpenAI APIs as ultimate fallback
 */

import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// Frontier API schemas
const FrontierEmbeddingRequestSchema = z.object({
  model: z.string(),
  input: z.union([z.string(), z.array(z.string())]),
});

const FrontierEmbeddingResponseSchema = z.object({
  data: z.array(z.object({
    embedding: z.array(z.number()),
    index: z.number(),
  })),
  model: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

const FrontierChatRequestSchema = z.object({
  model: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    }),
  ),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  stream: z.boolean().default(false),
});

const FrontierChatResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      role: z.string(),
      content: z.string(),
    }),
    finish_reason: z.string(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
  model: z.string(),
});

// Gateway response schemas
const GatewayEmbeddingResponseSchema = z.object({
  embedding: z.array(z.number()),
  model: z.string(),
  usage: z.object({
    tokens: z.number(),
    cost: z.number(),
  }).optional(),
});

const GatewayChatResponseSchema = z.object({
  content: z.string(),
  model: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
    cost: z.number(),
  }).optional(),
});

export type FrontierEmbeddingRequest = z.infer<typeof FrontierEmbeddingRequestSchema>;
export type FrontierEmbeddingResponse = z.infer<typeof FrontierEmbeddingResponseSchema>;
export type FrontierChatRequest = z.infer<typeof FrontierChatRequestSchema>;
export type FrontierChatResponse = z.infer<typeof FrontierChatResponseSchema>;

export type GatewayEmbeddingResponse = z.infer<typeof GatewayEmbeddingResponseSchema>;
export type GatewayChatResponse = z.infer<typeof GatewayChatResponseSchema>;

export interface FrontierConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  baseURL?: string;
  organization?: string;
}

/**
 * Frontier API Adapter for model gateway
 * Provides access to external APIs as final fallback
 */
export class FrontierAdapter {
  private readonly client: AxiosInstance;
  private readonly config: FrontierConfig;

  constructor(config: FrontierConfig) {
    this.config = config;
    
    const baseURL = config.baseURL || this.getDefaultBaseURL(config.provider);
    
    this.client = axios.create({
      baseURL,
      timeout: 120000, // 2 minutes for potentially slow API calls
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'cortex-os-model-gateway/1.0',
        ...this.getAuthHeaders(config),
      },
    });
  }

  private getDefaultBaseURL(provider: 'openai' | 'anthropic'): string {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private getAuthHeaders(config: FrontierConfig): Record<string, string> {
    switch (config.provider) {
      case 'openai':
        return {
          'Authorization': `Bearer ${config.apiKey}`,
          ...(config.organization && { 'OpenAI-Organization': config.organization }),
        };
      case 'anthropic':
        return {
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        };
      default:
        return {};
    }
  }

  /**
   * Generate embeddings using Frontier API
   */
  async generateEmbedding(
    text: string,
    model: string = 'text-embedding-3-small',
  ): Promise<GatewayEmbeddingResponse> {
    try {
      const request = FrontierEmbeddingRequestSchema.parse({
        model,
        input: text,
      });

      const response = await this.client.post('/embeddings', request);
      const embeddingData = FrontierEmbeddingResponseSchema.parse(response.data);

      if (embeddingData.data.length === 0) {
        throw new Error('No embedding data returned');
      }

      const cost = this.calculateEmbeddingCost(embeddingData.usage.total_tokens, model);

      return GatewayEmbeddingResponseSchema.parse({
        embedding: embeddingData.data[0].embedding,
        model,
        usage: {
          tokens: embeddingData.usage.total_tokens,
          cost,
        },
      });
    } catch (error) {
      console.error('Frontier embedding generation failed:', error);
      throw new Error(
        `Frontier embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate multiple embeddings in batch
   */
  async generateEmbeddings(
    texts: string[],
    model: string = 'text-embedding-3-small',
  ): Promise<GatewayEmbeddingResponse[]> {
    try {
      const request = FrontierEmbeddingRequestSchema.parse({
        model,
        input: texts,
      });

      const response = await this.client.post('/embeddings', request);
      const embeddingData = FrontierEmbeddingResponseSchema.parse(response.data);

      const cost = this.calculateEmbeddingCost(embeddingData.usage.total_tokens, model);
      const costPerEmbedding = cost / texts.length;

      return embeddingData.data.map((data, index) =>
        GatewayEmbeddingResponseSchema.parse({
          embedding: data.embedding,
          model,
          usage: {
            tokens: Math.floor(embeddingData.usage.total_tokens / texts.length),
            cost: costPerEmbedding,
          },
        })
      );
    } catch (error) {
      console.error('Frontier batch embedding generation failed:', error);
      throw new Error(
        `Frontier batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate chat completion using Frontier API
   */
  async generateChat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string = 'gpt-3.5-turbo',
    options?: { temperature?: number; max_tokens?: number },
  ): Promise<GatewayChatResponse> {
    try {
      let request: any;
      let endpoint: string;

      if (this.config.provider === 'anthropic') {
        // Convert to Anthropic format
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');
        
        request = {
          model,
          max_tokens: options?.max_tokens || 1000,
          messages: userMessages,
          ...(systemMessage && { system: systemMessage.content }),
          ...(options?.temperature && { temperature: options.temperature }),
        };
        endpoint = '/messages';
      } else {
        // OpenAI format
        request = FrontierChatRequestSchema.parse({
          model,
          messages,
          stream: false,
          max_tokens: options?.max_tokens,
          temperature: options?.temperature,
        });
        endpoint = '/chat/completions';
      }

      const response = await this.client.post(endpoint, request);
      
      let content: string;
      let usage: any;

      if (this.config.provider === 'anthropic') {
        content = response.data.content[0]?.text || '';
        usage = {
          prompt_tokens: response.data.usage?.input_tokens || 0,
          completion_tokens: response.data.usage?.output_tokens || 0,
          total_tokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
        };
      } else {
        const chatData = FrontierChatResponseSchema.parse(response.data);
        content = chatData.choices[0]?.message.content || '';
        usage = chatData.usage;
      }

      const cost = this.calculateChatCost(usage.prompt_tokens, usage.completion_tokens, model);

      return GatewayChatResponseSchema.parse({
        content,
        model,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          cost,
        },
      });
    } catch (error) {
      console.error('Frontier chat generation failed:', error);
      throw new Error(
        `Frontier chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if Frontier API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test with a simple request
      if (this.config.provider === 'openai') {
        const response = await this.client.get('/models', {
          timeout: 5000,
        });
        return response.status === 200;
      } else {
        // For Anthropic, we can't easily test without making a request
        // so we just check if we have a valid API key format
        return this.config.apiKey.length > 10;
      }
    } catch (error) {
      console.log(
        `Frontier API not available: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Calculate embedding cost based on tokens and model
   */
  private calculateEmbeddingCost(tokens: number, model: string): number {
    const costs: Record<string, number> = {
      'text-embedding-3-small': 0.00002, // $0.00002 per 1K tokens
      'text-embedding-3-large': 0.00013, // $0.00013 per 1K tokens
      'text-embedding-ada-002': 0.0001,  // $0.0001 per 1K tokens
    };

    const costPer1K = costs[model] || 0.0001;
    return (tokens / 1000) * costPer1K;
  }

  /**
   * Calculate chat cost based on tokens and model
   */
  private calculateChatCost(promptTokens: number, completionTokens: number, model: string): number {
    const costs: Record<string, { prompt: number; completion: number }> = {
      'gpt-3.5-turbo': { prompt: 0.001, completion: 0.002 }, // $0.001/$0.002 per 1K tokens
      'gpt-4': { prompt: 0.03, completion: 0.06 },           // $0.03/$0.06 per 1K tokens
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },     // $0.01/$0.03 per 1K tokens
      'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 }, // $0.25/$1.25 per 1M tokens
      'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },    // $3/$15 per 1M tokens
      'claude-3-opus': { prompt: 0.015, completion: 0.075 },      // $15/$75 per 1M tokens
    };

    const modelCosts = costs[model] || { prompt: 0.001, completion: 0.002 };
    
    return (promptTokens / 1000) * modelCosts.prompt + 
           (completionTokens / 1000) * modelCosts.completion;
  }

  /**
   * Get available models for the configured provider
   */
  getAvailableModels(): { embedding: string[]; chat: string[] } {
    if (this.config.provider === 'openai') {
      return {
        embedding: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
        chat: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'],
      };
    } else {
      return {
        embedding: [], // Anthropic doesn't have embedding models
        chat: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
      };
    }
  }
}