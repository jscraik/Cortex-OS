/**
 * Enhanced Capability-Based Model Router
 *
 * Advanced model selection with thermal awareness, cost tracking,
 * and intelligent fallback logic. Migrated from agents-backup.
 */

import { createPinoLogger } from '@voltagent/logger';
import type {
	GenerateOptions,
	GenerateResult,
	ModelProvider,
} from '../lib/types.js';

const logger = createPinoLogger({ name: 'CapabilityRouter' });

export interface CapabilityRouterConfig {
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

export interface ProviderStats {
	requestCount: number;
	tokenCount: number;
	cost: number;
	lastUsed: Date;
	errorCount: number;
	averageLatency: number;
}

export interface ProviderCapabilities {
	supportsVision: boolean;
	supportsStreaming: boolean;
	supportsTools: boolean;
	maxTokens: number;
	contextWindow: number;
}

/**
 * Enhanced Capability Router implementing intelligent provider selection
 */
export class CapabilityRouter {
	private config: CapabilityRouterConfig;
	private usageStats: Map<string, ProviderStats> = new Map();
	private thermalStatus: {
		temperature: number;
		isThrottling: boolean;
		lastCheck: Date;
	} = {
		temperature: 0,
		isThrottling: false,
		lastCheck: new Date(),
	};
	private dailyCost = 0;
	private monthlyCost = 0;
	private lastCostReset = new Date();

	constructor(config: CapabilityRouterConfig) {
		this.config = config;
		this.initializeStats();

		if (this.config.thermalThrottling?.enabled) {
			this.startThermalMonitoring();
		}

		// Reset costs daily
		setInterval(() => this.resetDailyCost(), 24 * 60 * 60 * 1000);
	}

	/**
	 * Select the best provider for the given request
	 */
	async selectProvider(
		prompt: string,
		options: GenerateOptions = {},
		capabilities: Partial<ProviderCapabilities> = {},
	): Promise<RoutingDecision> {
		const candidates = await this.evaluateProviders(
			prompt,
			options,
			capabilities,
		);

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
	async generate(
		prompt: string,
		options: GenerateOptions = {},
		capabilities: Partial<ProviderCapabilities> = {},
	): Promise<GenerateResult> {
		const decision = await this.selectProvider(prompt, options, capabilities);

		try {
			const startTime = Date.now();
			const response = await decision.provider.generate(prompt, options);
			const latency = Date.now() - startTime;

			// Update usage stats
			this.updateStats(decision.provider.name, {
				tokenCount: response.usage?.totalTokens || 0,
				cost: this.calculateCost(
					decision.provider.name,
					response.usage?.totalTokens || 0,
				),
				latency,
				success: true,
			});

			logger.info(
				`Generated response using ${decision.provider.name} (${decision.reason})`,
			);
			return response;
		} catch (error) {
			// Update error stats
			this.updateStats(decision.provider.name, { success: false });

			// Try fallback
			return await this.handleFallback(
				prompt,
				options,
				capabilities,
				decision.provider.name,
				error,
			);
		}
	}

	/**
	 * Get usage statistics for all providers
	 */
	getUsageStats(): Map<string, ProviderStats> {
		return new Map(this.usageStats);
	}

	/**
	 * Get current thermal status
	 */
	getThermalStatus() {
		return { ...this.thermalStatus };
	}

	/**
	 * Get cost tracking information
	 */
	getCostInfo() {
		return {
			daily: this.dailyCost,
			monthly: this.monthlyCost,
			dailyLimit: this.config.costLimits?.daily,
			monthlyLimit: this.config.costLimits?.monthly,
		};
	}

	private async evaluateProviders(
		prompt: string,
		options: GenerateOptions,
		capabilities: Partial<ProviderCapabilities>,
	): Promise<RoutingDecision[]> {
		const decisions: RoutingDecision[] = [];

		for (const provider of this.config.providers) {
			try {
				const isAvailable = await (provider.isAvailable?.() ||
					Promise.resolve(true));
				if (!isAvailable) {
					continue;
				}

				const score = await this.calculateProviderScore(
					provider,
					prompt,
					options,
					capabilities,
				);
				const estimatedCost = this.estimateCost(provider, prompt, options);
				const estimatedLatency = this.estimateLatency(
					provider,
					prompt,
					options,
				);

				decisions.push({
					provider,
					score,
					reason: this.generateReason(provider, capabilities, score),
					estimatedCost,
					estimatedLatency,
				});
			} catch (error) {
				logger.warn(`Failed to evaluate provider ${provider.name}:`, error);
			}
		}

		return decisions;
	}

	private async calculateProviderScore(
		provider: ModelProvider,
		prompt: string,
		options: GenerateOptions,
		capabilities: Partial<ProviderCapabilities>,
	): Promise<number> {
		let score = 0;

		// Capability matching (40%)
		const capabilityScore = this.calculateCapabilityScore(
			provider,
			capabilities,
		);
		score += capabilityScore * 0.4;

		// Performance score (30%)
		const performanceScore = this.calculatePerformanceScore(provider.name);
		score += performanceScore * 0.3;

		// Cost efficiency (20%)
		const costScore = this.calculateCostScore(provider.name, prompt, options);
		score += costScore * 0.2;

		// Thermal awareness (10%) - for MLX on macOS
		const thermalScore = this.calculateThermalScore(provider);
		score += thermalScore * 0.1;

		return score;
	}

	private calculateCapabilityScore(
		provider: ModelProvider,
		required: Partial<ProviderCapabilities>,
	): number {
		let score = 0;
		const providerCaps = (provider as any).capabilities || {};

		// Check vision support
		if (required.supportsVision && providerCaps.supportsVision) {
			score += 0.3;
		}

		// Check token limits
		if (
			required.maxTokens &&
			providerCaps.maxTokens &&
			required.maxTokens <= providerCaps.maxTokens
		) {
			score += 0.2;
		}

		// Check streaming support
		if (required.supportsStreaming && providerCaps.supportsStreaming) {
			score += 0.2;
		}

		// Check tool support
		if (required.supportsTools && providerCaps.supportsTools) {
			score += 0.3;
		}

		return score;
	}

	private calculatePerformanceScore(providerName: string): number {
		const stats = this.usageStats.get(providerName);
		if (!stats) {
			return 0.5; // Default score for new providers
		}

		const errorRate =
			stats.requestCount > 0 ? stats.errorCount / stats.requestCount : 0;

		// Higher score for lower error rates and better latency
		const latencyScore =
			stats.averageLatency > 0 ? Math.min(1, 1000 / stats.averageLatency) : 0.5;
		return Math.max(0, (1 - errorRate) * 0.7 + latencyScore * 0.3);
	}

	private calculateCostScore(
		providerName: string,
		prompt: string,
		options: GenerateOptions,
	): number {
		const estimatedCost = this.estimateCost(
			{ name: providerName } as ModelProvider,
			prompt,
			options,
		);

		// Check daily limits
		if (this.config.costLimits?.daily) {
			const dailyPercentage = this.dailyCost / this.config.costLimits.daily;
			if (dailyPercentage > 0.8) {
				return Math.max(0, 1 - dailyPercentage);
			}
		}

		// Prefer lower cost providers
		return Math.max(0, 1 - Math.min(1, estimatedCost / 0.1)); // Normalize to $0.10
	}

	private calculateThermalScore(provider: ModelProvider): number {
		if (
			!provider.name.includes('mlx') ||
			!this.config.thermalThrottling?.enabled
		) {
			return 1; // No thermal concerns for non-MLX providers
		}

		// Lower score if thermal throttling is active
		return this.thermalStatus.isThrottling ? 0.2 : 1;
	}

	private estimateCost(
		provider: ModelProvider,
		prompt: string,
		options: GenerateOptions,
	): number {
		// Simple cost estimation based on token count
		const estimatedTokens = this.estimateTokens(
			prompt + (JSON.stringify(options) || ''),
		);
		return this.calculateCost(provider.name, estimatedTokens);
	}

	private estimateLatency(
		provider: ModelProvider,
		_prompt: string,
		_options: GenerateOptions,
	): number {
		const baseLatency: Record<string, number> = {
			mlx: 50,
			ollama: 100,
			openai: 200,
			anthropic: 250,
			google: 300,
		};

		const providerType = provider.name.split('-')[0];
		return baseLatency[providerType] || 200;
	}

	private generateReason(
		provider: ModelProvider,
		capabilities: Partial<ProviderCapabilities>,
		score: number,
	): string {
		const reasons: string[] = [];

		if (provider.name.includes('mlx') && !this.thermalStatus.isThrottling) {
			reasons.push('Native MLX (optimal performance)');
		} else if (provider.name.includes('ollama')) {
			reasons.push('Local Ollama fallback');
		} else {
			reasons.push(`API provider: ${provider.name.split('-')[0]}`);
		}

		if (
			capabilities.supportsVision &&
			(provider as any).capabilities?.supportsVision
		) {
			reasons.push('Supports vision input');
		}

		if (
			capabilities.supportsTools &&
			(provider as any).capabilities?.supportsTools
		) {
			reasons.push('Supports tool calling');
		}

		if (score > 0.8) {
			reasons.push('High compatibility score');
		}

		return reasons.join(', ');
	}

	private async handleFallback(
		prompt: string,
		options: GenerateOptions,
		_capabilities: Partial<ProviderCapabilities>,
		failedProvider: string,
		error: any,
	): Promise<GenerateResult> {
		const fallbackChain = this.config.fallbackChain.filter(
			(p) => p !== failedProvider,
		);

		for (const providerName of fallbackChain) {
			const provider = this.config.providers.find(
				(p) => p.name === providerName,
			);
			if (!provider) continue;

			try {
				if (await provider.isAvailable?.()) {
					logger.info(
						`Falling back to ${providerName} after ${failedProvider} failed`,
					);
					return await provider.generate(prompt, options);
				}
			} catch (fallbackError) {
				logger.warn(`Fallback to ${providerName} also failed:`, fallbackError);
			}
		}

		// All fallbacks failed
		throw new Error(`All providers failed. Initial error: ${error.message}`);
	}

	private updateStats(
		providerName: string,
		update: {
			tokenCount?: number;
			cost?: number;
			latency?: number;
			success?: boolean;
		},
	): void {
		let stats = this.usageStats.get(providerName);

		if (!stats) {
			stats = {
				requestCount: 0,
				tokenCount: 0,
				cost: 0,
				lastUsed: new Date(),
				errorCount: 0,
				averageLatency: 0,
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
			this.dailyCost += update.cost;
			this.monthlyCost += update.cost;
		}

		if (update.latency) {
			// Update moving average
			stats.averageLatency = stats.averageLatency * 0.9 + update.latency * 0.1;
		}

		if (update.success === false) {
			stats.errorCount++;
		}
	}

	private initializeStats(): void {
		for (const provider of this.config.providers) {
			this.usageStats.set(provider.name, {
				requestCount: 0,
				tokenCount: 0,
				cost: 0,
				lastUsed: new Date(),
				errorCount: 0,
				averageLatency: 0,
			});
		}
	}

	private startThermalMonitoring(): void {
		const checkInterval = this.config.thermalThrottling?.checkInterval || 30000;

		setInterval(async () => {
			try {
				// Check thermal status (macOS specific)
				const { spawn } = await import('node:child_process');
				const process = spawn('sysctl', [
					'-n',
					'machdep.xcpm.cpu_thermal_state',
				]);

				const thermalState = await new Promise<number>((resolve) => {
					let output = '';
					process.stdout?.on('data', (data) => {
						output += data.toString();
					});
					process.on('close', () => {
						const state = Number.parseInt(output.trim(), 10) || 0;
						resolve(state);
					});
					process.on('error', () => resolve(0));
				});

				this.thermalStatus.temperature = Math.min(100, thermalState * 10 + 40);
				this.thermalStatus.isThrottling = thermalState >= 3;
				this.thermalStatus.lastCheck = new Date();

				if (this.thermalStatus.isThrottling) {
					logger.warn('Thermal throttling activated for MLX provider');
				}
			} catch (error) {
				logger.warn('Failed to check thermal status:', error);
			}
		}, checkInterval);
	}

	private resetDailyCost(): void {
		this.dailyCost = 0;
		this.lastCostReset = new Date();

		// Reset monthly cost if it's a new month
		const now = new Date();
		if (now.getMonth() !== this.lastCostReset.getMonth()) {
			this.monthlyCost = 0;
		}
	}

	private calculateCost(providerName: string, tokens: number): number {
		// Simplified cost calculation
		const rates: Record<string, number> = {
			mlx: 0,
			ollama: 0,
			openai: 0.002,
			anthropic: 0.003,
			google: 0.001,
		};

		const providerType = providerName.split('-')[0];
		return (rates[providerType] || 0.002) * (tokens / 1000);
	}

	private estimateTokens(text: string): number {
		// Rough approximation: 1 token ≈ 4 characters
		return Math.ceil(text.length / 4);
	}
}

/**
 * Create a capability router with default configuration
 */
export function createCapabilityRouter(
	config: CapabilityRouterConfig,
): CapabilityRouter {
	return new CapabilityRouter(config);
}
