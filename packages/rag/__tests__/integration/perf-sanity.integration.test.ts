import { describe, expect, it } from 'vitest';
import type { Chunk } from '../../src/lib/index.js';
import { memoryStore } from '../../src/store/memory.js';

describe('perf sanity', () => {
	it('upserts and queries a small dataset within a generous time budget', async () => {
		const store = memoryStore();
		const dim = 64;
		const n = 200; // small size to avoid flakiness

		function vec(seed: number): number[] {
			const out = new Array(dim).fill(0).map((_, i) => Math.sin(seed + i) * 0.5 + 0.5);
			return out;
		}

		const start = Date.now();
		const payload: Chunk[] = Array.from({ length: n }, (_, i) => ({
			id: `id-${i}`,
			text: `chunk ${i}`,
			embedding: vec(i),
			metadata: { i },
		}));
		await store.upsert(payload);
		const mid = Date.now();
		const res = await store.query(vec(1), 5);
		const end = Date.now();

		expect(res.length).toBe(5);
		// generous budgets on CI machines
		expect(mid - start).toBeLessThan(1500);
		expect(end - mid).toBeLessThan(1500);
	});
});
