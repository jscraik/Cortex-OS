import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import type { Memory } from '../src/domain/types.js';

describe('InMemoryStore edge cases', () => {
	it('throws on vector length mismatch', async () => {
		const store = new InMemoryStore();
		const now = new Date().toISOString();
		const m: Memory = {
			id: 'a',
			kind: 'note',
			text: 'x',
			vector: [1, 0],
			tags: [],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user' },
		};
		await store.upsert(m);
		await expect(store.searchByVector({ vector: [1], topK: 1 })).rejects.toThrow(
			'Vectors must have the same length',
		);
	});

	it('ignores invalid TTL values', async () => {
		const store = new InMemoryStore();
		const now = new Date().toISOString();
		const m: Memory = {
			id: 'b',
			kind: 'note',
			text: 'y',
			ttl: 'invalid',
			tags: [],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user' },
		};
		await store.upsert(m);
		const purged = await store.purgeExpired(new Date(Date.now() + 1000).toISOString());
		expect(purged).toBe(0);
	});
});
