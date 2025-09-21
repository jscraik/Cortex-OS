import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { StreamingMemoryStore } from '../../src/adapters/store.streaming.js';
import { createMemory } from '../test-utils.js';

describe('StreamingMemoryStore', () => {
	let baseStore: InMemoryStore;
	let streamingStore: StreamingMemoryStore;
	let namespace: string;

	beforeEach(() => {
		baseStore = new InMemoryStore();
		streamingStore = new StreamingMemoryStore(baseStore);
		namespace = `test-${Math.random().toString(36).substring(7)}`;
	});

	afterEach(async () => {
		// Clean up
		const allMemories = await baseStore.list(namespace);
		for (const memory of allMemories) {
			await baseStore.delete(memory.id, namespace);
		}
	});

	describe('Change Streaming', () => {
		it('should stream changes when memories are created', async () => {
			const changes: any[] = [];

			// Subscribe to changes
			const subscription = streamingStore.subscribeToChanges(namespace, (change) => {
				changes.push(change);
			});

			// Create a memory
			const memory = createMemory({ text: 'Test memory' });
			await streamingStore.upsert(memory, namespace);

			// Should receive a change event
			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				type: 'create',
				memory,
				timestamp: expect.any(String),
			});

			subscription.unsubscribe();
		});

		it('should stream changes when memories are updated', async () => {
			const changes: any[] = [];

			// Create initial memory
			const memory = createMemory({ text: 'Original text' });
			await streamingStore.upsert(memory, namespace);

			// Subscribe to changes
			const subscription = streamingStore.subscribeToChanges(namespace, (change) => {
				changes.push(change);
			});

			// Update the memory
			const updatedMemory = { ...memory, text: 'Updated text' };
			await streamingStore.upsert(updatedMemory, namespace);

			// Should receive an update event
			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				type: 'update',
				memory: updatedMemory,
				previousMemory: memory,
				timestamp: expect.any(String),
			});

			subscription.unsubscribe();
		});

		it('should stream changes when memories are deleted', async () => {
			const changes: any[] = [];

			// Create initial memory
			const memory = createMemory({ text: 'To be deleted' });
			await streamingStore.upsert(memory, namespace);

			// Subscribe to changes
			const subscription = streamingStore.subscribeToChanges(namespace, (change) => {
				changes.push(change);
			});

			// Delete the memory
			await streamingStore.delete(memory.id, namespace);

			// Should receive a delete event
			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				type: 'delete',
				memoryId: memory.id,
				timestamp: expect.any(String),
			});

			subscription.unsubscribe();
		});

		it('should support multiple subscribers', async () => {
			const changes1: any[] = [];
			const changes2: any[] = [];

			// Two subscribers
			const subscription1 = streamingStore.subscribeToChanges(namespace, (change) => {
				changes1.push(change);
			});

			const subscription2 = streamingStore.subscribeToChanges(namespace, (change) => {
				changes2.push(change);
			});

			// Create a memory
			const memory = createMemory({ text: 'Test memory' });
			await streamingStore.upsert(memory, namespace);

			// Both subscribers should receive the change
			expect(changes1).toHaveLength(1);
			expect(changes2).toHaveLength(1);
			expect(changes1[0]).toEqual(changes2[0]);

			subscription1.unsubscribe();
			subscription2.unsubscribe();
		});

		it('should not send changes to unsubscribed listeners', async () => {
			const changes: any[] = [];

			// Subscribe and immediately unsubscribe
			const subscription = streamingStore.subscribeToChanges(namespace, (change) => {
				changes.push(change);
			});
			subscription.unsubscribe();

			// Create a memory
			const memory = createMemory({ text: 'Test memory' });
			await streamingStore.upsert(memory, namespace);

			// Should not receive any changes
			expect(changes).toHaveLength(0);
		});

		it('should filter changes by namespace', async () => {
			const changes: any[] = [];
			const otherNamespace = `other-${Math.random().toString(36).substring(7)}`;

			// Subscribe to changes in specific namespace
			const subscription = streamingStore.subscribeToChanges(namespace, (change) => {
				changes.push(change);
			});

			// Create memory in different namespace
			const memory = createMemory({ text: 'Other namespace memory' });
			await streamingStore.upsert(memory, otherNamespace);

			// Should not receive changes from other namespace
			expect(changes).toHaveLength(0);

			// Create memory in subscribed namespace
			const memory2 = createMemory({ text: 'Correct namespace memory' });
			await streamingStore.upsert(memory2, namespace);

			// Should receive change from correct namespace
			expect(changes).toHaveLength(1);

			subscription.unsubscribe();
		});
	});

	describe('Change Log', () => {
		it('should maintain a change log for auditing', async () => {
			// Create some memories
			const memory1 = createMemory({ text: 'Memory 1' });
			const memory2 = createMemory({ text: 'Memory 2' });

			await streamingStore.upsert(memory1, namespace);
			await streamingStore.upsert(memory2, namespace);
			await streamingStore.delete(memory1.id, namespace);

			// Get change log
			const changeLog = await streamingStore.getChangeLog(namespace, { limit: 10 });

			expect(changeLog).toHaveLength(3);
			expect(changeLog[0].type).toBe('delete');
			expect(changeLog[1].type).toBe('create');
			expect(changeLog[2].type).toBe('create');
		});

		it('should support pagination of change log', async () => {
			// Create multiple memories
			for (let i = 0; i < 15; i++) {
				const memory = createMemory({ text: `Memory ${i}` });
				await streamingStore.upsert(memory, namespace);
			}

			// Get first page
			const page1 = await streamingStore.getChangeLog(namespace, { limit: 5, offset: 0 });
			expect(page1).toHaveLength(5);

			// Get second page
			const page2 = await streamingStore.getChangeLog(namespace, { limit: 5, offset: 5 });
			expect(page2).toHaveLength(5);

			// Pages should be different
			expect(page1[0].memoryId).not.toBe(page2[0].memoryId);
		});

		it('should compact change log when size limit reached', async () => {
			// Set small change log size
			streamingStore.setMaxChangeLogSize(5);

			// Create more memories than the limit
			for (let i = 0; i < 10; i++) {
				const memory = createMemory({ text: `Memory ${i}` });
				await streamingStore.upsert(memory, namespace);
			}

			// Change log should be compacted to the limit
			const changeLog = await streamingStore.getChangeLog(namespace, { limit: 20 });
			expect(changeLog).toHaveLength(5);

			// Should contain the most recent changes
			expect(changeLog[0].memory?.text).toBe('Memory 9');
		});

		it('should filter change log by operation type', async () => {
			// Create and delete memories
			const memory = createMemory({ text: 'Test memory' });
			await streamingStore.upsert(memory, namespace);
			await streamingStore.delete(memory.id, namespace);

			// Get only create operations
			const creates = await streamingStore.getChangeLog(namespace, {
				operationTypes: ['create'],
				limit: 10,
			});
			expect(creates).toHaveLength(1);
			expect(creates[0].type).toBe('create');

			// Get only delete operations
			const deletes = await streamingStore.getChangeLog(namespace, {
				operationTypes: ['delete'],
				limit: 10,
			});
			expect(deletes).toHaveLength(1);
			expect(deletes[0].type).toBe('delete');
		});

		it('should replay changes from a specific point in time', async () => {
			// Create initial memory
			const memory1 = createMemory({ text: 'Initial memory' });
			await streamingStore.upsert(memory1, namespace);

			// Get timestamp after first operation
			await new Promise((resolve) => setTimeout(resolve, 10));
			const timestamp = new Date().toISOString();

			// Create more memories
			const memory2 = createMemory({ text: 'Later memory' });
			await streamingStore.upsert(memory2, namespace);

			// Replay changes from timestamp
			const changes = await streamingStore.replayChanges(namespace, timestamp);

			expect(changes).toHaveLength(1);
			expect(changes[0].memory?.text).toBe('Later memory');
		});
	});

	describe('Event Sourcing', () => {
		it('should reconstruct state from change log', async () => {
			// Create some memories with updates and deletes
			const memory1 = createMemory({ text: 'Version 1' });
			await streamingStore.upsert(memory1, namespace);

			const memory1Updated = { ...memory1, text: 'Version 2' };
			await streamingStore.upsert(memory1Updated, namespace);

			const memory2 = createMemory({ text: 'Another memory' });
			await streamingStore.upsert(memory2, namespace);

			await streamingStore.delete(memory2.id, namespace);

			// Clear the store
			const allMemories = await baseStore.list(namespace);
			for (const memory of allMemories) {
				await baseStore.delete(memory.id, namespace);
			}

			// Replay events to reconstruct state
			await streamingStore.replayEvents(namespace);

			// Check reconstructed state
			const finalMemories = await baseStore.list(namespace);
			expect(finalMemories).toHaveLength(1);
			expect(finalMemories[0].text).toBe('Version 2');
		});

		it('should support event versioning and migration', async () => {
			// Create memory with old event format
			const oldEvent = {
				type: 'create',
				data: { text: 'Old format memory' },
				version: '1.0',
			};

			// Add to change log directly (simulating old events)
			await streamingStore.addToChangeLog(namespace, oldEvent);

			// Replay should handle version migration
			await streamingStore.replayEvents(namespace);

			// Memory should exist with new format
			const memories = await baseStore.list(namespace);
			expect(memories).toHaveLength(1);
			expect(memories[0].text).toBe('Old format memory');
		});

		it('should handle event replay errors gracefully', async () => {
			// Add invalid event to change log
			const invalidEvent = {
				type: 'invalid_operation',
				data: null,
			};

			await streamingStore.addToChangeLog(namespace, invalidEvent);

			// Should not throw, should log error and continue
			await expect(streamingStore.replayEvents(namespace)).resolves.not.toThrow();
		});
	});
});
