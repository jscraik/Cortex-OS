/**
 * Circuit Breaker Implementation for Agent Failure Protection
 * Prevents cascading failures by temporarily disabling failing agents
 */

import { EventEmitter } from 'node:events';

export interface CircuitBreakerOptions {
	failureThreshold: number;
	recoveryTimeoutMs: number;
	monitoringWindowMs: number;
	halfOpenMaxCalls: number;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerStats {
	state: CircuitBreakerState;
	failures: number;
	successes: number;
	lastFailureTime: number;
	lastSuccessTime: number;
	totalCalls: number;
	failureRate: number;
}

/**
 * Circuit Breaker class to prevent cascading failures
 */
export class CircuitBreaker extends EventEmitter {
	private state: CircuitBreakerState = 'closed';
	private failures = 0;
	private successes = 0;
	private lastFailureTime = 0;
	private lastSuccessTime = 0;
	private totalCalls = 0;
	private halfOpenCalls = 0;
	private windowStartTime = Date.now();

	constructor(
		private readonly name: string,
		private readonly options: CircuitBreakerOptions = {
			failureThreshold: 5,
			recoveryTimeoutMs: 60000, // 1 minute
			monitoringWindowMs: 300000, // 5 minutes
			halfOpenMaxCalls: 3,
		},
	) {
		super();
	}

	/**
	 * Execute a function with circuit breaker protection
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		this.totalCalls++;

		// Check if we need to transition states
		this.updateState();

		if (this.state === 'open') {
			const error = new Error(`Circuit breaker '${this.name}' is open`);
			(error as any).code = 'CIRCUIT_BREAKER_OPEN';
			this.emit('rejected', { name: this.name, error });
			throw error;
		}

		if (this.state === 'half-open' && this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
			const error = new Error(`Circuit breaker '${this.name}' half-open call limit exceeded`);
			(error as any).code = 'CIRCUIT_BREAKER_HALF_OPEN_LIMIT';
			this.emit('rejected', { name: this.name, error });
			throw error;
		}

		try {
			if (this.state === 'half-open') {
				this.halfOpenCalls++;
			}

			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure(error);
			throw error;
		}
	}

	/**
	 * Handle successful execution
	 */
	private onSuccess(): void {
		this.successes++;
		this.lastSuccessTime = Date.now();
		this.resetWindowIfNeeded();

		if (this.state === 'half-open') {
			// If we've had enough successes in half-open state, close the circuit
			if (this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
				this.state = 'closed';
				this.failures = 0;
				this.halfOpenCalls = 0;
				this.emit('stateChanged', {
					name: this.name,
					previousState: 'half-open',
					currentState: 'closed',
					reason: 'successful_recovery',
				});
			}
		}

		this.emit('success', { name: this.name, stats: this.getStats() });
	}

	/**
	 * Handle failed execution
	 */
	private onFailure(error: any): void {
		this.failures++;
		this.lastFailureTime = Date.now();
		this.resetWindowIfNeeded();

		if (this.state === 'half-open') {
			// Failure in half-open state immediately opens the circuit
			this.state = 'open';
			this.halfOpenCalls = 0;
			this.emit('stateChanged', {
				name: this.name,
				previousState: 'half-open',
				currentState: 'open',
				reason: 'half_open_failure',
			});
		} else if (this.state === 'closed' && this.shouldOpen()) {
			this.state = 'open';
			this.emit('stateChanged', {
				name: this.name,
				previousState: 'closed',
				currentState: 'open',
				reason: 'threshold_exceeded',
			});
		}

		this.emit('failure', { name: this.name, error, stats: this.getStats() });
	}

	/**
	 * Update circuit breaker state based on current conditions
	 */
	private updateState(): void {
		if (this.state === 'open') {
			// Check if we should transition to half-open
			const timeSinceLastFailure = Date.now() - this.lastFailureTime;
			if (timeSinceLastFailure >= this.options.recoveryTimeoutMs) {
				this.state = 'half-open';
				this.halfOpenCalls = 0;
				this.emit('stateChanged', {
					name: this.name,
					previousState: 'open',
					currentState: 'half-open',
					reason: 'recovery_timeout_elapsed',
				});
			}
		}
	}

	/**
	 * Check if circuit should be opened based on failure threshold
	 */
	private shouldOpen(): boolean {
		const windowElapsed = Date.now() - this.windowStartTime;
		if (
			windowElapsed < this.options.monitoringWindowMs &&
			this.totalCalls < this.options.failureThreshold
		) {
			return false; // Not enough data yet
		}

		return this.failures >= this.options.failureThreshold;
	}

	/**
	 * Reset monitoring window if needed
	 */
	private resetWindowIfNeeded(): void {
		const windowElapsed = Date.now() - this.windowStartTime;
		if (windowElapsed >= this.options.monitoringWindowMs) {
			this.windowStartTime = Date.now();
			this.failures = 0;
			this.successes = 0;
			this.totalCalls = 0;
		}
	}

	/**
	 * Get current circuit breaker statistics
	 */
	getStats(): CircuitBreakerStats {
		const totalRequests = this.failures + this.successes;
		const failureRate = totalRequests > 0 ? this.failures / totalRequests : 0;

		return {
			state: this.state,
			failures: this.failures,
			successes: this.successes,
			lastFailureTime: this.lastFailureTime,
			lastSuccessTime: this.lastSuccessTime,
			totalCalls: this.totalCalls,
			failureRate,
		};
	}

	/**
	 * Manually open the circuit breaker
	 */
	open(): void {
		const previousState = this.state;
		this.state = 'open';
		this.lastFailureTime = Date.now();

		this.emit('stateChanged', {
			name: this.name,
			previousState,
			currentState: 'open',
			reason: 'manually_opened',
		});
	}

	/**
	 * Manually close the circuit breaker
	 */
	close(): void {
		const previousState = this.state;
		this.state = 'closed';
		this.failures = 0;
		this.halfOpenCalls = 0;

		this.emit('stateChanged', {
			name: this.name,
			previousState,
			currentState: 'closed',
			reason: 'manually_closed',
		});
	}

	/**
	 * Check if circuit breaker is currently open
	 */
	isOpen(): boolean {
		this.updateState();
		return this.state === 'open';
	}

	/**
	 * Check if circuit breaker is currently closed
	 */
	isClosed(): boolean {
		this.updateState();
		return this.state === 'closed';
	}

	/**
	 * Check if circuit breaker is currently half-open
	 */
	isHalfOpen(): boolean {
		this.updateState();
		return this.state === 'half-open';
	}
}

/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export class CircuitBreakerManager extends EventEmitter {
	private circuitBreakers = new Map<string, CircuitBreaker>();

	/**
	 * Get or create a circuit breaker for the given name
	 */
	getCircuitBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
		if (!this.circuitBreakers.has(name)) {
			const circuitBreaker = new CircuitBreaker(name, {
				failureThreshold: 5,
				recoveryTimeoutMs: 60000,
				monitoringWindowMs: 300000,
				halfOpenMaxCalls: 3,
				...options,
			});

			// Forward all events from individual circuit breakers
			circuitBreaker.on('stateChanged', (event) => this.emit('stateChanged', event));
			circuitBreaker.on('success', (event) => this.emit('success', event));
			circuitBreaker.on('failure', (event) => this.emit('failure', event));
			circuitBreaker.on('rejected', (event) => this.emit('rejected', event));

			this.circuitBreakers.set(name, circuitBreaker);
		}

		return this.circuitBreakers.get(name)!;
	}

	/**
	 * Execute a function with circuit breaker protection
	 */
	async execute<T>(
		name: string,
		fn: () => Promise<T>,
		options?: Partial<CircuitBreakerOptions>,
	): Promise<T> {
		const circuitBreaker = this.getCircuitBreaker(name, options);
		return circuitBreaker.execute(fn);
	}

	/**
	 * Get statistics for all circuit breakers
	 */
	getAllStats(): Record<string, CircuitBreakerStats> {
		const stats: Record<string, CircuitBreakerStats> = {};
		for (const [name, circuitBreaker] of this.circuitBreakers) {
			stats[name] = circuitBreaker.getStats();
		}
		return stats;
	}

	/**
	 * Get statistics for a specific circuit breaker
	 */
	getStats(name: string): CircuitBreakerStats | null {
		const circuitBreaker = this.circuitBreakers.get(name);
		return circuitBreaker ? circuitBreaker.getStats() : null;
	}

	/**
	 * Remove a circuit breaker
	 */
	removeCircuitBreaker(name: string): boolean {
		const circuitBreaker = this.circuitBreakers.get(name);
		if (circuitBreaker) {
			circuitBreaker.removeAllListeners();
			this.circuitBreakers.delete(name);
			return true;
		}
		return false;
	}

	/**
	 * Clear all circuit breakers
	 */
	clear(): void {
		for (const circuitBreaker of this.circuitBreakers.values()) {
			circuitBreaker.removeAllListeners();
		}
		this.circuitBreakers.clear();
	}
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();
