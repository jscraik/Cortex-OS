/**
 * Resilient Executor Tests - brAInwav Agent Toolkit
 *
 * Tests for circuit breaker and retry logic
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createResilientExecutor } from '../src/resilience/ResilientExecutor.js';

describe('brAInwav Resilient Executor', () => {
	beforeEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	describe('Basic Execution', () => {
		it('should execute successful operations without retry', async () => {
			const executor = createResilientExecutor();
			const fn = vi.fn().mockResolvedValue('success');

			const result = await executor.execute(fn);

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(1);
			expect(executor.getHealth().healthy).toBe(true);
		});

		it('should work when disabled', async () => {
			const executor = createResilientExecutor({ enabled: false });
			const fn = vi.fn().mockResolvedValue('success');

			const result = await executor.execute(fn);

			expect(result).toBe('success');
			expect(executor.isEnabled()).toBe(false);
		});
	});

	describe('Circuit Breaker', () => {
		it('should open circuit after failure threshold', async () => {
			const executor = createResilientExecutor({
				circuitBreaker: {
					failureThreshold: 3,
					timeout: 1000,
				},
				retry: {
					maxAttempts: 1, // No retries to test circuit breaker directly
				},
			});

			const fn = vi.fn().mockRejectedValue(new Error('Service unavailable'));

			// First 3 failures should go through
			for (let i = 0; i < 3; i++) {
				await expect(executor.execute(fn)).rejects.toThrow('Service unavailable');
			}

			expect(executor.getHealth().circuitState).toBe('open');

			// Next call should be blocked by circuit breaker
			await expect(executor.execute(fn)).rejects.toThrow('Circuit breaker open');
		});

		it('should transition to half-open after timeout', async () => {
			vi.useFakeTimers();

			const executor = createResilientExecutor({
				circuitBreaker: {
					failureThreshold: 2,
					timeout: 5000,
				},
				retry: {
					maxAttempts: 1,
				},
			});

			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail'))
				.mockRejectedValueOnce(new Error('fail'))
				.mockResolvedValueOnce('success');

			// Trigger circuit breaker
			await expect(executor.execute(fn)).rejects.toThrow();
			await expect(executor.execute(fn)).rejects.toThrow();

			expect(executor.getHealth().circuitState).toBe('open');

			// Fast-forward past timeout
			vi.advanceTimersByTime(6000);

			// Should allow probe in half-open state
			const result = await executor.execute(fn);
			expect(result).toBe('success');
			expect(executor.getHealth().circuitState).toBe('closed');

			vi.useRealTimers();
		});

		it('should close circuit after success threshold in half-open state', async () => {
			vi.useFakeTimers();

			const executor = createResilientExecutor({
				circuitBreaker: {
					failureThreshold: 2,
					successThreshold: 2,
					timeout: 1000,
				},
				retry: {
					maxAttempts: 1,
				},
			});

			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail'))
				.mockRejectedValueOnce(new Error('fail'))
				.mockResolvedValueOnce('success-1')
				.mockResolvedValueOnce('success-2');

			// Open circuit
			await expect(executor.execute(fn)).rejects.toThrow();
			await expect(executor.execute(fn)).rejects.toThrow();

			expect(executor.getHealth().circuitState).toBe('open');

			// Wait for timeout
			vi.advanceTimersByTime(1500);

			// First success in half-open
			await executor.execute(fn);
			expect(executor.getHealth().circuitState).toBe('half-open');

			// Second success should close circuit
			await executor.execute(fn);
			expect(executor.getHealth().circuitState).toBe('closed');

			vi.useRealTimers();
		});
	});

	describe('Retry Logic', () => {
		it('should retry failed operations up to max attempts', async () => {
			const executor = createResilientExecutor({
				retry: {
					maxAttempts: 3,
					initialDelay: 10,
				},
			});

			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('Network error'))
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce('success');

			const result = await executor.execute(fn);

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
		});

		it('should not retry validation errors', async () => {
			const executor = createResilientExecutor({
				retry: {
					maxAttempts: 3,
				},
			});

			const fn = vi.fn().mockRejectedValue(new Error('Validation failed'));

			await expect(executor.execute(fn)).rejects.toThrow('Validation failed');
			expect(fn).toHaveBeenCalledTimes(1); // No retries for validation errors
		});

		it('should apply exponential backoff', async () => {
			vi.useFakeTimers();

			const executor = createResilientExecutor({
				retry: {
					maxAttempts: 3,
					initialDelay: 100,
					backoffMultiplier: 2,
					enableJitter: false, // Disable jitter for predictable test
				},
			});

			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail'))
				.mockRejectedValueOnce(new Error('fail'))
				.mockResolvedValueOnce('success');

			const promise = executor.execute(fn);

			// First attempt (immediate)
			await vi.advanceTimersByTimeAsync(0);
			expect(fn).toHaveBeenCalledTimes(1);

			// First retry after 100ms
			await vi.advanceTimersByTimeAsync(100);
			expect(fn).toHaveBeenCalledTimes(2);

			// Second retry after 200ms (100 * 2^1)
			await vi.advanceTimersByTimeAsync(200);
			expect(fn).toHaveBeenCalledTimes(3);

			const result = await promise;
			expect(result).toBe('success');

			vi.useRealTimers();
		});

		it('should respect max delay', async () => {
			vi.useFakeTimers();

			const executor = createResilientExecutor({
				retry: {
					maxAttempts: 5,
					initialDelay: 1000,
					maxDelay: 2000,
					backoffMultiplier: 3,
					enableJitter: false,
				},
			});

			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail'))
				.mockRejectedValueOnce(new Error('fail'))
				.mockResolvedValueOnce('success');

			const promise = executor.execute(fn);

			await vi.advanceTimersByTimeAsync(0);
			expect(fn).toHaveBeenCalledTimes(1);

			// First retry: 1000ms
			await vi.advanceTimersByTimeAsync(1000);
			expect(fn).toHaveBeenCalledTimes(2);

			// Second retry: should be capped at 2000ms instead of 3000ms
			await vi.advanceTimersByTimeAsync(2000);
			expect(fn).toHaveBeenCalledTimes(3);

			await promise;

			vi.useRealTimers();
		});

		it('should add jitter to prevent thundering herd', async () => {
			const executor = createResilientExecutor({
				retry: {
					maxAttempts: 3,
					initialDelay: 100,
					enableJitter: true,
				},
			});

			// Spy on Math.random to verify jitter is applied
			const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

			const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('success');

			await executor.execute(fn);

			expect(randomSpy).toHaveBeenCalled();
			randomSpy.mockRestore();
		});
	});

	describe('Execution Timeout', () => {
		it('should timeout long-running operations', async () => {
			vi.useFakeTimers();

			const executor = createResilientExecutor({
				executionTimeout: 1000,
			});

			const fn = vi
				.fn()
				.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000)));

			const promise = executor.execute(fn);

			vi.advanceTimersByTime(1500);

			await expect(promise).rejects.toThrow('Execution timeout after 1000ms');

			vi.useRealTimers();
		});

		it('should complete fast operations without timeout', async () => {
			const executor = createResilientExecutor({
				executionTimeout: 5000,
			});

			const fn = vi.fn().mockResolvedValue('quick result');

			const result = await executor.execute(fn);

			expect(result).toBe('quick result');
		});
	});

	describe('Context Preservation', () => {
		it('should log context preservation across retries', async () => {
			const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

			const executor = createResilientExecutor({
				retry: {
					maxAttempts: 2,
					initialDelay: 10,
				},
			});

			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce('success');

			const context = {
				preserve: {
					sessionId: 'test-123',
					attempt: 1,
				},
			};

			await executor.execute(fn, context);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Preserving context across retry'),
				context.preserve,
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Health Monitoring', () => {
		it('should report healthy state when circuit is closed', () => {
			const executor = createResilientExecutor();

			const health = executor.getHealth();

			expect(health.healthy).toBe(true);
			expect(health.circuitState).toBe('closed');
			expect(health.failures).toBe(0);
		});

		it('should report unhealthy when circuit is open', async () => {
			const executor = createResilientExecutor({
				circuitBreaker: {
					failureThreshold: 2,
				},
				retry: {
					maxAttempts: 1,
				},
			});

			const fn = vi.fn().mockRejectedValue(new Error('fail'));

			await expect(executor.execute(fn)).rejects.toThrow();
			await expect(executor.execute(fn)).rejects.toThrow();

			const health = executor.getHealth();

			expect(health.healthy).toBe(false);
			expect(health.circuitState).toBe('open');
			expect(health.failures).toBeGreaterThanOrEqual(2);
		});

		it('should include retry configuration in health', () => {
			const executor = createResilientExecutor({
				retry: {
					maxAttempts: 5,
				},
			});

			const health = executor.getHealth();

			expect(health.maxRetries).toBe(5);
		});
	});

	describe('Error Propagation', () => {
		it('should throw last error after all retries exhausted', async () => {
			const executor = createResilientExecutor({
				retry: {
					maxAttempts: 3,
					initialDelay: 10,
				},
			});

			const fn = vi.fn().mockRejectedValue(new Error('Persistent failure'));

			await expect(executor.execute(fn)).rejects.toThrow('Persistent failure');
			expect(fn).toHaveBeenCalledTimes(3);
		});

		it('should log retry attempts with warnings', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const executor = createResilientExecutor({
				retry: {
					maxAttempts: 2,
					initialDelay: 10,
				},
			});

			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error('Transient error'))
				.mockResolvedValueOnce('success');

			await executor.execute(fn);

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 1/2'));

			consoleSpy.mockRestore();
		});
	});
});
