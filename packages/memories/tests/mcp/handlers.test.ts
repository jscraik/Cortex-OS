import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Memory } from '../../src/domain/types.js';
import { createMemoryStoreHandler } from '../../src/mcp/handlers.js';
import type { MemoryStore } from '../../src/ports/MemoryStore.js';

describe('MemoryStoreHandler', () => {
	let mockStore: vi.Mocked<MemoryStore>;
	let handler: ReturnType<typeof createMemoryStoreHandler>;
	const testMemory: Memory = {
		id: 'test-id',
		kind: 'note',
		text: 'Test memory',
		tags: ['test'],
		metadata: {},
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		provenance: { source: 'test' },
	};

	beforeEach(() => {
		mockStore = {
			upsert: vi.fn(),
			get: vi.fn(),
			delete: vi.fn(),
			searchByText: vi.fn(),
			searchByVector: vi.fn(),
			purgeExpired: vi.fn(),
			list: vi.fn(),
		};
		handler = createMemoryStoreHandler(mockStore, 'test-namespace');
	});

	describe('store', () => {
		it('should store a new memory', async () => {
			mockStore.upsert.mockResolvedValue(testMemory);

			const result = await handler.store({
				kind: 'note',
				text: 'Test memory',
				tags: ['test'],
			});

			expect(result.stored).toBe(true);
			expect(result.id).toBeDefined();
			expect(result.kind).toBe('note');
			expect(mockStore.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					kind: 'note',
					text: 'Test memory',
					tags: ['test'],
				}),
				'test-namespace',
			);
		});
	});

	describe('get', () => {
		it('should retrieve a memory by ID', async () => {
			mockStore.get.mockResolvedValue(testMemory);

			const result = await handler.get({ id: 'test-id' });

			expect(result).toEqual(testMemory);
			expect(mockStore.get).toHaveBeenCalledWith('test-id', 'test-namespace');
		});

		it('should return null for non-existent memory', async () => {
			mockStore.get.mockResolvedValue(null);

			const result = await handler.get({ id: 'non-existent' });

			expect(result).toBeNull();
		});
	});

	describe('search', () => {
		it('should search memories by text', async () => {
			const searchResults = [testMemory];
			mockStore.searchByText.mockResolvedValue(searchResults);

			const result = await handler.search({
				query: 'test query',
				limit: 10,
			});

			expect(result.results).toEqual(searchResults);
			expect(result.totalFound).toBe(1);
			expect(mockStore.searchByText).toHaveBeenCalledWith(
				{
					text: 'test query',
					topK: 10,
				},
				'test-namespace',
			);
		});

		it('should filter by kind when specified', async () => {
			const searchResults = [
				{ ...testMemory, kind: 'note' },
				{ ...testMemory, id: '2', kind: 'task' },
			];
			mockStore.searchByText.mockResolvedValue(searchResults);

			const result = await handler.search({
				query: 'test',
				kind: 'note',
			});

			expect(result.results).toHaveLength(1);
			expect(result.results[0].kind).toBe('note');
		});
	});

	describe('update', () => {
		it('should update an existing memory', async () => {
			const existingMemory = { ...testMemory, text: 'Original text' };
			const updatedMemory = { ...existingMemory, text: 'Updated text' };

			mockStore.get.mockResolvedValue(existingMemory);
			mockStore.upsert.mockResolvedValue(updatedMemory);

			const result = await handler.update({
				id: 'test-id',
				text: 'Updated text',
			});

			expect(result.updated).toBe(true);
			expect(result.changes.text).toBe(true);
			expect(mockStore.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'test-id',
					text: 'Updated text',
				}),
				'test-namespace',
			);
		});

		it('should throw error for non-existent memory', async () => {
			mockStore.get.mockResolvedValue(null);

			await expect(
				handler.update({
					id: 'non-existent',
					text: 'Updated text',
				}),
			).rejects.toThrow('Memory with ID non-existent not found');
		});
	});

	describe('delete', () => {
		it('should delete a memory', async () => {
			mockStore.delete.mockResolvedValue();

			const result = await handler.delete({ id: 'test-id' });

			expect(result.deleted).toBe(true);
			expect(result.id).toBe('test-id');
			expect(mockStore.delete).toHaveBeenCalledWith('test-id', 'test-namespace');
		});
	});

	describe('list', () => {
		it('should list memories with pagination', async () => {
			const memories = [testMemory, { ...testMemory, id: '2' }];
			mockStore.list.mockResolvedValue(memories);

			const result = await handler.list({
				limit: 20,
			});

			expect(result.items).toEqual(memories);
			expect(mockStore.list).toHaveBeenCalledWith('test-namespace', 20, 0);
		});

		it('should handle cursor-based pagination', async () => {
			const memories = Array.from({ length: 30 }, (_, i) => ({
				...testMemory,
				id: String(i + 1),
			}));
			mockStore.list.mockResolvedValue(memories);

			const result = await handler.list({
				limit: 20,
				cursor: '20',
			});

			expect(result.items).toHaveLength(20);
			expect(result.nextCursor).toBe('40');
			expect(mockStore.list).toHaveBeenCalledWith('test-namespace', 20, 20);
		});
	});

	describe('stats', () => {
		it('should return memory statistics', async () => {
			const memories = [
				testMemory,
				{ ...testMemory, id: '2', kind: 'task' },
				{ ...testMemory, id: '3', kind: 'note' },
			];
			mockStore.list.mockResolvedValue(memories);

			const result = await handler.stats({ includeDetails: true });

			expect(result.totalItems).toBe(3);
			expect(result.itemsByKind).toEqual({
				note: 2,
				task: 1,
			});
			expect(result.details).toBeDefined();
		});
	});
});
