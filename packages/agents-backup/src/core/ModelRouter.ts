/**
 * Model Router for intelligent model selection
 * Implements MLX > Ollama > API provider chain with capability-based routing
 */

import type {
  ModelProvider,
  ModelCapabilities,
  GenerateRequest,
  GenerateResponse,
  GenerateChunk,
  ModalityType
} from '../types';

export interface ModelRouterConfig {
  providers: ModelProvider[];
  defaultProvider?: string;
  fallbackChain: string[];
  capabilityWeights?: Record<string, number>;
  costLimits?: {
    daily: number;
    monthly: number;
  };
  thermalThrottling?: {
    enabled: boolean;
    maxTemp?: number;
    checkInterval?: number;
  };
}

export interface RoutingDecision {
  provider: ModelProvider;
  reason: string;
  score: number;
  estimatedCost?: number;
  estimatedLatency?: number;
}

/**
 * Model Router implementing intelligent provider selection
 */
export class ModelRouter {
  private config: ModelRouterConfig;
  private usageStats: Map<string, {
    requestCount: number;
    tokenCount: number;
    cost: number;
    lastUsed: Date;
    errorCount: number;
  }> = new Map();
  private thermalStatus: {
    temperature: number;
    isThrottling: boolean;
    lastCheck: Date;
  } = {
    temperature: 0,
    isThrottling: false,
    lastCheck: new Date()
  };

  constructor(config: ModelRouterConfig) {
    this.config = config;
    this.initializeStats();

    if (this.config.thermalThrottling?.enabled) {
      this.startThermalMonitoring();
    }
  }

  /**
   * Select the best provider for the given request
   */
  async selectProvider(request: GenerateRequest): Promise<RoutingDecision> {
    const candidates = await this.evaluateProviders(request);

    if (candidates.length === 0) {
      throw new Error('No available model providers');
    }

    // Sort by score (descending)
    candidates.sort((a, b) => b.score - a.score);

    return candidates[0];
  }

  /**
   * Generate response using the best available provider
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const decision = await this.selectProvider(request);

    try {
      const response = await decision.provider.generate(request);

      // Update usage stats
      this.updateStats(decision.provider.name, {
        tokenCount: response.usage?.totalTokens || 0,
        cost: this.calculateCost(decision.provider.name, response.usage?.totalTokens || 0),
        success: true
      });

      return response;
    } catch (error) {
      // Update error stats
      this.updateStats(decision.provider.name, { success: false });

      // Try fallback chain
      return this.handleFallback(request, decision.provider.name, error);
    }
  }

  /**
   * Stream response using the best available provider
   */
  async *stream(request: GenerateRequest): AsyncIterable<GenerateChunk> {
    const decision = await this.selectProvider(request);

    if (!decision.provider.stream) {
      // Fallback to non-streaming
      const response = await this.generate(request);
      yield {
        type: 'content',
        content: response.content
      } as GenerateChunk;
      return;
    }

    try {
      const stream = decision.provider.stream(request);
      let totalTokens = 0;

      for await (const chunk of stream) {
        totalTokens += this.estimateTokens(chunk.content || '');
        yield chunk;
      }

      // Update usage stats
      this.updateStats(decision.provider.name, {
        tokenCount: totalTokens,
        cost: this.calculateCost(decision.provider.name, totalTokens),
        success: true
      });
    } catch (error) {
      this.updateStats(decision.provider.name, { success: false });
      throw error;
    }
  }

  /**
   * Get provider status and statistics
   */
  getProviderStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    for (const [providerName, stats] of this.usageStats) {
      status[providerName] = {
        ...stats,
        availability: this.calculateAvailability(providerName),
        avgResponseTime: this.calculateAvgResponseTime(providerName),
        errorRate: stats.requestCount > 0
          ? (stats.errorCount / stats.requestCount) * 100
          : 0
      };
    }

    return status;
  }

  /**
   * Check thermal status (for MLX on macOS)
   */
  getThermalStatus() {
    return {
      ...this.thermalStatus,
      isThrottling: this.thermalStatus.isThrottling,
      recommendation: this.thermalStatus.isThrottling
        ? 'Consider switching to Ollama or API providers'
        : 'MLX is available for optimal performance'
    };
  }

  /**
   * Reset usage statistics
   */
  resetStats(provider?: string): void {
    if (provider) {
      this.usageStats.delete(provider);
    } else {
      this.usageStats.clear();
    }
  }

  // ===== Private Methods =====

  private async evaluateProviders(request: GenerateRequest): Promise<RoutingDecision[]> {
    const decisions: RoutingDecision[] = [];

    for (const provider of this.config.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          continue;
        }

        const score = await this.calculateProviderScore(provider, request);
        const estimatedCost = this.estimateCost(provider, request);
        const estimatedLatency = this.estimateLatency(provider, request);

        decisions.push({
          provider,
          score,
          reason: this.generateReason(provider, request, score),
          estimatedCost,
          estimatedLatency
        });
      } catch (error) {
        // Provider evaluation failed
        console.warn(`Failed to evaluate provider ${provider.name}:`, error);
      }
    }

    return decisions;
  }

  private async calculateProviderScore(provider: ModelProvider, request: GenerateRequest): Promise<number> {
    let score = 0;

    // Capability matching (40%)
    const capabilityScore = this.calculateCapabilityScore(provider, request);
    score += capabilityScore * 0.4;

    // Performance score (30%)
    const performanceScore = this.calculatePerformanceScore(provider.name);
    score += performanceScore * 0.3;

    // Cost efficiency (20%)
    const costScore = this.calculateCostScore(provider.name, request);
    score += costScore * 0.2;

    // Thermal awareness (10%) - for MLX on macOS
    const thermalScore = this.calculateThermalScore(provider);
    score += thermalScore * 0.1;

    return score;
  }

  private calculateCapabilityScore(provider: ModelProvider, request: GenerateRequest): number {
    const capabilities = provider.capabilities;
    let score = 0;

    // Check if provider supports required modalities
    if (request.images && capabilities.supportsVision) {
      score += 0.3;
    }

    // Check token limits
    if (request.maxTokens && request.maxTokens <= capabilities.maxTokens) {
      score += 0.2;
    }

    // Check streaming support
    if (capabilities.supportsStreaming) {
      score += 0.2;
    }

    // Check tool support
    if (request.tools && capabilities.supportsTools) {
      score += 0.3;
    }

    return score;
  }

  private calculatePerformanceScore(providerName: string): number {
    const stats = this.usageStats.get(providerName);
    if (!stats) {
      return 0.5; // Default score for new providers
    }

    const errorRate = stats.requestCount > 0
      ? stats.errorCount / stats.requestCount
      : 0;

    // Higher score for lower error rates
    return Math.max(0, 1 - errorRate);
  }

  private calculateCostScore(providerName: string, request: GenerateRequest): number {
    const estimatedCost = this.estimateCost(providerName, request);
    const limits = this.config.costLimits;

    if (!limits) {
      return 0.5; // Default score
    }

    // Calculate daily usage percentage
    const dailyUsage = this.getDailyCost(providerName);
    const dailyPercentage = dailyUsage / limits.daily;

    // Higher score for lower cost usage
    return Math.max(0, 1 - dailyPercentage);
  }

  private calculateThermalScore(provider: ModelProvider): number {
    if (provider.type !== 'mlx' || !this.config.thermalThrottling?.enabled) {
      return 1; // No thermal concerns for non-MLX providers
    }

    // Lower score if thermal throttling is active
    return this.thermalStatus.isThrottling ? 0.2 : 1;
  }

  private estimateCost(provider: ModelProvider, request: GenerateRequest): number {
    // Simple cost estimation based on token count
    const estimatedTokens = this.estimateTokens(request.prompt);
    return this.calculateCost(provider.name, estimatedTokens);
  }

  private estimateLatency(provider: ModelProvider, request: GenerateRequest): number {
    // Simple latency estimation based on provider type and token count
    const baseLatency: Record<string, number> = {
      mlx: 50,      // 50ms base latency for local MLX
      ollama: 100,  // 100ms for Ollama
      openai: 200,  // 200ms for OpenAI API
      anthropic: 250,
      google: 180
    };

    const tokens = this.estimateTokens(request.prompt);
    const providerType = provider.type;

    return (baseLatency[providerType] || 200) + (tokens * 0.1); // 0.1ms per token
  }

  private generateReason(provider: ModelProvider, request: GenerateRequest, score: number): string {
    const reasons: string[] = [];

    if (provider.type === 'mlx' && !this.thermalStatus.isThrottling) {
      reasons.push('Native MLX (optimal performance)');
    } else if (provider.type === 'ollama') {
      reasons.push('Local Ollama fallback');
    } else {
      reasons.push(`API provider: ${provider.type}`);
    }

    if (request.images && provider.capabilities.supportsVision) {
      reasons.push('Supports vision input');
    }

    if (request.tools && provider.capabilities.supportsTools) {
      reasons.push('Supports tool calling');
    }

    if (score > 0.8) {
      reasons.push('High compatibility score');
    }

    return reasons.join(', ');
  }

  private async handleFallback(request: GenerateRequest, failedProvider: string, error: any): Promise<GenerateResponse> {
    const fallbackChain = this.config.fallbackChain.filter(p => p !== failedProvider);

    for (const providerName of fallbackChain) {
      const provider = this.config.providers.find(p => p.name === providerName);
      if (!provider) continue;

      try {
        if (await provider.isAvailable()) {
          console.log(`Falling back to ${providerName} after ${failedProvider} failed`);
          return await provider.generate(request);
        }
      } catch (fallbackError) {
        console.warn(`Fallback to ${providerName} also failed:`, fallbackError);
        continue;
      }
    }

    // All fallbacks failed
    throw new Error(`All providers failed. Initial error: ${error.message}`);
  }

  private updateStats(providerName: string, update: {
    tokenCount?: number;
    cost?: number;
    success?: boolean;
  }): void {
    let stats = this.usageStats.get(providerName);

    if (!stats) {
      stats = {
        requestCount: 0,
        tokenCount: 0,
        cost: 0,
        lastUsed: new Date(),
        errorCount: 0
      };
      this.usageStats.set(providerName, stats);
    }

    stats.requestCount++;
    stats.lastUsed = new Date();

    if (update.tokenCount) {
      stats.tokenCount += update.tokenCount;
    }

    if (update.cost) {
      stats.cost += update.cost;
    }

    if (update.success === false) {
      stats.errorCount++;
    }
  }

  private calculateCost(providerName: string, tokens: number): number {
    // Simple cost calculation
    const costs: Record<string, number> = {
      mlx: 0,           // Free for local models
      ollama: 0,        // Free for local models
      openai: 0.002,    // $0.002 per 1K tokens
      anthropic: 0.015, // $0.015 per 1K tokens
      google: 0.001     // $0.001 per 1K tokens
    };

    const provider = this.config.providers.find(p => p.name === providerName);
    if (!provider) return 0;

    const costPerK = costs[provider.type] || 0.001;
    return (tokens / 1000) * costPerK;
  }

  private getDailyCost(providerName: string): number {
    const stats = this.usageStats.get(providerName);
    return stats?.cost || 0;
  }

  private calculateAvailability(providerName: string): number {
    const stats = this.usageStats.get(providerName);
    if (!stats) return 1;

    const errorRate = stats.errorCount / stats.requestCount;
    return Math.max(0, 1 - errorRate);
  }

  private calculateAvgResponseTime(providerName: string): number {
    // Would need to track actual response times
    return 0; // Placeholder
  }

  private estimateTokens(text: string): number {
    // Simple token estimation (rough approximation)
    return Math.ceil(text.length / 4);
  }

  private initializeStats(): void {
    for (const provider of this.config.providers) {
      this.usageStats.set(provider.name, {
        requestCount: 0,
        tokenCount: 0,
        cost: 0,
        lastUsed: new Date(),
        errorCount: 0
      });
    }
  }

  private startThermalMonitoring(): void {
    const interval = this.config.thermalThrottling?.checkInterval || 30000; // 30 seconds

    setInterval(async () => {
      try {
        // Check macOS thermal status
        // This would require native integration or system commands
        const temp = await this.getMacOSTemperature();

        this.thermalStatus = {
          temperature: temp,
          isThrottling: temp > (this.config.thermalThrottling?.maxTemp || 80),
          lastCheck: new Date()
        };

        if (this.thermalStatus.isThrottling) {
          console.warn(`Thermal throttling activated: ${temp}°C`);
        }
      } catch (error) {
        console.error('Failed to check thermal status:', error);
      }
    }, interval);
  }

  private async getMacOSTemperature(): Promise<number> {
    // This would need actual implementation using system commands or native APIs
    // For now, return a mock value
    return 45; // Mock temperature in Celsius
  }
}