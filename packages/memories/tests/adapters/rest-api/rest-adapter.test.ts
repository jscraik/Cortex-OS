import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchHttpClient } from '../../../src/adapters/rest-api/http-client.js';
import { RestApiClient as RestApiAdapter } from '../../../src/adapters/rest-api/rest-adapter.js';
import type { RestApiConfig } from '../../../src/adapters/rest-api/types.js';

// Mock the HTTP client
vi.mock('../../../src/adapters/rest-api/http-client.js');

describe('REST API Adapter', () => {
	let adapter: RestApiAdapter;
	let mockHttpClient: any;
	let config: RestApiConfig;

	beforeEach(() => {
		vi.clearAllMocks();

		config = {
			baseUrl: 'https://api.memories.example.com',
			apiKey: 'test-api-key',
			timeoutMs: 5000,
			maxRetries: 2,
		};

		// Create a mock HTTP client
		mockHttpClient = {
			request: vi.fn(),
			setDefaultHeaders: vi.fn(),
			setAuth: vi.fn(),
			close: vi.fn(),
		};

		// Mock the FetchHttpClient constructor
		(FetchHttpClient as any).mockImplementation(() => mockHttpClient);

		adapter = new RestApiAdapter(config);
	});

	describe('Configuration', () => {
		it('should create adapter with default config', () => {
			// Given
			const minimalConfig = { baseUrl: 'https://api.example.com' };
			const adapter = new RestApiAdapter(minimalConfig);

			// Then
			expect(adapter.config.baseUrl).toBe('https://api.example.com');
			expect(adapter.config.timeoutMs).toBe(30000);
			expect(adapter.config.maxRetries).toBe(3);
			expect(adapter.config.enableCompression).toBe(true);
		});

		it('should create adapter with custom config', () => {
			// Given
			const customConfig = {
				baseUrl: 'https://custom.api.com',
				apiKey: 'custom-key',
				timeoutMs: 10000,
				maxRetries: 5,
				namespacePrefix: 'test-',
			};
			const adapter = new RestApiAdapter(customConfig);

			// Then
			expect(adapter.config.baseUrl).toBe('https://custom.api.com');
			expect(adapter.config.apiKey).toBe('custom-key');
			expect(adapter.config.timeoutMs).toBe(10000);
			expect(adapter.config.maxRetries).toBe(5);
			expect(adapter.config.namespacePrefix).toBe('test-');
		});

		it('should setup HTTP client correctly', () => {
			// Then
			expect(FetchHttpClient).toHaveBeenCalledWith('https://api.memories.example.com');
			expect(mockHttpClient.setDefaultHeaders).toHaveBeenCalledWith(
				expect.objectContaining({
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'User-Agent': 'cortex-os-memories/1.0.0',
					'Accept-Encoding': 'gzip, deflate',
				}),
			);
			expect(mockHttpClient.setAuth).toHaveBeenCalledWith('header', 'test-api-key');
		});
	});

	describe('Health Check', () => {
		it('should make health check request', async () => {
			// Given
			const mockResponse = {
				data: {
					status: 'healthy',
					version: '1.0.0',
					uptime: 3600,
					metrics: { database: 'connected' },
				},
				status: 200,
				headers: {},
			};
			mockHttpClient.request.mockResolvedValue(mockResponse);

			// When
			const result = await adapter.healthCheck();

			// Then
			expect(result).toEqual({
				status: 'healthy',
				version: '1.0.0',
				uptime: 3600,
				metrics: { database: 'connected' },
			});
			expect(mockHttpClient.request).toHaveBeenCalledWith({
				method: 'GET',
				path: '/health',
				retry: true,
			});
		});
	});

	describe('Memory Operations', () => {
		it('should create a memory', async () => {
			// Given
			const memoryData = {
				text: 'Test memory',
				kind: 'note',
				tags: ['test'],
			};

			const mockResponse = {
				data: {
					memory: {
						id: 'mem-123',
						...memoryData,
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z',
					},
					requestId: 'req-123',
				},
				status: 201,
				headers: {},
			};
			mockHttpClient.request.mockResolvedValue(mockResponse);

			// When
			const result = await adapter.createMemory({
				memory: memoryData,
				namespace: 'test',
			});

			// Then
			expect(result).toEqual({
				memory: expect.objectContaining({
					id: 'mem-123',
					text: 'Test memory',
					kind: 'note',
					tags: ['test'],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				}),
				requestId: 'req-123',
			});

			expect(mockHttpClient.request).toHaveBeenCalledWith({
				method: 'POST',
				path: '/api/v1/memories',
				body: {
					memory: memoryData,
					namespace: 'test',
				},
				retry: true,
			});
		});

		it('should get a memory', async () => {
			// Given
			const mockResponse = {
				data: {
					memory: {
						id: 'mem-123',
						text: 'Test memory',
						kind: 'note',
					},
					requestId: 'req-456',
				},
				status: 200,
				headers: {},
			};
			mockHttpClient.request.mockResolvedValue(mockResponse);

			// When
			const result = await adapter.getMemory({
				id: 'mem-123',
				namespace: 'test',
			});

			// Then
			expect(result).toEqual({
				memory: {
					id: 'mem-123',
					text: 'Test memory',
					kind: 'note',
				},
				requestId: 'req-456',
			});

			expect(mockHttpClient.request).toHaveBeenCalledWith({
				method: 'GET',
				path: '/api/v1/memories/mem-123',
				query: { namespace: 'test' },
				retry: true,
			});
		});

		it('should update a memory', async () => {
			// Given
			const updateData = {
				id: 'mem-123',
				text: 'Updated memory',
				tags: ['updated'],
			};

			const mockResponse = {
				data: {
					memory: {
						...updateData,
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-02T00:00:00.000Z',
					},
					requestId: 'req-789',
				},
				status: 200,
				headers: {},
			};
			mockHttpClient.request.mockResolvedValue(mockResponse);

			// When
			const result = await adapter.updateMemory({
				memory: updateData,
				namespace: 'test',
			});

			// Then
			expect(result).toEqual({
				memory: expect.objectContaining({
					id: 'mem-123',
					text: 'Updated memory',
					tags: ['updated'],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				}),
				requestId: 'req-789',
			});
		});

		it('should delete a memory', async () => {
			// Given
			mockHttpClient.request.mockResolvedValue({
				data: null,
				status: 204,
				headers: {},
			});

			// When
			await adapter.deleteMemory({
				id: 'mem-123',
				namespace: 'test',
			});

			// Then
			expect(mockHttpClient.request).toHaveBeenCalledWith({
				method: 'DELETE',
				path: '/api/v1/memories/mem-123',
				query: { namespace: 'test' },
				retry: true,
			});
		});

		it('should search memories by text', async () => {
			// Given
			const query = { text: 'test search', limit: 10 };
			const mockResponse = {
				data: {
					memories: [
						{ id: 'mem-1', text: 'test result 1' },
						{ id: 'mem-2', text: 'test result 2' },
					],
					total: 2,
					metadata: {
						queryTimeMs: 50,
						resultCount: 2,
						hasMore: false,
					},
					requestId: 'search-123',
				},
				status: 200,
				headers: {},
			};
			mockHttpClient.request.mockResolvedValue(mockResponse);

			// When
			const result = await adapter.searchMemories({
				query,
				namespace: 'test',
			});

			// Then
			expect(result).toEqual(mockResponse.data);
			expect(mockHttpClient.request).toHaveBeenCalledWith({
				method: 'POST',
				path: '/api/v1/memories/search/text',
				body: {
					query,
					namespace: 'test',
				},
				retry: true,
			});
		});

		it('should search memories by vector', async () => {
			// Given
			const query = { vector: [0.1, 0.2, 0.3], limit: 5 };
			const mockResponse = {
				data: {
					memories: [{ id: 'mem-1', text: 'vector result' }],
					requestId: 'search-456',
				},
				status: 200,
				headers: {},
			};
			mockHttpClient.request.mockResolvedValue(mockResponse);

			// When
			const result = await adapter.searchMemories({
				query,
				namespace: 'test',
			});

			// Then
			expect(result).toEqual(mockResponse.data);
			expect(mockHttpClient.request).toHaveBeenCalledWith({
				method: 'POST',
				path: '/api/v1/memories/search/vector',
				body: {
					query,
					namespace: 'test',
				},
				retry: true,
			});
		});

		it('should purge expired memories', async () => {
			// Given
			const mockResponse = {
				data: {
					count: 5,
					requestId: 'purge-123',
				},
				status: 200,
				headers: {},
			};
			mockHttpClient.request.mockResolvedValue(mockResponse);

			// When
			const result = await adapter.purgeMemories({
				nowISO: '2024-01-02T00:00:00.000Z',
				namespace: 'test',
			});

			// Then
			expect(result).toEqual({
				count: 5,
				requestId: 'purge-123',
			});

			expect(mockHttpClient.request).toHaveBeenCalledWith({
				method: 'DELETE',
				path: '/api/v1/memories/expired',
				query: {
					now: '2024-01-02T00:00:00.000Z',
					namespace: 'test',
				},
				retry: true,
			});
		});
	});

	describe('Rate Limit Handling', () => {
		it('should get rate limit info', async () => {
			// Given
			const mockResponse = {
				data: {
					limit: 1000,
					remaining: 999,
					resetAt: '2024-01-02T01:00:00.000Z',
					windowSize: 3600,
				},
				status: 200,
				headers: {},
			};
			mockHttpClient.request.mockResolvedValue(mockResponse);

			// When
			const result = await adapter.getRateLimit();

			// Then
			expect(result).toEqual({
				limit: 1000,
				remaining: 999,
				resetAt: '2024-01-02T01:00:00.000Z',
				windowSize: 3600,
			});

			expect(mockHttpClient.request).toHaveBeenCalledWith({
				method: 'GET',
				path: '/api/v1/rate-limit',
				retry: true,
			});
		});
	});

	describe('Namespace Prefix', () => {
		it('should apply namespace prefix', () => {
			// Given
			const adapter = new RestApiAdapter({
				...config,
				namespacePrefix: 'user-123/',
			});

			// When
			const result = (adapter as any).resolveNamespace('memories');

			// Then
			expect(result).toBe('user-123/memories');
		});

		it('should handle undefined namespace', () => {
			// Given
			const adapter = new RestApiAdapter({
				...config,
				namespacePrefix: 'user-123/',
			});

			// When
			const result = (adapter as any).resolveNamespace();

			// Then
			expect(result).toBeUndefined();
		});
	});

	describe('Error Handling', () => {
		it('should throw error when adapter is closed', async () => {
			// Given
			await adapter.close();

			// When/Then
			await expect(adapter.healthCheck()).rejects.toThrow('Adapter is closed');
		});

		it('should retry failed requests', async () => {
			// Given
			const retryableError = {
				status: 503,
				message: 'Service Unavailable',
				retryable: true,
			};

			mockHttpClient.request
				.mockRejectedValueOnce(retryableError)
				.mockRejectedValueOnce(retryableError)
				.mockResolvedValue({
					data: {
						status: 'healthy',
					},
					status: 200,
					headers: {
						'x-ratelimit-limit': '1000',
						'x-ratelimit-remaining': '999',
						'x-ratelimit-reset': new Date(Date.now() + 3600000).toISOString(),
						'x-ratelimit-window': '3600',
					},
				});

			// When
			const result = await adapter.healthCheck();

			// Then
			expect(result).toEqual({
				status: 'healthy',
			});
			expect(mockHttpClient.request).toHaveBeenCalledTimes(3);
		});
	});

	describe('Cleanup', () => {
		it('should close the adapter', async () => {
			// When
			await adapter.close();

			// Then
			expect(mockHttpClient.close).toHaveBeenCalled();
		});

		it('should not close twice', async () => {
			// Given
			await adapter.close();

			// When
			await adapter.close();

			// Then
			expect(mockHttpClient.close).toHaveBeenCalledTimes(1);
		});
	});
});
