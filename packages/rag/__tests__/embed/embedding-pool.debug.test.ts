import { describe, expect, it } from 'vitest';
import { createPooledEmbedder, PooledEmbedder } from '../../src/embed/embedding-pool.js';
import type { Embedder } from '../../src/lib/types.js';

function makeEmbedder(delayMs = 5): Embedder {
	return {
		async embed(texts: string[]): Promise<number[][]> {
			await new Promise((r) => setTimeout(r, delayMs));
			return texts.map((t, i) => Array.from({ length: 4 }, () => i + 0.1));
		},
	} as Embedder;
}

describe('PooledEmbedder.debug', () => {
	it('exposes slot-level stats and toggles busy state', async () => {
		const inner = makeEmbedder(10);
		const pool = new PooledEmbedder(inner, {
			minWorkers: 2,
			maxWorkers: 4,
			batchSize: 2,
			label: 'test.pool',
		});

		// Before any work
		let d = pool.debug();
		expect(d.workers).toBeGreaterThanOrEqual(2);
		expect(d.slots.length).toBeGreaterThanOrEqual(2);
		expect(d.slots.every((s) => s.isActive === true)).toBe(true);

		// Enqueue a job that creates two tasks (batchSize=2)
		const texts = ['a', 'b', 'c', 'd'];
		const p = pool.embed(texts);

		// Shortly after, at least one slot should be busy
		await new Promise((r) => setTimeout(r, 1));
		d = pool.debug();
		expect(d.slots.some((s) => s.busy)).toBe(true);

		const result = await p;
		expect(result.length).toBe(4);

		d = pool.debug();
		// After completion, slots should not be busy
		expect(d.slots.every((s) => !s.busy)).toBe(true);
		// Some slots should have task accounting
		const anyWithTasks = d.slots.some((s) => s.tasks > 0 && s.texts > 0);
		expect(anyWithTasks).toBe(true);
	});

	it('reports queue and inflight consistently', async () => {
		const inner = makeEmbedder(15);
		const pool = createPooledEmbedder(inner, {
			minWorkers: 1,
			maxWorkers: 2,
			batchSize: 2,
			label: 'test.pool2',
		});

		const p = pool.embed(['x', 'y', 'z']); // 2 batches with batchSize=2
		let d = pool.debug();
		expect(d.queue).toBeGreaterThanOrEqual(0);
		expect(d.inflight).toBeGreaterThanOrEqual(0);

		await p;
		d = pool.debug();
		expect(d.queue).toBe(0);
		expect(d.inflight).toBe(0);
	});
});
