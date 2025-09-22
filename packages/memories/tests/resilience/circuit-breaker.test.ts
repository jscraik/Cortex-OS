import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreakerManager } from '../../src/resilience/circuit-breaker.js';

describe('CircuitBreakerManager', () => {
	let circuitBreaker: CircuitBreakerManager;

	beforeEach(() => {
		circuitBreaker = new CircuitBreakerManager();
	});

	describe('execute', () => {
		it('should execute function successfully', async () => {
			const fn = vi.fn().mockResolvedValue('success');

			const result = await circuitBreaker.execute('test', fn);

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should retry failed operations', async () => {
			const fn = vi.fn()
				.mockRejectedValueOnce(new Error('First failure'))
				.mockResolvedValue('success');

			const result = await circuitBreaker.execute('test', fn, {
				threshold: 3,
				timeout: 1000,
				resetTimeout: 1000,
			});

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it('should throw after threshold failures', async () => {
			const fn = vi.fn().mockRejectedValue(new Error('Persistent failure'));

			await expect(
				circuitBreaker.execute('test', fn, {
					threshold: 2,
					timeout: 1000,
					resetTimeout: 1000,
				})
			).rejects.toThrow('Persistent failure');

			expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
		});

		it('should respect custom timeout', async () => {
			const fn = vi.fn().mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve('slow'), 2000))
			);

			await expect(
				circuitBreaker.execute('test', fn, {
					timeout: 1000,
					threshold: 1,
					resetTimeout: 1000,
				})
			).rejects.toThrow();
		});
	});

	describe('getStats', () => {
		it('should return circuit breaker stats', () => {
			const stats = circuitBreaker.getStats('non-existent');
			expect(stats).toBeDefined();
		});
	});
});