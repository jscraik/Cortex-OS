import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchHttpClient } from '../../../src/adapters/rest-api/http-client.js';
import type { RequestOptions } from '../../../src/adapters/rest-api/types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HTTP Client', () => {
	let client: FetchHttpClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new FetchHttpClient('https://api.example.com');
	});

	describe('Request Making', () => {
		it('should make a successful GET request', async () => {
			// Given
			const mockResponse = {
				ok: true,
				status: 200,
				headers: new Headers({
					'content-type': 'application/json',
					'x-request-id': 'req-123',
				}),
				json: vi.fn().mockResolvedValue({ data: 'test' }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const options: RequestOptions = {
				method: 'GET',
				path: '/test',
			};

			// When
			const result = await client.request(options);

			// Then
			expect(result).toEqual({
				data: { data: 'test' },
				status: 200,
				headers: {
					'content-type': 'application/json',
					'x-request-id': 'req-123',
				},
				requestId: 'req-123',
				timestamp: expect.any(String),
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/test',
				expect.objectContaining({
					method: 'GET',
					headers: expect.any(Headers),
				}),
			);
		});

		it('should make a POST request with body', async () => {
			// Given
			const mockResponse = {
				ok: true,
				status: 201,
				headers: new Headers(),
				json: vi.fn().mockResolvedValue({ id: '123' }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const options: RequestOptions = {
				method: 'POST',
				path: '/memories',
				body: { text: 'test memory' },
			};

			// When
			await client.request(options);

			// Then
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/memories',
				expect.objectContaining({
					method: 'POST',
					body: '{"text":"test memory"}',
				}),
			);
		});

		it('should handle query parameters', async () => {
			// Given
			const mockResponse = {
				ok: true,
				status: 200,
				headers: new Headers(),
				json: vi.fn().mockResolvedValue([]),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const options: RequestOptions = {
				method: 'GET',
				path: '/search',
				query: {
					q: 'test',
					limit: 10,
					exact: true,
				},
			};

			// When
			await client.request(options);

			// Then
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/search?q=test&limit=10&exact=true',
				expect.anything(),
			);
		});

		it('should handle request timeout', async () => {
			// Given
			const abortController = new AbortController();
			vi.spyOn(global, 'AbortController').mockImplementation(() => abortController);

			// Mock fetch to simulate timeout
			mockFetch.mockImplementation(() => {
				return new Promise((_, reject) => {
					setTimeout(() => {
						abortController.abort();
						reject(new DOMException('The operation was aborted.', 'AbortError'));
					}, 10);
				});
			});

			const options: RequestOptions = {
				method: 'GET',
				path: '/slow',
				timeoutMs: 50,
			};

			// When/Then
			await expect(client.request(options)).rejects.toMatchObject({
				status: 408,
				retryable: true,
			});
		});
	});

	describe('Authentication', () => {
		it('should set Bearer token authentication', () => {
			// When
			client.setAuth('bearer', 'test-token');

			// Then
			const headers = new Headers();
			expect(() => {
				(client as any).buildHeaders = vi.fn().mockImplementation(() => headers);
				(client as any).buildHeaders();
			}).not.toThrow();
		});

		it('should set API key header authentication', () => {
			// When
			client.setAuth('header', 'api-key-123');

			// Then
			const headers = new Headers();
			expect(() => {
				(client as any).buildHeaders = vi.fn().mockImplementation(() => headers);
				(client as any).buildHeaders();
			}).not.toThrow();
		});
	});

	describe('Error Handling', () => {
		it('should handle HTTP errors', async () => {
			// Given
			const mockResponse = {
				ok: false,
				status: 404,
				statusText: 'Not Found',
				headers: new Headers(),
				text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Not found' })),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const options: RequestOptions = {
				method: 'GET',
				path: '/nonexistent',
			};

			// When/Then
			await expect(client.request(options)).rejects.toEqual({
				status: 404,
				message: 'HTTP 404: Not Found',
				details: { error: 'Not found' },
				retryable: false,
			});
		});

		it('should identify retryable status codes', () => {
			// Given
			const clientInstance = client as any;

			// Then
			expect(clientInstance.isRetryableStatus(408)).toBe(true); // Timeout
			expect(clientInstance.isRetryableStatus(429)).toBe(true); // Too Many Requests
			expect(clientInstance.isRetryableStatus(500)).toBe(true); // Internal Server Error
			expect(clientInstance.isRetryableStatus(502)).toBe(true); // Bad Gateway
			expect(clientInstance.isRetryableStatus(503)).toBe(true); // Service Unavailable
			expect(clientInstance.isRetryableStatus(504)).toBe(true); // Gateway Timeout
			expect(clientInstance.isRetryableStatus(400)).toBe(false); // Bad Request
			expect(clientInstance.isRetryableStatus(404)).toBe(false); // Not Found
		});
	});

	describe('Headers', () => {
		it('should set default headers', () => {
			// When
			client.setDefaultHeaders({
				'X-Custom-Header': 'custom-value',
				'X-Another-Header': 'another-value',
			});

			// Then
			expect((client as any).defaultHeaders).toEqual(
				expect.objectContaining({
					'X-Custom-Header': 'custom-value',
					'X-Another-Header': 'another-value',
				}),
			);
		});

		it('should merge headers correctly', () => {
			// Given
			client.setDefaultHeaders({ 'X-Base': 'base' });
			const clientInstance = client as any;

			// When
			const headers = clientInstance.buildHeaders({
				'X-Request': 'specific',
				'X-Base': 'override',
			});

			// Then
			expect(headers.get('X-Base')).toBe('override');
			expect(headers.get('X-Request')).toBe('specific');
		});
	});

	describe('Response Parsing', () => {
		it('should parse JSON responses', async () => {
			// Given
			const mockResponse = {
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/json' }),
				json: vi.fn().mockResolvedValue({ success: true }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			// When
			const result = await client.request({
				method: 'GET',
				path: '/test',
			});

			// Then
			expect(result.data).toEqual({ success: true });
		});

		it('should parse text responses', async () => {
			// Given
			const mockResponse = {
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'text/plain' }),
				text: vi.fn().mockResolvedValue('plain text'),
			};
			mockFetch.mockResolvedValue(mockResponse);

			// When
			const result = await client.request({
				method: 'GET',
				path: '/test',
				responseType: 'text',
			});

			// Then
			expect(result.data).toBe('plain text');
		});
	});
});
