import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStoreForKind } from '../src/config/store-from-env.js';
import type { Memory } from '../src/domain/types.js';
import type { MemoryStore } from '../src/ports/MemoryStore.js';
import {
	setupLocalHarness,
	setupPrismaHarness,
	type HarnessResult,
} from './test-utils/store-harness.js';

type Harness = {
	label: string;
	setup: () => Promise<HarnessResult>;
	expectsVector: boolean;
	expectsPurge?: number;
};

const BASE_MEMORY: Memory = {
	id: 'kv-alpha',
	kind: 'note',
	text: 'Alpha memory payload',
	tags: ['alpha', 'integration'],
	vector: [0.1, 0.9, 0.2, 0.7],
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	provenance: { source: 'system' },
};

const harnesses: Harness[] = [
	{
		label: 'SQLite adapter',
		kind: 'sqlite',
		setup: async () => {
			process.env.MEMORIES_EXTERNAL_STORAGE_ENABLED = 'false';
			const store = await createStoreForKind('sqlite');
			return { store, teardown: () => undefined };
		},
		expectsVector: true,
		expectsPurge: 1,
	},
	{
		label: 'Prisma adapter',
		kind: 'prisma',
		setup: async () => setupPrismaHarness(BASE_MEMORY),
		expectsVector: true,
		expectsPurge: 1,
	},
	{
		label: 'Local Memory adapter',
		kind: 'local',
		setup: async () => setupLocalHarness(BASE_MEMORY),
		expectsVector: false,
		expectsPurge: 0,
	},
];

describe.each(harnesses)('$label', ({ setup, expectsVector, expectsPurge }) => {
	let store: MemoryStore;
	let harness: HarnessResult | { store: MemoryStore; teardown: () => void };

	beforeEach(async () => {
		harness = await setup();
		store = harness.store;
	});

	afterEach(async () => {
		await store.delete(BASE_MEMORY.id).catch(() => undefined);
		await store.delete('kv-ttl').catch(() => undefined);
		harness.teardown();
		vi.restoreAllMocks();
	});

	it('performs CRUD operations and text search', async () => {
		await store.upsert(BASE_MEMORY, 'ns-integration');

		const fetched = await store.get(BASE_MEMORY.id, 'ns-integration');
		expect(fetched?.text).toBe('Alpha memory payload');

		const textResults = await store.searchByText(
			{ text: 'alpha memory', topK: 5, filterTags: ['alpha'] },
			'ns-integration',
		);
		expect(textResults.find((entry) => entry.id === BASE_MEMORY.id)).toBeDefined();

		if (expectsVector) {
			const vectorResults = await store.searchByVector(
				{ vector: BASE_MEMORY.vector as number[], topK: 3 },
				'ns-integration',
			);
			expect(vectorResults[0]?.id).toBe(BASE_MEMORY.id);
		} else {
			const vectorFallback = await store.searchByVector(
				{ vector: BASE_MEMORY.vector as number[], topK: 3 },
				'ns-integration',
			);
			expect(vectorFallback).toEqual([]);
		}

		await store.delete(BASE_MEMORY.id, 'ns-integration');
		const afterDelete = await store.get(BASE_MEMORY.id, 'ns-integration');
		expect(afterDelete).toBeNull();
	});

	it('purges expired memories according to adapter capabilities', async () => {
		await store.upsert(
			{
				...BASE_MEMORY,
				id: 'kv-ttl',
				ttl: 'PT1S',
				tags: ['ttl'],
			},
			'ns-integration',
		);

		const purgeCount = await store.purgeExpired(
			new Date(Date.now() + 10_000).toISOString(),
			'ns-integration',
		);

		expect(purgeCount).toBe(expectsPurge);
	});
});
