import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	CategorizedError,
	ErrorBoundary,
	ErrorType,
	NetworkError,
	PermissionError,
	ResourceError,
	TimeoutError,
	ValidationError,
} from '../../lib/error-boundary.js';

describe('ErrorBoundary', () => {
	let errorBoundary: ErrorBoundary;

	beforeEach(() => {
		errorBoundary = new ErrorBoundary(3);
	});

	describe('execute', () => {
		it('should execute successful operation', async () => {
			const result = await errorBoundary.execute(async () => 'success', { operationName: 'test' });

			expect(result).toBe('success');
		});

		it('should handle operation errors', async () => {
			const operationError = new Error('Operation failed');

			await expect(
				errorBoundary.execute(
					async () => {
						throw operationError;
					},
					{ operationName: 'test' },
				),
			).rejects.toThrow('Operation failed');
		});

		it('should retry on retryable errors', async () => {
			let attemptCount = 0;
			const error = new Error('ECONNRESET');

			const operation = vi.fn().mockImplementation(async () => {
				attemptCount++;
				if (attemptCount < 3) {
					throw error;
				}
				return 'success';
			});

			const result = await errorBoundary.execute(operation, { operationName: 'test' });

			expect(result).toBe('success');
			expect(attemptCount).toBe(3);
		});

		it('should use fallback when provided', async () => {
			const operationError = new Error('Operation failed');
			const fallbackResult = 'fallback success';

			const result = await errorBoundary.execute(
				async () => {
					throw operationError;
				},
				{
					operationName: 'test',
					fallback: async () => fallbackResult,
				},
			);

			expect(result).toBe(fallbackResult);
		});

		it('should respect timeout', async () => {
			await expect(
				errorBoundary.execute(async () => new Promise((resolve) => setTimeout(resolve, 200)), {
					operationName: 'test',
					timeout: 100,
				}),
			).rejects.toThrow('Operation timed out after 100ms');
		});
	});

	describe('shouldRetry', () => {
		it('should retry on network errors', () => {
			const error = new Error('ECONNRESET');
			expect((errorBoundary as any).shouldRetry(error)).toBe(true);
		});

		it('should retry on timeout errors', () => {
			const error = new Error('ETIMEDOUT');
			expect((errorBoundary as any).shouldRetry(error)).toBe(true);
		});

		it('should retry on rate limit errors', () => {
			const error = new Error('429 Too Many Requests');
			expect((errorBoundary as any).shouldRetry(error)).toBe(true);
		});

		it('should not retry on validation errors', () => {
			const error = new Error('Invalid input');
			expect((errorBoundary as any).shouldRetry(error)).toBe(false);
		});
	});
});

describe('CategorizedError', () => {
	it('should create categorized error with context', () => {
		const error = new CategorizedError(ErrorType.NETWORK, 'Network request failed', {
			url: 'https://example.com',
			method: 'GET',
		});

		expect(error.type).toBe(ErrorType.NETWORK);
		expect(error.context).toEqual({
			url: 'https://example.com',
			method: 'GET',
		});
		expect(error.toJSON()).toMatchObject({
			type: ErrorType.NETWORK,
			message: 'Network request failed',
		});
	});
});

describe('ValidationError', () => {
	it('should create validation error', () => {
		const schema = { description: 'Test Schema' };
		const data = { invalid: 'data' };

		const error = new ValidationError(schema as any, data, 'Validation failed');

		expect(error.type).toBe(ErrorType.VALIDATION);
		expect(error.schema).toBe(schema);
		expect(error.data).toBe(data);
	});
});

describe('ResourceError', () => {
	it('should create resource error', () => {
		const error = new ResourceError('/path/to/file', 'read');

		expect(error.type).toBe(ErrorType.RESOURCE);
		expect(error.resource).toBe('/path/to/file');
		expect(error.action).toBe('read');
	});
});

describe('NetworkError', () => {
	it('should create network error', () => {
		const error = new NetworkError('https://example.com', 'GET', 404);

		expect(error.type).toBe(ErrorType.NETWORK);
		expect(error.url).toBe('https://example.com');
		expect(error.method).toBe('GET');
		expect(error.statusCode).toBe(404);
	});
});

describe('TimeoutError', () => {
	it('should create timeout error', () => {
		const error = new TimeoutError('test-operation', 5000);

		expect(error.type).toBe(ErrorType.TIMEOUT);
		expect(error.operation).toBe('test-operation');
		expect(error.timeout).toBe(5000);
	});
});

describe('PermissionError', () => {
	it('should create permission error', () => {
		const error = new PermissionError('/etc/config', 'read');

		expect(error.type).toBe(ErrorType.PERMISSION);
		expect(error.resource).toBe('/etc/config');
		expect(error.required).toBe('read');
	});
});
