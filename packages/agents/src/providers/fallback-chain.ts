/**
 * Provider Fallback Chain Implementation
 *
 * Implements circuit breaker pattern with health monitoring
 * for provider failover and load balancing
 */

import type {
	EventBus,
	GenerateOptions,
	GenerateResult,
	ModelProvider,
} from "../lib/types.js";
import { withTimeout } from "../lib/utils.js";

export interface FallbackChainConfig {
	providers: ModelProvider[];
	healthCheckInterval?: number;
	circuitBreakerThreshold?: number;
	circuitBreakerTimeout?: number;
	retryAttempts?: number;
	retryDelay?: number;
	// Optional event bus to publish provider.fallback events when failover occurs
	eventBus?: EventBus;
}

interface ProviderHealth {
	isHealthy: boolean;
	consecutiveFailures: number;
	lastFailure?: number;
	averageLatency: number;
	requestCount: number;
	totalLatency: number;
	circuitBreakerOpen: boolean;
	circuitBreakerOpenedAt?: number;
}

interface FallbackState {
	// store a fully-populated config (defaults merged) to simplify runtime checks
	config: Required<FallbackChainConfig>;
	providerHealth: Map<string, ProviderHealth>;
	lastHealthCheck: number;
}

const DEFAULT_CONFIG = {
	healthCheckInterval: 30000,
	circuitBreakerThreshold: 5,
	circuitBreakerTimeout: 60000,
	retryAttempts: 3,
	retryDelay: 1000,
};

const createFallbackState = (config: FallbackChainConfig): FallbackState => {
	const fullConfig: Required<FallbackChainConfig> = {
		...DEFAULT_CONFIG,
		...config,
	} as Required<FallbackChainConfig>;
	// preserve eventBus reference if provided
	if (config.eventBus) {
		fullConfig.eventBus = config.eventBus;
	}
	const providerHealth = new Map<string, ProviderHealth>();

	fullConfig.providers.forEach((provider) => {
		providerHealth.set(provider.name, {
			isHealthy: true,
			consecutiveFailures: 0,
			averageLatency: 0,
			requestCount: 0,
			totalLatency: 0,
			circuitBreakerOpen: false,
		});
	});

	return {
		config: fullConfig,
		providerHealth,
		lastHealthCheck: Date.now(),
	};
};

const updateProviderHealth = (
	providerName: string,
	success: boolean,
	latency: number,
	state: FallbackState,
): void => {
	const health = state.providerHealth.get(providerName);
	if (!health) return;

	health.requestCount++;
	health.totalLatency += latency;
	health.averageLatency = health.totalLatency / health.requestCount;

	if (success) {
		health.isHealthy = true;
		health.consecutiveFailures = 0;

		if (health.circuitBreakerOpen) {
			health.circuitBreakerOpen = false;
			health.circuitBreakerOpenedAt = undefined;
		}
	} else {
		health.consecutiveFailures++;
		health.lastFailure = Date.now();

		if (health.consecutiveFailures >= state.config.circuitBreakerThreshold) {
			health.circuitBreakerOpen = true;
			health.circuitBreakerOpenedAt = Date.now();
			health.isHealthy = false;
		}
	}
};

const shouldTryProvider = (
	health: ProviderHealth,
	config: Required<FallbackChainConfig>,
): boolean => {
	if (!health.circuitBreakerOpen) return true;

	const now = Date.now();
	const openedAt = health.circuitBreakerOpenedAt || 0;

	return now - openedAt > config.circuitBreakerTimeout;
};

const getHealthyProviders = (state: FallbackState): ModelProvider[] =>
	state.config.providers.filter((provider) => {
		const health = state.providerHealth.get(provider.name);
		return health && shouldTryProvider(health, state.config);
	});

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

const generateWithProvider = async (
	provider: ModelProvider,
	prompt: string,
	options: GenerateOptions,
	state: FallbackState,
): Promise<GenerateResult> => {
	const startTime = Date.now();

	try {
		const result = await provider.generate(prompt, options);
		const latency = Date.now() - startTime;

		updateProviderHealth(provider.name, true, latency, state);
		return result;
	} catch (error) {
		const latency = Date.now() - startTime;
		updateProviderHealth(provider.name, false, latency, state);
		throw error;
	}
};

const generateWithFallback = async (
	prompt: string,
	options: GenerateOptions,
	state: FallbackState,
): Promise<GenerateResult> => {
	const healthyProviders = getHealthyProviders(state);

	if (healthyProviders.length === 0) {
		throw new Error("No healthy providers available");
	}

	let lastError: Error | undefined;

	for (let attempt = 0; attempt < state.config.retryAttempts; attempt++) {
		for (const provider of healthyProviders) {
			try {
				const result = await generateWithProvider(
					provider,
					prompt,
					options,
					state,
				);
				return result;
			} catch (error) {
				lastError =
					error instanceof Error ? error : new Error("Provider failed");

				// Emit fallback event (best-effort)
				emitProviderFallback(state, provider, error, attempt);

				if (attempt < state.config.retryAttempts - 1) {
					await sleep(state.config.retryDelay * (attempt + 1));
				}
			}
		}
	}

	throw lastError || new Error("All providers failed");
};

const performHealthCheck = async (state: FallbackState): Promise<void> => {
	const now = Date.now();
	if (now - state.lastHealthCheck < state.config.healthCheckInterval) {
		return;
	}

	const healthChecks = state.config.providers.map(async (provider) => {
		const health = state.providerHealth.get(provider.name);
		if (!health?.circuitBreakerOpen) return;

		try {
			const startTime = Date.now();
			await withTimeout(
				provider.generate("health check", { maxTokens: 1, temperature: 0 }),
				5000,
			);
			const latency = Date.now() - startTime;

			updateProviderHealth(provider.name, true, latency, state);
		} catch {
			updateProviderHealth(provider.name, false, 5000, state);
		}
	});

	await Promise.allSettled(healthChecks);
	state.lastHealthCheck = now;
};

const emitProviderFallback = (
	state: FallbackState,
	provider: ModelProvider,
	error: unknown,
	attempt: number,
): void => {
	try {
		const bus = state.config.eventBus;
		if (!bus) return;

		// best-effort publish; swallow errors via catch on the returned promise
		void bus
			.publish({
				id: crypto.randomUUID(),
				type: "provider.fallback",
				timestamp: new Date().toISOString(),
				source: "fallback-chain",
				data: {
					failedProvider: provider.name,
					reason:
						error instanceof Error ? error.message : String(error ?? "unknown"),
					attempt,
					timestamp: new Date().toISOString(),
				},
			})
			.catch(() => {
				/* no-op */
			});
	} catch (e) {
		if (process.env.NODE_ENV !== "production") {
			// best-effort debug logging
			// eslint-disable-next-line no-console
			console.debug("[fallback-chain] emitProviderFallback failed", e);
		}
	}
};

export const createFallbackChain = (
	config: FallbackChainConfig,
): ModelProvider => {
	const state = createFallbackState(config);

	return {
		name: `fallback:${config.providers.map((p) => p.name).join(",")}`,

		generate: async (prompt: string, options: GenerateOptions = {}) => {
			await performHealthCheck(state);
			return generateWithFallback(prompt, options, state);
		},

		isAvailable: async () => {
			// The fallback chain is available if at least one provider is healthy
			const healthyProviders = state.config.providers.filter((provider: ModelProvider) => {
				const health = state.providerHealth.get(provider.name);
				return health?.isHealthy ?? false;
			});
			return healthyProviders.length > 0;
		},

		shutdown: async () => {
			await Promise.all(
				config.providers.map((provider) =>
					provider.shutdown ? provider.shutdown() : Promise.resolve(),
				),
			);
		},
	};
};

export const createStandardFallbackChain = (providers: {
	mlx: ModelProvider;
	ollama: ModelProvider;
	frontier: ModelProvider;
}): ModelProvider =>
	createFallbackChain({
		providers: [providers.mlx, providers.ollama, providers.frontier],
		healthCheckInterval: 30000,
		circuitBreakerThreshold: 3,
		circuitBreakerTimeout: 60000,
		retryAttempts: 2,
		retryDelay: 1000,
	});

export const createLocalFallbackChain = (providers: {
	mlx: ModelProvider;
	ollama: ModelProvider;
}): ModelProvider =>
	createFallbackChain({
		providers: [providers.mlx, providers.ollama],
		healthCheckInterval: 15000,
		circuitBreakerThreshold: 2,
		circuitBreakerTimeout: 30000,
		retryAttempts: 3,
		retryDelay: 500,
	});
