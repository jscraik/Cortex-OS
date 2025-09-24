/**
 * Circuit Breaker and Failover System
 * Implements MLX to Ollama failover with circuit breaker pattern
 */

import { EventEmitter } from 'node:events';

/**
 * Circuit breaker states
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
	failureThreshold: number;
	recoveryTimeout: number;
	monitoringPeriod: number;
	halfOpenMaxCalls: number;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
	state: CircuitState;
	failures: number;
	successes: number;
	totalRequests: number;
	lastFailureTime: number | null;
	nextAttemptTime: number | null;
}

/**
 * Failover provider configuration
 */
export interface FailoverProvider {
	name: string;
	type: 'mlx' | 'ollama';
	priority: number;
	healthCheck: () => Promise<boolean>;
	execute: <T>(operation: () => Promise<T>) => Promise<T>;
}

/**
 * Production Circuit Breaker with comprehensive monitoring
 */
export class CircuitBreaker extends EventEmitter {
	private state: CircuitState = 'CLOSED';
	private failures = 0;
	private successes = 0;
	private totalRequests = 0;
	private lastFailureTime: number | null = null;
	private nextAttemptTime: number | null = null;
	private halfOpenCalls = 0;

	constructor(private readonly config: CircuitBreakerConfig) {
		super();
	}

	/**
	 * Execute operation with circuit breaker protection
	 */
	async execute<T>(operation: () => Promise<T>): Promise<T> {
		this.totalRequests++;

		if (this.state === 'OPEN') {
			if (this.shouldAttemptReset()) {
				this.moveToHalfOpen();
			} else {
				this.emit('circuitOpen', this.getStats());
				throw new Error('Circuit breaker is OPEN - operation rejected');
			}
		}

		if (this.state === 'HALF_OPEN') {
			if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
				this.emit('circuitOpen', this.getStats());
				throw new Error('Circuit breaker HALF_OPEN limit exceeded');
			}
			this.halfOpenCalls++;
		}

		try {
			const result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	/**
	 * Get current circuit breaker statistics
	 */
	getStats(): CircuitBreakerStats {
		return {
			state: this.state,
			failures: this.failures,
			successes: this.successes,
			totalRequests: this.totalRequests,
			lastFailureTime: this.lastFailureTime,
			nextAttemptTime: this.nextAttemptTime,
		};
	}

	/**
	 * Manually reset circuit breaker
	 */
	reset(): void {
		this.state = 'CLOSED';
		this.failures = 0;
		this.halfOpenCalls = 0;
		this.lastFailureTime = null;
		this.nextAttemptTime = null;
		this.emit('circuitReset', this.getStats());
	}

	/**
	 * Handle successful operation
	 */
	private onSuccess(): void {
		this.failures = 0;
		this.successes++;

		if (this.state === 'HALF_OPEN') {
			this.moveToClosed();
		}
	}

	/**
	 * Handle failed operation
	 */
	private onFailure(): void {
		this.failures++;
		this.lastFailureTime = Date.now();

		if (this.failures >= this.config.failureThreshold) {
			this.moveToOpen();
		}
	}

	/**
	 * Check if should attempt reset from OPEN to HALF_OPEN
	 */
	private shouldAttemptReset(): boolean {
		if (this.nextAttemptTime === null) {
			return false;
		}
		return Date.now() >= this.nextAttemptTime;
	}

	/**
	 * Move to CLOSED state
	 */
	private moveToClosed(): void {
		this.state = 'CLOSED';
		this.halfOpenCalls = 0;
		this.emit('circuitClosed', this.getStats());
	}

	/**
	 * Move to OPEN state
	 */
	private moveToOpen(): void {
		this.state = 'OPEN';
		this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
		this.emit('circuitOpened', this.getStats());
	}

	/**
	 * Move to HALF_OPEN state
	 */
	private moveToHalfOpen(): void {
		this.state = 'HALF_OPEN';
		this.halfOpenCalls = 0;
		this.nextAttemptTime = null;
		this.emit('circuitHalfOpen', this.getStats());
	}
}

/**
 * Multi-Provider Failover System with Circuit Breakers
 */
export class FailoverSystem extends EventEmitter {
	private circuitBreakers = new Map<string, CircuitBreaker>();
	private providers: FailoverProvider[] = [];
	private currentProvider: FailoverProvider | null = null;

	constructor(
		providers: FailoverProvider[],
		private readonly circuitConfig: CircuitBreakerConfig = {
			failureThreshold: 5,
			recoveryTimeout: 30000, // 30 seconds
			monitoringPeriod: 60000, // 1 minute
			halfOpenMaxCalls: 3,
		},
	) {
		super();
		this.providers = providers.sort((a, b) => b.priority - a.priority);
		this.initializeCircuitBreakers();
	}

	/**
	 * Execute operation with failover support
	 */
	async execute<T>(operation: (provider: FailoverProvider) => Promise<T>): Promise<T> {
		const availableProviders = await this.getAvailableProviders();

		if (availableProviders.length === 0) {
			throw new Error('All providers are unavailable');
		}

		let lastError: Error | null = null;

		for (const provider of availableProviders) {
			const circuitBreaker = this.circuitBreakers.get(provider.name);

			if (!circuitBreaker) {
				continue; // Skip if circuit breaker not found
			}

			try {
				const result = await circuitBreaker.execute(() => operation(provider));

				// Update current provider if different
				if (this.currentProvider?.name !== provider.name) {
					this.currentProvider = provider;
					this.emit('providerChanged', {
						from: this.currentProvider?.name || null,
						to: provider.name,
						type: provider.type,
					});
				}

				return result;
			} catch (error) {
				lastError = error as Error;
				this.emit('providerFailed', {
					provider: provider.name,
					type: provider.type,
					error: error,
				});
			}
		}

		// All providers failed
		this.emit('allProvidersFailed', {
			totalProviders: availableProviders.length,
			lastError: lastError?.message,
		});

		throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
	}

	/**
	 * Get current provider status
	 */
	getStatus(): {
		currentProvider: FailoverProvider | null;
		providers: Array<{
			name: string;
			type: 'mlx' | 'ollama';
			priority: number;
			circuitState: CircuitState;
			stats: CircuitBreakerStats;
		}>;
	} {
		return {
			currentProvider: this.currentProvider,
			providers: this.providers.map((provider) => {
				const circuitBreaker = this.circuitBreakers.get(provider.name);
				const stats = circuitBreaker?.getStats() || {
					state: 'CLOSED' as CircuitState,
					failures: 0,
					successes: 0,
					totalRequests: 0,
					lastFailureTime: null,
					nextAttemptTime: null,
				};
				return {
					name: provider.name,
					type: provider.type,
					priority: provider.priority,
					circuitState: stats.state,
					stats,
				};
			}),
		};
	}

	/**
	 * Manually reset all circuit breakers
	 */
	resetAllCircuitBreakers(): void {
		for (const circuitBreaker of this.circuitBreakers.values()) {
			circuitBreaker.reset();
		}
		this.emit('allCircuitsReset');
	}

	/**
	 * Add a new provider to the system
	 */
	addProvider(provider: FailoverProvider): void {
		this.providers.push(provider);
		this.providers.sort((a, b) => b.priority - a.priority);

		const circuitBreaker = new CircuitBreaker(this.circuitConfig);
		this.circuitBreakers.set(provider.name, circuitBreaker);

		// Forward circuit breaker events
		this.setupCircuitBreakerEvents(provider.name, circuitBreaker);

		this.emit('providerAdded', provider.name);
	}

	/**
	 * Remove a provider from the system
	 */
	removeProvider(providerName: string): void {
		this.providers = this.providers.filter((p) => p.name !== providerName);
		this.circuitBreakers.delete(providerName);

		if (this.currentProvider?.name === providerName) {
			this.currentProvider = null;
		}

		this.emit('providerRemoved', providerName);
	}

	/**
	 * Get available providers (with health checks)
	 */
	private async getAvailableProviders(): Promise<FailoverProvider[]> {
		const available: FailoverProvider[] = [];

		for (const provider of this.providers) {
			const circuitBreaker = this.circuitBreakers.get(provider.name);

			// Skip if circuit breaker not found or circuit is open
			if (!circuitBreaker || circuitBreaker.getStats().state === 'OPEN') {
				continue;
			}

			try {
				// Quick health check
				const isHealthy = await Promise.race([
					provider.healthCheck(),
					new Promise<boolean>((_, reject) =>
						setTimeout(() => reject(new Error('Health check timeout')), 5000),
					),
				]);

				if (isHealthy) {
					available.push(provider);
				}
			} catch {}
		}

		return available;
	}

	/**
	 * Initialize circuit breakers for all providers
	 */
	private initializeCircuitBreakers(): void {
		for (const provider of this.providers) {
			const circuitBreaker = new CircuitBreaker(this.circuitConfig);
			this.circuitBreakers.set(provider.name, circuitBreaker);
			this.setupCircuitBreakerEvents(provider.name, circuitBreaker);
		}
	}

	/**
	 * Setup event forwarding for circuit breaker
	 */
	private setupCircuitBreakerEvents(providerName: string, circuitBreaker: CircuitBreaker): void {
		circuitBreaker.on('circuitOpened', (stats) => {
			this.emit('circuitBreakerOpened', { provider: providerName, stats });
		});

		circuitBreaker.on('circuitClosed', (stats) => {
			this.emit('circuitBreakerClosed', { provider: providerName, stats });
		});

		circuitBreaker.on('circuitHalfOpen', (stats) => {
			this.emit('circuitBreakerHalfOpen', { provider: providerName, stats });
		});
	}
}

/**
 * Factory function to create a configured failover system
 */
export function createMLXFailoverSystem(): FailoverSystem {
	const providers: FailoverProvider[] = [
		{
			name: 'mlx-primary',
			type: 'mlx',
			priority: 100, // High priority for MLX
			healthCheck: async () => {
				// Check if MLX is available and responsive
				try {
					const { MLXClient } = await import('./index');
					const client = new MLXClient();
					const health = await client.health();
					return health.status === 'healthy';
				} catch {
					return false;
				}
			},
			execute: async <T>(operation: () => Promise<T>) => {
				return operation();
			},
		},
		{
			name: 'ollama-fallback',
			type: 'ollama',
			priority: 10, // Lower priority as fallback
			healthCheck: async () => {
				// Check if Ollama is available
				try {
					const response = await fetch('http://localhost:11434/api/version', {
						signal: AbortSignal.timeout(3000),
					});
					return response.ok;
				} catch {
					return false;
				}
			},
			execute: async <T>(operation: () => Promise<T>) => {
				return operation();
			},
		},
	];

	return new FailoverSystem(providers);
}
