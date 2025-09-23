import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create a simple mock for testing
const createMockCircuitBreaker = () => ({
	run: vi.fn(),
	isOpen: vi.fn(() => false),
	_state: 2, // CLOSED
});

vi.mock('circuit-breaker-js', () => ({
	default: vi.fn(() => createMockCircuitBreaker()),
}));

import { CircuitBreakerManager } from '../../src/resilience/circuit-breaker.js';

describe('CircuitBreakerManager', () => {
	let circuitBreaker: CircuitBreakerManager;
	let mockCircuitBreaker: ReturnType<typeof createMockCircuitBreaker>;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		circuitBreaker = new CircuitBreakerManager();

		// Get the mock instance that was created
		const CircuitBreaker = require('circuit-breaker-js').default;
		mockCircuitBreaker = CircuitBreaker.mock.results[0]?.value || createMockCircuitBreaker();
	});

	describe('execute', () => {
		it('should execute function successfully', async () => {
			const fn = vi.fn().mockResolvedValue('success');

			// Mock the run method to execute the command
			mockCircuitBreaker.run.mockImplementation((command: any) => {
				command(
					() => {},
					() => {},
				);
			});

			const result = await circuitBreaker.execute('test', fn);

			expect(result).toBe('success');
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('should handle circuit breaker open state', async () => {
			mockCircuitBreaker.isOpen.mockReturnValue(true);

			const fn = vi.fn().mockResolvedValue('success');

			await expect(circuitBreaker.execute('test', fn)).rejects.toThrow('Circuit breaker is open');
			expect(fn).not.toHaveBeenCalled();
		});

		it('should handle command execution errors', async () => {
			const fn = vi.fn().mockRejectedValue(new Error('Command failed'));

			// Mock the run method to execute the command
			mockCircuitBreaker.run.mockImplementation((command: any) => {
				command(
					() => {},
					() => {},
				);
			});

			await expect(circuitBreaker.execute('test', fn)).rejects.toThrow('Command failed');
		});

		it('should respect custom timeout', async () => {
			const fn = vi.fn();

			await circuitBreaker.execute('test', fn, {
				timeout: 5000,
				threshold: 75,
				resetTimeout: 60000,
			});

			// Verify the circuit breaker was created with custom options
			const CircuitBreaker = require('circuit-breaker-js').default;
			expect(CircuitBreaker).toHaveBeenCalledWith(
				expect.objectContaining({
					timeoutDuration: 5000,
					errorThreshold: 75,
					windowDuration: 60000,
				}),
			);
		});
	});

	describe('getStats', () => {
		it('should return circuit breaker stats', () => {
			const stats = circuitBreaker.getStats('test');
			expect(stats).toBeDefined();
			expect(stats.state).toBe(2); // CLOSED
			expect(stats.isOpen).toBe(false);
		});

		it('should throw error for non-existent breaker', () => {
			expect(() => circuitBreaker.getStats('non-existent')).toThrow(
				'Circuit breaker non-existent not found',
			);
		});
	});
});
