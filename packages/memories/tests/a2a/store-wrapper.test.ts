import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryA2AEventPublisher } from '../../src/a2a/event-publisher.js';
import { A2AAwareMemoryStore } from '../../src/a2a/store-wrapper.js';
import type { Memory, TextQuery } from '../../src/domain/types.js';
import { createExpiredMemory, createMemory, TestMemoryStore } from '../test-utils.js';

describe('A2A Aware Memory Store', () => {
	let baseStore: TestMemoryStore;
	let a2aStore: A2AAwareMemoryStore;
	let eventPublisher: MemoryA2AEventPublisher;
	let mockOutbox: any;

	beforeEach(() => {
		vi.useFakeTimers();
		baseStore = new TestMemoryStore();
		mockOutbox = {
			publish: vi.fn(),
			publishBatch: vi.fn(),
			start: vi.fn(),
			stop: vi.fn(),
		};

		a2aStore = new A2AAwareMemoryStore(baseStore, {
			source: 'test-store',
			enabled: true,
		});

		eventPublisher = a2aStore.getEventPublisher();
		eventPublisher.setOutbox(mockOutbox);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('Event Publishing on Operations', () => {
		it('should publish memory.created event on first upsert', async () => {
			const memory = createMemory({
				text: 'Test memory',
			});

			const result = await a2aStore.upsert(memory);
			await vi.runAllTimersAsync();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.type).toBe('memories.memory.created');
			expect(envelope.subject).toBe(memory.id);
			expect(envelope.data).toEqual({ memory: result });
		});

		it('should publish memory.updated event on subsequent upsert', async () => {
			const memory = createMemory({
				text: 'Original memory',
			});

			// First insert
			await a2aStore.upsert(memory);
			await vi.runAllTimersAsync();
			mockOutbox.publishBatch.mockClear();

			// Update
			const updated = { ...memory, text: 'Updated memory', updatedAt: new Date().toISOString() };
			const result = await a2aStore.upsert(updated);
			await vi.runAllTimersAsync();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.type).toBe('memories.memory.updated');
			expect(envelope.data).toEqual({
				memory: result,
				changes: {
					old: memory,
					new: result,
				},
			});
		});

		it('should publish memory.deleted event on delete', async () => {
			const memory = createMemory();

			await a2aStore.upsert(memory);
			await vi.runAllTimersAsync();
			await eventPublisher.flush();
			mockOutbox.publishBatch.mockClear();
			console.log('Memory ID to delete:', memory.id);

			await a2aStore.delete(memory.id);
			await vi.runAllTimersAsync();
			// Ensure events are flushed
			await eventPublisher.flush();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			console.log('Actual envelope type:', envelope.type);
			console.log('Expected envelope type:', 'memories.memory.deleted');
			expect(envelope.type).toBe('memories.memory.deleted');
			expect(envelope.data).toEqual({
				memoryId: memory.id,
				reason: 'manual',
			});
		});

		it('should publish memory.searched event on text search', async () => {
			const memory = createMemory();
			await a2aStore.upsert(memory);
			await vi.runAllTimersAsync();
			await eventPublisher.flush();
			mockOutbox.publishBatch.mockClear();

			const query: TextQuery = { text: 'test', limit: 10 };
			const results = await a2aStore.searchByText(query);
			await vi.runAllTimersAsync();
			// Ensure events are flushed
			await eventPublisher.flush();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.type).toBe('memories.memory.searched');
			expect(envelope.data).toEqual({
				query: {
					text: 'test',
					limit: 10,
					filters: undefined,
				},
				results: {
					count: results.length,
					memories: results,
					executionTimeMs: expect.any(Number),
				},
			});
		});

		it('should publish memory.searched event on vector search', async () => {
			const memory = createMemory({
				vector: [0.1, 0.2, 0.3],
			});

			await a2aStore.upsert(memory);
			await vi.runAllTimersAsync();
			await eventPublisher.flush();
			mockOutbox.publishBatch.mockClear();

			const query = { vector: [0.1, 0.2, 0.3], limit: 10 };
			const results = await a2aStore.searchByVector(query);
			await vi.runAllTimersAsync();
			// Ensure events are flushed
			await eventPublisher.flush();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.type).toBe('memories.memory.searched');
			expect(envelope.data).toEqual({
				query: {
					vector: [0.1, 0.2, 0.3],
					limit: 10,
					filters: undefined,
				},
				results: {
					count: results.length,
					memories: results,
					executionTimeMs: expect.any(Number),
				},
			});
		});

		it('should publish memory.purged event when purging', async () => {
			const memory = createExpiredMemory();
			await a2aStore.upsert(memory);
			await vi.runAllTimersAsync();
			await eventPublisher.flush();
			mockOutbox.publishBatch.mockClear();

			const count = await a2aStore.purgeExpired(new Date().toISOString());
			await vi.runAllTimersAsync();
			// Ensure events are flushed
			await eventPublisher.flush();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.type).toBe('memories.memory.purged');
			expect(envelope.data).toEqual({
				namespace: 'default',
				count,
				timestamp: expect.any(String),
			});
		});
	});

	describe('Error Handling', () => {
		it('should publish memory.error event on upsert failure', async () => {
			const error = new Error('Upsert failed');
			vi.spyOn(baseStore, 'upsert').mockRejectedValue(error);

			const memory = createMemory();

			await expect(a2aStore.upsert(memory)).rejects.toThrow('Upsert failed');
			await vi.runAllTimersAsync();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.type).toBe('memories.memory.error');
			expect(envelope.data).toEqual({
				error: {
					type: 'Error',
					message: 'Upsert failed',
					stack: expect.any(String),
				},
				operation: 'upsert',
				context: {
					namespace: 'default',
					memoryId: memory.id,
					executionTimeMs: expect.any(Number),
				},
			});
		});

		it('should publish memory.error event on delete failure', async () => {
			const error = new Error('Delete failed');
			vi.spyOn(baseStore, 'delete').mockRejectedValue(error);

			await expect(a2aStore.delete('test-id')).rejects.toThrow('Delete failed');
			await vi.runAllTimersAsync();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.type).toBe('memories.memory.error');
			expect(envelope.data).toEqual({
				error: {
					type: 'Error',
					message: 'Delete failed',
					stack: expect.any(String),
				},
				operation: 'delete',
				context: {
					namespace: 'default',
					memoryId: 'test-id',
				},
			});
		});

		it('should publish memory.error event on search failure', async () => {
			const error = new Error('Search failed');
			vi.spyOn(baseStore, 'searchByText').mockRejectedValue(error);

			const query: TextQuery = { text: 'test', limit: 10 };

			await expect(a2aStore.searchByText(query)).rejects.toThrow('Search failed');
			await vi.runAllTimersAsync();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.type).toBe('memories.memory.error');
			expect(envelope.data).toEqual({
				error: {
					type: 'Error',
					message: 'Search failed',
					stack: expect.any(String),
				},
				operation: 'searchByText',
				context: {
					namespace: 'default',
					query,
					executionTimeMs: expect.any(Number),
				},
			});
		});
	});

	describe('Event Publisher Integration', () => {
		it('should provide access to the event publisher', () => {
			const publisher = a2aStore.getEventPublisher();
			expect(publisher).toBeInstanceOf(MemoryA2AEventPublisher);
		});

		it('should allow setting the outbox after construction', () => {
			const newStore = new A2AAwareMemoryStore(baseStore, {
				source: 'test',
			});

			newStore.setOutbox(mockOutbox);

			const publisher = newStore.getEventPublisher();
			expect(publisher['outbox']).toBe(mockOutbox);
		});
	});

	describe('Namespace Handling', () => {
		it('should include namespace in event headers', async () => {
			const memory = createMemory();
			const customNamespace = 'custom-ns';

			await a2aStore.upsert(memory, customNamespace);
			await vi.runAllTimersAsync();

			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.headers['memory-namespace']).toBe(customNamespace);
		});

		it('should use default namespace when not specified', async () => {
			const memory = createMemory();

			await a2aStore.upsert(memory);
			await vi.runAllTimersAsync();

			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.headers['memory-namespace']).toBe('default');
		});
	});

	describe('Performance', () => {
		it('should measure execution time for operations', async () => {
			// First create a memory to ensure search results
			const memory = createMemory();
			await a2aStore.upsert(memory);
			await vi.runAllTimersAsync();
			await eventPublisher.flush();
			mockOutbox.publishBatch.mockClear();

			const mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(1000);

			try {
				vi.spyOn(baseStore, 'searchByText').mockImplementation(async () => {
					mockDateNow.mockReturnValue(1010); // 10ms later
					return [memory];
				});

				const query: TextQuery = { text: 'test', limit: 10 };
				await a2aStore.searchByText(query);
				await vi.runAllTimersAsync();

				const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
				expect(envelope.data.results.executionTimeMs).toBe(10);
			} finally {
				mockDateNow.mockRestore();
			}
		});
	});
});
