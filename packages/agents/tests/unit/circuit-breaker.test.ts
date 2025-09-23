/**
 * Circuit Breaker Tests
 * Following TDD plan requirements for resilience patterns
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	CircuitBreaker,
	CircuitBreakerFactory,
	CircuitBreakerState,
} from '../../src/lib/circuit-breaker.js';

describe('Circuit Breaker', () => {
	let breaker: CircuitBreaker;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers();
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		breaker = new CircuitBreaker({
			failureThreshold: 3,
			successThreshold: 2,
			resetTimeout: 1000,
			monitoringPeriod: 500,
			maxRetries: 2,
			retryDelay: 100,
			enableMetrics: false, // Disable for cleaner test output
		});
	});
	afterEach(() => {
		breaker.destroy();
		consoleLogSpy.mockRestore();
		vi.useRealTimers();
		vi.clearAllTimers();
	});
	describe('Basic Functionality', () => {
		it('should start in closed state', () => {
			expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
		});

		it('should execute successful calls', async () => {
			const mockFn = vi.fn().mockResolvedValue('success');

			const result = await breaker.call(mockFn);

			expect(result).toBe('success');
			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
		});

		it('should track metrics correctly', async () => {
			const successFn = vi.fn().mockResolvedValue('success');
			const failFn = vi.fn().mockRejectedValue(new Error('failure'));

			await breaker.call(successFn);
			try {
				await breaker.call(failFn);
			} catch {
				// Expected to fail
			}

			const metrics = breaker.getMetrics();

			expect(metrics.totalCalls).toBe(2);
			expect(metrics.successCount).toBe(1);
			expect(metrics.failureCount).toBe(1);
			expect(metrics.failureRate).toBe(0.5);
		});
	});

	describe('State Transitions', () => {
		it('should open circuit after failure threshold', async () => {
			const failFn = vi.fn().mockRejectedValue(new Error('Service down'));

			// Trigger failures up to threshold
			for (let i = 0; i < 3; i++) {
				try {
					await breaker.call(failFn);
				} catch {
					// Expected to fail
				}
			}

			expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
		});

		it('should reject calls when circuit is open', async () => {
			const failFn = vi.fn().mockRejectedValue(new Error('Service down'));

			// Open the circuit
			for (let i = 0; i < 3; i++) {
				try {
					await breaker.call(failFn);
				} catch {
					// Expected to fail
				}
			}

			expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

			// This should be rejected without calling the function
			await expect(breaker.call(failFn)).rejects.toThrow('Circuit breaker is open');

			// Function should not be called when circuit is open
			expect(failFn).toHaveBeenCalledTimes(3); // Only the initial failures
		});

		it('should transition to half-open after reset timeout', async () => {
			const failFn = vi.fn().mockRejectedValue(new Error('Service down'));

			// Open the circuit
			for (let i = 0; i < 3; i++) {
				try {
					await breaker.call(failFn);
				} catch {
					// Expected to fail
				}
			}

			expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

			// Wait for reset timeout
			await new Promise((resolve) => setTimeout(resolve, 1100));

			expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
		});

		it('should close circuit after success threshold in half-open state', async () => {
			// Open the circuit
			const failFn = vi.fn().mockRejectedValue(new Error('Service down'));
			for (let i = 0; i < 3; i++) {
				try {
					await breaker.call(failFn);
				} catch {
					// Expected to fail
				}
			}

			// Transition to half-open
			breaker.forceState(CircuitBreakerState.HALF_OPEN);

			// Successful calls in half-open state
			const successFn = vi.fn().mockResolvedValue('success');
			await breaker.call(successFn);
			await breaker.call(successFn);

			expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
		});

		it('should return to open state on failure in half-open state', async () => {
			// Force half-open state
			breaker.forceState(CircuitBreakerState.HALF_OPEN);

			const failFn = vi.fn().mockRejectedValue(new Error('Still failing'));

			try {
				await breaker.call(failFn);
			} catch {
				// Expected to fail
			}

			expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
		});
	});

	describe('Retry Logic', () => {
		it('should retry failed calls', async () => {
			const retryFn = vi
				.fn()
				.mockRejectedValueOnce(new Error('Fail 1'))
				.mockRejectedValueOnce(new Error('Fail 2'))
				.mockResolvedValueOnce('Success');

			// Start the retry operation
			const resultPromise = breaker.callWithRetry(retryFn);

			// Fast-forward through retry delays
			await vi.runAllTimersAsync();

			const result = await resultPromise;

			expect(result).toBe('Success');
			expect(retryFn).toHaveBeenCalledTimes(3);
		});

		it('should fail after max retries', async () => {
			const alwaysFailFn = vi.fn().mockRejectedValue(new Error('Always fail'));

			// Start the retry operation
			const resultPromise = breaker.callWithRetry(alwaysFailFn);

			// Fast-forward through all retry delays
			await vi.runAllTimersAsync();

			await expect(resultPromise).rejects.toThrow('Always fail');

			// Should be called maxRetries times
			expect(alwaysFailFn).toHaveBeenCalledTimes(2); // maxRetries from config
		});
		it('should not retry when circuit is open', async () => {
			// Open the circuit first
			const failFn = vi.fn().mockRejectedValue(new Error('Service down'));
			for (let i = 0; i < 3; i++) {
				try {
					await breaker.call(failFn);
				} catch {
					// Expected to fail
				}
			}

			expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

			// Try to retry - should fail immediately without retries
			const retryFn = vi.fn().mockRejectedValue(new Error('Still down'));
			await expect(breaker.callWithRetry(retryFn)).rejects.toThrow('Circuit breaker is open');

			expect(retryFn).toHaveBeenCalledTimes(0); // Should not be called at all
		});
	});

	describe('Manual Control', () => {
		it('should allow manual state changes', () => {
			breaker.forceState(CircuitBreakerState.OPEN);
			expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

			breaker.forceState(CircuitBreakerState.HALF_OPEN);
			expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

			breaker.forceState(CircuitBreakerState.CLOSED);
			expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
		});

		it('should reset to initial state', async () => {
			// Trigger some failures
			const failFn = vi.fn().mockRejectedValue(new Error('Failure'));
			for (let i = 0; i < 2; i++) {
				try {
					await breaker.call(failFn);
				} catch {
					// Expected to fail
				}
			}

			const metricsBefore = breaker.getMetrics();
			expect(metricsBefore.failureCount).toBe(2);

			breaker.reset();

			const metricsAfter = breaker.getMetrics();
			expect(metricsAfter.failureCount).toBe(0);
			expect(metricsAfter.successCount).toBe(0);
			expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
		});
	});

	describe('Custom Error Filtering', () => {
		it('should apply custom error filter', async () => {
			const customBreaker = new CircuitBreaker({
				failureThreshold: 2,
				customErrorFilter: (error): boolean => {
					// Only count errors with status >= 500
					return !!(
						error &&
						typeof error === 'object' &&
						'status' in error &&
						(error as { status: number }).status >= 500
					);
				},
				enableMetrics: false,
			});

			const clientError = { status: 400, message: 'Bad Request' };
			const serverError = { status: 500, message: 'Internal Server Error' };

			// Client errors should not count
			try {
				await customBreaker.call(() => Promise.reject(clientError));
			} catch {
				// Expected to fail
			}

			expect(customBreaker.getMetrics().failureCount).toBe(0);
			expect(customBreaker.getState()).toBe(CircuitBreakerState.CLOSED);

			// Server errors should count
			try {
				await customBreaker.call(() => Promise.reject(serverError));
			} catch {
				// Expected to fail
			}

			expect(customBreaker.getMetrics().failureCount).toBe(1);

			customBreaker.destroy();
		});
	});

	describe('State Change Callbacks', () => {
		it('should call state change callback', async () => {
			const stateChangeCallback = vi.fn();

			const callbackBreaker = new CircuitBreaker({
				failureThreshold: 2,
				onStateChange: stateChangeCallback,
				enableMetrics: false,
			});

			const failFn = vi.fn().mockRejectedValue(new Error('Failure'));

			// Trigger state change
			for (let i = 0; i < 2; i++) {
				try {
					await callbackBreaker.call(failFn);
				} catch {
					// Expected to fail
				}
			}

			expect(stateChangeCallback).toHaveBeenCalledWith(
				CircuitBreakerState.OPEN,
				expect.objectContaining({
					state: CircuitBreakerState.OPEN,
					failureCount: 2,
				}),
			);

			callbackBreaker.destroy();
		});
	});
});

describe('CircuitBreakerFactory', () => {
	afterEach(() => {
		CircuitBreakerFactory.destroyAll();
	});

	describe('Instance Management', () => {
		it('should create and return named instances', () => {
			const instance1 = CircuitBreakerFactory.getInstance('test-service');
			const instance2 = CircuitBreakerFactory.getInstance('test-service');

			expect(instance1).toBe(instance2); // Should return same instance
			expect(CircuitBreakerFactory.getInstanceNames()).toContain('test-service');
		});

		it('should create different instances for different names', () => {
			const instance1 = CircuitBreakerFactory.getInstance('service-1');
			const instance2 = CircuitBreakerFactory.getInstance('service-2');

			expect(instance1).not.toBe(instance2);
			expect(CircuitBreakerFactory.getInstanceNames()).toContain('service-1');
			expect(CircuitBreakerFactory.getInstanceNames()).toContain('service-2');
		});

		it('should destroy all instances', () => {
			CircuitBreakerFactory.getInstance('service-1');
			CircuitBreakerFactory.getInstance('service-2');

			expect(CircuitBreakerFactory.getInstanceNames()).toHaveLength(2);

			CircuitBreakerFactory.destroyAll();

			expect(CircuitBreakerFactory.getInstanceNames()).toHaveLength(0);
		});

		it('should get metrics for all instances', async () => {
			const instance1 = CircuitBreakerFactory.getInstance('service-1');
			const instance2 = CircuitBreakerFactory.getInstance('service-2');

			// Make some calls to generate metrics
			await instance1.call(() => Promise.resolve('success'));
			try {
				await instance2.call(() => Promise.reject(new Error('failure')));
			} catch {
				// Expected to fail
			}

			const allMetrics = CircuitBreakerFactory.getAllMetrics();

			expect(allMetrics).toHaveProperty('service-1');
			expect(allMetrics).toHaveProperty('service-2');
			expect(allMetrics['service-1'].successCount).toBe(1);
			expect(allMetrics['service-2'].failureCount).toBe(1);
		});
	});

	describe('Pre-configured Factories', () => {
		it('should create HTTP circuit breaker with appropriate settings', () => {
			const httpBreaker = CircuitBreakerFactory.createHttpCircuitBreaker();

			const metrics = httpBreaker.getMetrics();
			expect(metrics.state).toBe(CircuitBreakerState.CLOSED);

			httpBreaker.destroy();
		});

		it('should create database circuit breaker with appropriate settings', () => {
			const dbBreaker = CircuitBreakerFactory.createDatabaseCircuitBreaker();

			const metrics = dbBreaker.getMetrics();
			expect(metrics.state).toBe(CircuitBreakerState.CLOSED);

			dbBreaker.destroy();
		});

		it('should create API circuit breaker with appropriate settings', () => {
			const apiBreaker = CircuitBreakerFactory.createApiCircuitBreaker();

			const metrics = apiBreaker.getMetrics();
			expect(metrics.state).toBe(CircuitBreakerState.CLOSED);

			apiBreaker.destroy();
		});
	});
});

describe('Edge Cases and Error Handling', () => {
	let breaker: CircuitBreaker;

	beforeEach(() => {
		breaker = new CircuitBreaker({
			failureThreshold: 2,
			successThreshold: 1,
			resetTimeout: 100,
			enableMetrics: false,
		});
	});

	afterEach(() => {
		breaker.destroy();
	});

	it('should handle synchronous errors', async () => {
		const syncErrorFn = () => {
			throw new Error('Synchronous error');
		};

		await expect(breaker.call(syncErrorFn)).rejects.toThrow('Synchronous error');

		const metrics = breaker.getMetrics();
		expect(metrics.failureCount).toBe(1);
	});

	it('should handle null and undefined return values', async () => {
		const nullFn = vi.fn().mockResolvedValue(null);
		const undefinedFn = vi.fn().mockResolvedValue(undefined);

		const nullResult = await breaker.call(nullFn);
		const undefinedResult = await breaker.call(undefinedFn);

		expect(nullResult).toBeNull();
		expect(undefinedResult).toBeUndefined();

		const metrics = breaker.getMetrics();
		expect(metrics.successCount).toBe(2);
	});

	it('should handle concurrent calls correctly', async () => {
		const slowFn = vi
			.fn()
			.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('success'), 50)));

		// Start multiple concurrent calls
		const promises = Array.from({ length: 5 }, () => breaker.call(slowFn));

		const results = await Promise.all(promises);

		expect(results).toEqual(['success', 'success', 'success', 'success', 'success']);
		expect(slowFn).toHaveBeenCalledTimes(5);

		const metrics = breaker.getMetrics();
		expect(metrics.totalCalls).toBe(5);
		expect(metrics.successCount).toBe(5);
	});
});
