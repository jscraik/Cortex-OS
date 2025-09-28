import { describe, expect, it, vi } from 'vitest';
import { createHealthRoutedStore } from '../../src/adapters/store.health-router.js';
import type { Memory } from '../../src/domain/types.js';
import type { MemoryStore } from '../../src/ports/MemoryStore.js';

const createStoreStub = (): MemoryStore => ({
	upsert: vi.fn(async (memory) => memory),
	get: vi.fn(async () => null),
	delete: vi.fn(async () => undefined),
	searchByText: vi.fn(async () => []),
	searchByVector: vi.fn(async () => []),
	purgeExpired: vi.fn(async () => 0),
	list: vi.fn(async () => []),
});

describe('health routed memory store failover', () => {
	it('fails over to fallback store and restores primary when healthy', async () => {
		const primary = createStoreStub();
		const fallback = createStoreStub();
		const memory: Memory = {
			id: 'memory-1',
			namespace: 'default',
			text: 'brAInwav memory',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			embedding: [],
			metadata: {},
			expiresAt: null,
		};

		primary.get.mockRejectedValueOnce(new Error('primary down'));
		primary.get.mockResolvedValueOnce(memory);
		fallback.get.mockResolvedValue(memory);

		const checkSequence = [true, true];
		const store = createHealthRoutedStore({
			primary,
			fallback,
			check: async () => checkSequence.shift() ?? true,
			backoffMs: 1,
			refreshIntervalMs: 1,
			label: 'test-router',
		});

		const first = await store.get(memory.id, memory.namespace);
		expect(first).toEqual(memory);
		expect(primary.get).toHaveBeenCalledTimes(1);
		expect(fallback.get).toHaveBeenCalledTimes(1);

		await new Promise((resolve) => setTimeout(resolve, 2));

		const second = await store.get(memory.id, memory.namespace);
		expect(second).toEqual(memory);
		expect(primary.get).toHaveBeenCalledTimes(2);
		expect(fallback.get).toHaveBeenCalledTimes(1);
	});
});
