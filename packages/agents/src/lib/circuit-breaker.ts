/**
 * Circuit Breaker Implementation
 * Implements circuit breaker pattern for external service calls
 * Following TDD plan requirements for resilience and fault tolerance
 */

import { z } from 'zod';
import { AgentError, ErrorCategory, ErrorSeverity } from './error-handling.js';

// Circuit breaker states
export const CircuitBreakerState = {
	CLOSED: 'closed',
	OPEN: 'open',
	HALF_OPEN: 'half_open',
} as const;

export type CircuitBreakerStateType =
	(typeof CircuitBreakerState)[keyof typeof CircuitBreakerState];

// Circuit breaker options
export interface CircuitBreakerOptions {
	failureThreshold: number;
	successThreshold: number;
	resetTimeout: number;
	monitoringPeriod: number;
	maxRetries: number;
	retryDelay: number;
	enableMetrics: boolean;
	customErrorFilter?: (error: unknown) => boolean;
	onStateChange?: (state: CircuitBreakerStateType, metrics: CircuitBreakerMetrics) => void;
}

// Default options
export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
	failureThreshold: 5,
	successThreshold: 3,
	resetTimeout: 60000, // 1 minute
	monitoringPeriod: 10000, // 10 seconds
	maxRetries: 3,
	retryDelay: 1000,
	enableMetrics: true,
	customErrorFilter: () => true, // Count all errors by default
};

// Circuit breaker metrics
export interface CircuitBreakerMetrics {
	state: CircuitBreakerStateType;
	failureCount: number;
	successCount: number;
	totalCalls: number;
	failureRate: number;
	lastFailureTime: number | null;
	lastSuccessTime: number | null;
	stateChangeTime: number;
	timeInCurrentState: number;
}

// Call result interface
export interface CallResult<T> {
	success: boolean;
	result?: T;
	error?: AgentError;
	duration: number;
	timestamp: number;
	circuitBreakerState: CircuitBreakerStateType;
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
	private state: CircuitBreakerStateType = CircuitBreakerState.CLOSED;
	private options: CircuitBreakerOptions;
	private failureCount = 0;
	private successCount = 0;
	private totalCalls = 0;
	private lastFailureTime: number | null = null;
	private lastSuccessTime: number | null = null;
	private stateChangeTime = Date.now();
	private resetTimer: NodeJS.Timeout | null = null;
	private monitoringTimer: NodeJS.Timeout | null = null;

	constructor(options: Partial<CircuitBreakerOptions> = {}) {
		this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options };
		this.startMonitoring();
	}

	/**
	 * Execute a function with circuit breaker protection
	 */
	async call<T>(fn: () => Promise<T>): Promise<T> {
		this.totalCalls++;

		try {
			// Check if circuit is open
			if (this.state === CircuitBreakerState.OPEN) {
				throw new AgentError(
					'Circuit breaker is open',
					ErrorCategory.NETWORK,
					ErrorSeverity.MEDIUM,
					{ circuitBreakerState: this.state },
				);
			}

			// Execute the function
			const result = await fn();

			// Record success
			this.onSuccess();

			return result;
		} catch (error) {
			// Record failure
			this.onFailure(error);

			// Re-throw the error
			if (error instanceof AgentError) {
				throw error;
			}

			throw AgentError.fromUnknown(error, {
				circuitBreakerState: this.state,
				timestamp: Date.now(),
			});
		}
	}

	/**
	 * Execute with automatic retry logic
	 */
	async callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
		let lastError: AgentError | null = null;

		for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
			try {
				const result = await this.call(fn);
				return result;
			} catch (error) {
				lastError = error instanceof AgentError ? error : AgentError.fromUnknown(error);

				// Don't retry if circuit is open
				if (this.state === CircuitBreakerState.OPEN) {
					break;
				}

				// Don't retry on last attempt
				if (attempt === this.options.maxRetries) {
					break;
				}

				// Wait before retry
				await this.delay(this.options.retryDelay * attempt);
			}
		}

		throw (
			lastError || new AgentError('Max retries exceeded', ErrorCategory.NETWORK, ErrorSeverity.HIGH)
		);
	}

	/**
	 * Get current state
	 */
	getState(): CircuitBreakerStateType {
		return this.state;
	}

	/**
	 * Get current metrics
	 */
	getMetrics(): CircuitBreakerMetrics {
		const now = Date.now();
		return {
			state: this.state,
			failureCount: this.failureCount,
			successCount: this.successCount,
			totalCalls: this.totalCalls,
			failureRate: this.totalCalls > 0 ? this.failureCount / this.totalCalls : 0,
			lastFailureTime: this.lastFailureTime,
			lastSuccessTime: this.lastSuccessTime,
			stateChangeTime: this.stateChangeTime,
			timeInCurrentState: now - this.stateChangeTime,
		};
	}

	/**
	 * Force state change (for testing/manual control)
	 */
	forceState(state: CircuitBreakerStateType): void {
		if (state !== this.state) {
			this.changeState(state);
		}
	}

	/**
	 * Reset circuit breaker to initial state
	 */
	reset(): void {
		this.failureCount = 0;
		this.successCount = 0;
		this.lastFailureTime = null;
		this.lastSuccessTime = null;
		this.changeState(CircuitBreakerState.CLOSED);
		this.clearResetTimer();
	}

	/**
	 * Destroy circuit breaker and cleanup resources
	 */
	destroy(): void {
		this.clearResetTimer();
		this.clearMonitoringTimer();
	}

	/**
	 * Handle successful call
	 */
	private onSuccess(): void {
		this.successCount++;
		this.lastSuccessTime = Date.now();

		if (this.state === CircuitBreakerState.HALF_OPEN) {
			// Check if we should close the circuit
			if (this.successCount >= this.options.successThreshold) {
				this.changeState(CircuitBreakerState.CLOSED);
				this.failureCount = 0; // Reset failure count
			}
		}
	}

	/**
	 * Handle failed call
	 */
	private onFailure(error: unknown): void {
		// Apply custom error filter if provided
		if (this.options.customErrorFilter && !this.options.customErrorFilter(error)) {
			return; // Don't count this error
		}

		this.failureCount++;
		this.lastFailureTime = Date.now();

		if (this.state === CircuitBreakerState.CLOSED) {
			// Check if we should open the circuit
			if (this.failureCount >= this.options.failureThreshold) {
				this.changeState(CircuitBreakerState.OPEN);
			}
		} else if (this.state === CircuitBreakerState.HALF_OPEN) {
			// Failure in half-open state - go back to open
			this.changeState(CircuitBreakerState.OPEN);
		}
	}

	/**
	 * Change circuit breaker state
	 */
	private changeState(newState: CircuitBreakerStateType): void {
		const oldState = this.state;
		this.state = newState;
		this.stateChangeTime = Date.now();

		if (this.options.enableMetrics) {
			console.log(`🔄 Circuit breaker state changed: ${oldState} → ${newState}`);
		}

		// Handle state-specific logic
		if (newState === CircuitBreakerState.OPEN) {
			this.startResetTimer();
		} else if (newState === CircuitBreakerState.CLOSED) {
			this.clearResetTimer();
		} else if (newState === CircuitBreakerState.HALF_OPEN) {
			this.successCount = 0; // Reset success count for half-open state
		}

		// Notify state change callback
		if (this.options.onStateChange) {
			this.options.onStateChange(newState, this.getMetrics());
		}
	}

	/**
	 * Start reset timer for open state
	 */
	private startResetTimer(): void {
		this.clearResetTimer();
		this.resetTimer = setTimeout(() => {
			if (this.state === CircuitBreakerState.OPEN) {
				this.changeState(CircuitBreakerState.HALF_OPEN);
			}
		}, this.options.resetTimeout);
	}

	/**
	 * Clear reset timer
	 */
	private clearResetTimer(): void {
		if (this.resetTimer) {
			clearTimeout(this.resetTimer);
			this.resetTimer = null;
		}
	}

	/**
	 * Start monitoring timer for periodic metrics
	 */
	private startMonitoring(): void {
		if (!this.options.enableMetrics) {
			return;
		}

		this.monitoringTimer = setInterval(() => {
			const metrics = this.getMetrics();
			if (this.options.enableMetrics) {
				console.log(`📊 Circuit breaker metrics: ${JSON.stringify(metrics)}`);
			}
		}, this.options.monitoringPeriod);
	}

	/**
	 * Clear monitoring timer
	 */
	private clearMonitoringTimer(): void {
		if (this.monitoringTimer) {
			clearInterval(this.monitoringTimer);
			this.monitoringTimer = null;
		}
	}

	/**
	 * Utility delay function
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

/**
 * Circuit breaker factory for creating pre-configured instances
 */
const circuitBreakerInstances = new Map<string, CircuitBreaker>();

/**
 * Get or create a named circuit breaker instance
 */
export function getCircuitBreakerInstance(
	name: string,
	options?: Partial<CircuitBreakerOptions>,
): CircuitBreaker {
	if (!circuitBreakerInstances.has(name)) {
		circuitBreakerInstances.set(name, new CircuitBreaker(options));
	}
	const instance = circuitBreakerInstances.get(name);
	if (!instance) {
		throw new Error(`Failed to create circuit breaker instance: ${name}`);
	}
	return instance;
}

/**
 * Create a circuit breaker for HTTP services
 */
export function createHttpCircuitBreaker(options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
	return new CircuitBreaker({
		failureThreshold: 5,
		successThreshold: 3,
		resetTimeout: 30000, // 30 seconds
		maxRetries: 3,
		retryDelay: 1000,
		customErrorFilter: (error) => {
			// Don't count client errors (4xx) as circuit breaker failures
			if (error && typeof error === 'object' && 'status' in error) {
				const status = (error as { status: number }).status;
				return status >= 500; // Only count server errors
			}
			return true;
		},
		...options,
	});
}

/**
 * Create a circuit breaker for database operations
 */
export function createDatabaseCircuitBreaker(
	options?: Partial<CircuitBreakerOptions>,
): CircuitBreaker {
	return new CircuitBreaker({
		failureThreshold: 3,
		successThreshold: 2,
		resetTimeout: 60000, // 1 minute
		maxRetries: 2,
		retryDelay: 2000,
		customErrorFilter: (error) => {
			// Don't count syntax errors as circuit breaker failures
			if (error && typeof error === 'object' && 'code' in error) {
				const code = (error as { code: string }).code;
				return !code.startsWith('SYNTAX_ERROR');
			}
			return true;
		},
		...options,
	});
}

/**
 * Create a circuit breaker for external API calls
 */
export function createApiCircuitBreaker(options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
	return new CircuitBreaker({
		failureThreshold: 10,
		successThreshold: 5,
		resetTimeout: 120000, // 2 minutes
		maxRetries: 5,
		retryDelay: 1500,
		...options,
	});
}

/**
 * Destroy all circuit breaker instances
 */
export function destroyAllCircuitBreakers(): void {
	for (const [name, instance] of circuitBreakerInstances) {
		instance.destroy();
		circuitBreakerInstances.delete(name);
	}
}

/**
 * Get all instance names
 */
export function getCircuitBreakerInstanceNames(): string[] {
	return Array.from(circuitBreakerInstances.keys());
}

/**
 * Get metrics for all instances
 */
export function getAllCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
	const metrics: Record<string, CircuitBreakerMetrics> = {};
	for (const [name, instance] of circuitBreakerInstances) {
		metrics[name] = instance.getMetrics();
	}
	return metrics;
}

/**
 * Decorator for automatic circuit breaker protection
 */
export function circuitBreaker(options?: Partial<CircuitBreakerOptions>) {
	return (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
		if (!descriptor || typeof descriptor.value !== 'function') {
			throw new Error('Circuit breaker decorator can only be applied to methods');
		}

		const originalMethod = descriptor.value;
		const cb = new CircuitBreaker(options);

		descriptor.value = async function (...args: unknown[]) {
			return cb.call(() => originalMethod.apply(this, args));
		};

		return descriptor;
	};
}

/**
 * Validation schemas
 */
export const CircuitBreakerOptionsSchema = z.object({
	failureThreshold: z.number().min(1),
	successThreshold: z.number().min(1),
	resetTimeout: z.number().min(1000),
	monitoringPeriod: z.number().min(1000),
	maxRetries: z.number().min(1),
	retryDelay: z.number().min(100),
	enableMetrics: z.boolean(),
});

export const CircuitBreakerStateSchema = z.enum(['closed', 'open', 'half_open']);
