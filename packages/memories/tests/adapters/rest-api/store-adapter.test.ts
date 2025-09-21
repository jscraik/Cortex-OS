import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestApiClient as RestApiAdapter } from '../../../src/adapters/rest-api/rest-adapter.js';
import { RestApiMemoryStore } from '../../../src/adapters/rest-api/store-adapter.js';
import { createMemory } from '../../test-utils.js';

describe('REST API MemoryStore Adapter', () => {
	let store: RestApiMemoryStore;
	let mockAdapter: any;
	let mockRestAdapter: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock REST API adapter
		mockRestAdapter = {
			healthCheck: vi.fn(),
			createMemory: vi.fn(),
			getMemory: vi.fn(),
			updateMemory: vi.fn(),
			deleteMemory: vi.fn(),
			searchMemories: vi.fn(),
			purgeMemories: vi.fn(),
			close: vi.fn(),
		};

		// Create mock adapter interface
		mockAdapter = {
			config: {
				baseUrl: 'https://api.example.com',
			},
			healthCheck: mockRestAdapter.healthCheck,
			createMemory: mockRestAdapter.createMemory,
			getMemory: mockRestAdapter.getMemory,
			updateMemory: mockRestAdapter.updateMemory,
			deleteMemory: mockRestAdapter.deleteMemory,
			searchMemories: mockRestAdapter.searchMemories,
			purgeMemories: mockRestAdapter.purgeMemories,
			close: mockRestAdapter.close,
		};

		store = new RestApiMemoryStore(mockAdapter);
	});

	describe('Constructor', () => {
		it('should create store with adapter', () => {
			// Given
			const store = new RestApiMemoryStore(mockAdapter);

			// Then
			expect(store.getAdapter()).toBe(mockAdapter);
		});

		it('should create store with config and namespace', () => {
			// Given
			const config = { baseUrl: 'https://api.example.com', apiKey: 'test' };
			const store = new RestApiMemoryStore(config, 'custom');

			// Then
			expect(store.getAdapter()).toBeInstanceOf(RestApiAdapter);
		});
	});

	describe('upsert', () => {
		it('should create new memory when it does not exist', async () => {
			// Given
			const memory = createMemory({ text: 'New memory' });
			mockRestAdapter.getMemory.mockResolvedValue({
				memory: null,
				requestId: 'get-456',
			});

			const createResponse = {
				memory: {
					...memory,
					id: 'generated-id',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
				requestId: 'req-123',
			};
			mockRestAdapter.createMemory.mockResolvedValue(createResponse);

			// When
			const result = await store.upsert(memory);

			// Then
			expect(result).toEqual({
				...memory,
				id: 'generated-id',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			});

			expect(mockRestAdapter.getMemory).toHaveBeenCalledWith({
				id: memory.id,
				namespace: 'default',
			});

			expect(mockRestAdapter.createMemory).toHaveBeenCalledWith({
				memory: {
					...memory,
					id: expect.any(String), // Generated ID
				},
				namespace: 'default',
			});
		});

		it('should update existing memory when it exists', async () => {
			// Given
			const memory = createMemory({
				id: 'existing-id',
				text: 'Updated memory',
			});

			const existingMemory = {
				memory: {
					...memory,
					text: 'Original memory',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
				requestId: 'get-123',
			};
			mockRestAdapter.getMemory.mockResolvedValue(existingMemory);

			const updateResponse = {
				memory: {
					...memory,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				},
				requestId: 'req-456',
			};
			mockRestAdapter.updateMemory.mockResolvedValue(updateResponse);

			// When
			const result = await store.upsert(memory);

			// Then
			expect(result).toEqual({
				...memory,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			expect(mockRestAdapter.getMemory).toHaveBeenCalledWith({
				id: 'existing-id',
				namespace: 'default',
			});

			expect(mockRestAdapter.updateMemory).toHaveBeenCalledWith({
				memory: {
					...memory,
					id: 'existing-id',
				},
				namespace: 'default',
			});

			expect(mockRestAdapter.createMemory).not.toHaveBeenCalled();
		});

		it('should handle get error (404) by creating directly', async () => {
			// Given
			const memory = createMemory({ text: 'New memory' });
			const notFoundError = { status: 404, message: 'Not found' };
			mockRestAdapter.getMemory.mockRejectedValue(notFoundError);

			const createResponse = {
				memory: {
					...memory,
					id: 'created-id',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
				requestId: 'req-789',
			};
			mockRestAdapter.createMemory.mockResolvedValue(createResponse);

			// When
			const result = await store.upsert(memory);

			// Then
			expect(result).toEqual({
				...memory,
				id: 'created-id',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			});

			expect(mockRestAdapter.getMemory).toHaveBeenCalledWith({
				id: memory.id,
				namespace: 'default',
			});

			expect(mockRestAdapter.createMemory).toHaveBeenCalledWith({
				memory: {
					...memory,
					id: expect.any(String),
				},
				namespace: 'default',
			});
		});

		it('should propagate non-404 errors', async () => {
			// Given
			const memory = createMemory({ text: 'Test memory' });
			const serverError = { status: 500, message: 'Internal Server Error' };
			mockRestAdapter.getMemory.mockRejectedValue(serverError);

			// When/Then
			await expect(store.upsert(memory)).rejects.toEqual(serverError);
		});
	});

	describe('get', () => {
		it('should get memory by ID', async () => {
			// Given
			const memory = createMemory({ id: 'mem-123', text: 'Test memory' });
			mockRestAdapter.getMemory.mockResolvedValue({
				memory,
				requestId: 'get-789',
			});

			// When
			const result = await store.get('mem-123');

			// Then
			expect(result).toEqual(memory);
			expect(mockRestAdapter.getMemory).toHaveBeenCalledWith({
				id: 'mem-123',
				namespace: 'default',
			});
		});

		it('should return null when memory not found', async () => {
			// Given
			mockRestAdapter.getMemory.mockResolvedValue({
				memory: null,
				requestId: 'get-null',
			});

			// When
			const result = await store.get('nonexistent');

			// Then
			expect(result).toBeNull();
		});

		it('should use custom namespace', async () => {
			// Given
			const memory = createMemory({ id: 'mem-123' });
			mockRestAdapter.getMemory.mockResolvedValue({
				memory,
				requestId: 'get-custom',
			});

			// When
			await store.get('mem-123', 'custom');

			// Then
			expect(mockRestAdapter.getMemory).toHaveBeenCalledWith({
				id: 'mem-123',
				namespace: 'custom',
			});
		});
	});

	describe('delete', () => {
		it('should delete memory by ID', async () => {
			// When
			await store.delete('mem-123');

			// Then
			expect(mockRestAdapter.deleteMemory).toHaveBeenCalledWith({
				id: 'mem-123',
				namespace: 'default',
			});
		});

		it('should use custom namespace', async () => {
			// When
			await store.delete('mem-123', 'custom');

			// Then
			expect(mockRestAdapter.deleteMemory).toHaveBeenCalledWith({
				id: 'mem-123',
				namespace: 'custom',
			});
		});
	});

	describe('searchByText', () => {
		it('should search by text query', async () => {
			// Given
			const query = { text: 'test query', limit: 10 };
			const memories = [
				createMemory({ id: 'mem-1', text: 'test result 1' }),
				createMemory({ id: 'mem-2', text: 'test result 2' }),
			];

			mockRestAdapter.searchMemories.mockResolvedValue({
				memories,
				requestId: 'search-123',
			});

			// When
			const result = await store.searchByText(query);

			// Then
			expect(result).toEqual(memories);
			expect(mockRestAdapter.searchMemories).toHaveBeenCalledWith({
				query,
				namespace: 'default',
			});
		});

		it('should use custom namespace', async () => {
			// Given
			const query = { text: 'test' };
			mockRestAdapter.searchMemories.mockResolvedValue({
				memories: [],
				requestId: 'search-456',
			});

			// When
			await store.searchByText(query, 'custom');

			// Then
			expect(mockRestAdapter.searchMemories).toHaveBeenCalledWith({
				query,
				namespace: 'custom',
			});
		});
	});

	describe('searchByVector', () => {
		it('should search by vector query', async () => {
			// Given
			const query = { vector: [0.1, 0.2, 0.3], limit: 5 };
			const memories = [createMemory({ id: 'mem-1', text: 'vector result' })];

			mockRestAdapter.searchMemories.mockResolvedValue({
				memories,
				requestId: 'search-789',
			});

			// When
			const result = await store.searchByVector(query);

			// Then
			expect(result).toEqual(memories);
			expect(mockRestAdapter.searchMemories).toHaveBeenCalledWith({
				query,
				namespace: 'default',
			});
		});
	});

	describe('purgeExpired', () => {
		it('should purge expired memories', async () => {
			// Given
			mockRestAdapter.purgeMemories.mockResolvedValue({
				count: 5,
				requestId: 'purge-123',
			});

			// When
			const result = await store.purgeExpired('2024-01-02T00:00:00.000Z');

			// Then
			expect(result).toBe(5);
			expect(mockRestAdapter.purgeMemories).toHaveBeenCalledWith({
				nowISO: '2024-01-02T00:00:00.000Z',
				namespace: 'default',
			});
		});

		it('should use custom namespace', async () => {
			// Given
			mockRestAdapter.purgeMemories.mockResolvedValue({
				count: 3,
				requestId: 'purge-456',
			});

			// When
			await store.purgeExpired('2024-01-02T00:00:00.000Z', 'custom');

			// Then
			expect(mockRestAdapter.purgeMemories).toHaveBeenCalledWith({
				nowISO: '2024-01-02T00:00:00.000Z',
				namespace: 'custom',
			});
		});
	});

	describe('checkHealth', () => {
		it('should check health of the REST API', async () => {
			// Given
			const healthResponse = {
				status: 'healthy',
				version: '1.0.0',
				uptime: 3600,
			};
			mockRestAdapter.healthCheck.mockResolvedValue(healthResponse);

			// When
			const result = await store.checkHealth();

			// Then
			expect(result).toEqual(healthResponse);
			expect(mockRestAdapter.healthCheck).toHaveBeenCalled();
		});
	});

	describe('close', () => {
		it('should close the adapter', async () => {
			// When
			await store.close();

			// Then
			expect(mockRestAdapter.close).toHaveBeenCalled();
		});
	});
});
