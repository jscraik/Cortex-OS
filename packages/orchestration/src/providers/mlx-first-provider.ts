/**
 * MLX-First Model Provider with Ollama Fallback
 * Handles automatic failover and performance optimization
 */

import { MODEL_STRATEGY } from '../lib/model-strategy.js';

export interface ModelRequest {
  task: string;
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ModelResponse {
  content: string;
  model: string;
  provider: 'mlx' | 'ollama';
  latency: number;
  tokens?: number;
  cached?: boolean;
}

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  provider: 'mlx' | 'ollama';
  dimensions: number;
}

export class MLXFirstModelProvider {
  private readonly mlxService: MLXService;
  private readonly ollamaService: OllamaService;
  private readonly healthChecks = new Map<string, boolean>();

  constructor() {
    this.mlxService = new MLXService();
    this.ollamaService = new OllamaService();
    this.startHealthChecking();
  }

  /**
   * Generate text using MLX-first strategy
   */
  async generate(task: string, request: ModelRequest): Promise<ModelResponse> {
    const config = MODEL_STRATEGY[task];
    if (!config) {
      throw new Error(`Unknown task: ${task}`);
    }

    const startTime = Date.now();

    // Try MLX first
    try {
      if (this.isHealthy('mlx', config.primary.model)) {
        const response = await this.mlxService.generate({
          model: config.primary.model,
          ...request,
        });

        return {
          ...response,
          provider: 'mlx',
          latency: Date.now() - startTime,
          model: config.primary.model,
        };
      }
    } catch (error) {
      console.warn(`MLX generation failed for ${task}:`, error);
      this.markUnhealthy('mlx', config.primary.model);
    }

    // Fallback to Ollama
    try {
      const response = await this.ollamaService.generate({
        model: config.fallback.model,
        ...request,
      });

      return {
        ...response,
        provider: 'ollama',
        latency: Date.now() - startTime,
        model: config.fallback.model,
      };
    } catch (error) {
      console.error(`Both MLX and Ollama failed for ${task}:`, error);
      throw new Error(`All providers failed for task: ${task}`);
    }
  }

  /**
   * Generate embeddings using MLX-first strategy
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const config = MODEL_STRATEGY.embeddings;

    // Try MLX first
    try {
      if (this.isHealthy('mlx', config.primary.model)) {
        const response = await this.mlxService.embed({
          model: config.primary.model,
          texts: request.texts,
        });

        return {
          ...response,
          provider: 'mlx',
          model: config.primary.model,
        };
      }
    } catch (error) {
      console.warn(`MLX embedding failed:`, error);
      this.markUnhealthy('mlx', config.primary.model);
    }

    // Fallback to Ollama (using text generation for semantic understanding)
    try {
      // Ollama doesn't have embeddings API, so we use semantic comparison
      const embeddings = await this.ollamaService.generateSemanticVectors(request.texts);

      return {
        embeddings,
        provider: 'ollama',
        model: config.fallback.model,
        dimensions: embeddings[0]?.length || 0,
      };
    } catch (error) {
      console.error(`Ollama fallback failed for embeddings:`, error);
      throw new Error(`All providers failed for embeddings`);
    }
  }

  /**
   * Rerank documents using MLX-first strategy
   */
  async rerank(
    query: string,
    documents: string[],
  ): Promise<{ scores: number[]; provider: string }> {
    const config = MODEL_STRATEGY.reranking;

    // Try MLX reranker first
    try {
      if (this.isHealthy('mlx', config.primary.model)) {
        const scores = await this.mlxService.rerank({
          model: config.primary.model,
          query,
          documents,
        });

        return { scores, provider: 'mlx' };
      }
    } catch (error) {
      console.warn(`MLX reranking failed:`, error);
      this.markUnhealthy('mlx', config.primary.model);
    }

    // Fallback to Ollama with comparison prompts
    try {
      const scores = await this.ollamaService.compareRelevance(query, documents);
      return { scores, provider: 'ollama' };
    } catch (error) {
      console.error(`Ollama reranking fallback failed:`, error);
      throw new Error(`All providers failed for reranking`);
    }
  }

  /**
   * Health checking for automatic failover
   */
  private startHealthChecking() {
    setInterval(async () => {
      await this.checkMLXHealth();
      await this.checkOllamaHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkMLXHealth() {
    try {
      const response = await this.mlxService.healthCheck();
      this.healthChecks.set('mlx', response.healthy);
    } catch {
      this.healthChecks.set('mlx', false);
    }
  }

  private async checkOllamaHealth() {
    try {
      const response = await this.ollamaService.healthCheck();
      this.healthChecks.set('ollama', response.healthy);
    } catch {
      this.healthChecks.set('ollama', false);
    }
  }

  private isHealthy(provider: string, model?: string): boolean {
    // If a model-specific health entry exists, use it; otherwise fall back to provider-level health.
    if (model) {
      const modelKey = `${provider}-${model}`;
      const modelHealth = this.healthChecks.get(modelKey);
      if (typeof modelHealth === 'boolean') return modelHealth;
    }
    return this.healthChecks.get(provider) ?? true; // default to true to attempt primary first
  }

  private markUnhealthy(provider: string, model?: string) {
    const key = model ? `${provider}-${model}` : provider;
    this.healthChecks.set(key, false);
  }

  /**
   * Get optimal model for a specific task
   */
  getOptimalModel(task: string, constraints?: { maxLatency?: number; maxMemory?: string }) {
    const config = MODEL_STRATEGY[task];
    if (!config) return null;

    // Consider constraints
    if (constraints?.maxLatency && constraints.maxLatency < 100) {
      // Force MLX for ultra-low latency
      return config.primary;
    }

    if (constraints?.maxMemory === 'light') {
      // Prefer lighter models
      return config.performance.memory === 'light' ? config.primary : config.fallback;
    }

    return this.isHealthy('mlx', config.primary.model) ? config.primary : config.fallback;
  }
}

/**
 * MLX Service Implementation
 */
class MLXService {
  private readonly baseUrl = process.env.MLX_SERVICE_URL || 'http://localhost:8765';

  async generate(request: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MLX service error: ${response.statusText}`);
    }

    return response.json();
  }

  async embed(request: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MLX embedding error: ${response.statusText}`);
    }

    return response.json();
  }

  async rerank(request: any): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MLX rerank error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.scores;
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    try {
      // Note: global fetch doesn't support timeout option; use AbortController if needed.
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      } as any);
      return { healthy: response.ok };
    } catch {
      return { healthy: false };
    }
  }
}

/**
 * Ollama Service Implementation
 */
class OllamaService {
  private readonly baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  async generate(request: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 1000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama service error: ${response.statusText}`);
    }

    const result = await response.json();
    return { content: result.response };
  }

  async generateSemanticVectors(texts: string[]): Promise<number[][]> {
    // Simplified semantic vector generation using Ollama
    // In practice, you might use sentence transformers or similar
    const vectors: number[][] = [];

    for (const text of texts) {
      const response = await this.generate({
        model: 'phi4-mini-reasoning:latest',
        prompt: `Generate a semantic summary of: "${text}". Output only numbers separated by commas representing the semantic features.`,
        maxTokens: 100,
      });

      // Parse response into a vector (simplified)
      const vector = this.parseSemanticResponse(response.content);
      vectors.push(vector);
    }

    return vectors;
  }

  async compareRelevance(query: string, documents: string[]): Promise<number[]> {
    const scores: number[] = [];

    for (const doc of documents) {
      const response = await this.generate({
        model: 'phi4-mini-reasoning:latest',
        prompt: `Rate the relevance of this document to the query on a scale of 0-1.
Query: "${query}"
Document: "${doc}"
Output only a decimal number between 0 and 1:`,
        maxTokens: 10,
      });

      const score = parseFloat(response.content.trim()) || 0;
      scores.push(Math.max(0, Math.min(1, score)));
    }

    return scores;
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    try {
      // Note: global fetch doesn't support timeout option; use AbortController if needed.
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      } as any);
      return { healthy: response.ok };
    } catch {
      return { healthy: false };
    }
  }

  private parseSemanticResponse(content: string): number[] {
    // Simplified parsing - in practice, use more robust methods
    try {
      const numbers = content.match(/[\d.-]+/g);
      if (numbers && numbers.length > 0) {
        return numbers.slice(0, 768).map((n) => parseFloat(n) || 0);
      }
    } catch {
      // Return default vector
    }

    // Fallback: generate a simple hash-based vector
    const hash = this.simpleHash(content);
    return Array.from({ length: 768 }, (_, i) => Math.sin(hash + i) * 0.1);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

// Internal service classes intentionally not exported
