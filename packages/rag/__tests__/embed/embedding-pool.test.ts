import { describe, expect, it, vi } from 'vitest';
import { PooledEmbedder } from '../../src/embed/embedding-pool.js';
import type { Embedder } from '../../src/lib/types.js';

function createFakeEmbedder(delayMs = 0): Embedder {
	const embed = vi.fn(async (texts: string[]) => {
		if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
		return texts.map((t) => Array.from({ length: 4 }, (_, i) => (t.length + i) % 7));
	});
	const e: Embedder = { embed };
	return e;
}

describe('PooledEmbedder', () => {
	it('reuses workers across batches', async () => {
		const inner = createFakeEmbedder(5);
		const pool = new PooledEmbedder(inner, { minWorkers: 1, maxWorkers: 2, batchSize: 2 });
		const a = await pool.embed(['a', 'bb', 'ccc', 'dddd']);
		const before = pool.stats().currentWorkers;
		const b = await pool.embed(['e', 'ff']);
		const after = pool.stats().currentWorkers;
		expect(a).toHaveLength(4);
		expect(b).toHaveLength(2);
		// Same pool instance should maintain workers (no forced reset)
		expect(after).toBeGreaterThanOrEqual(1);
		expect(before).toBeGreaterThanOrEqual(1);
	});

	it('scales up based on queue depth and down on idle', async () => {
		const inner = createFakeEmbedder(10);
		const pool = new PooledEmbedder(inner, {
			minWorkers: 1,
			maxWorkers: 3,
			batchSize: 1,
			scaleUpAt: 2,
			scaleDownAt: 0,
			idleMillisBeforeScaleDown: 20,
		});

		// Fire many requests concurrently to fill queue
		const p = Promise.all([
			pool.embed(['a']),
			pool.embed(['b']),
			pool.embed(['c']),
			pool.embed(['d']),
		]);
		// Wait a moment for scaling decisions
		await new Promise((r) => setTimeout(r, 15));
		const up = pool.stats().currentWorkers;
		expect(up).toBeGreaterThanOrEqual(2);
		await p;
		// Allow idle time for scale down
		await new Promise((r) => setTimeout(r, 30));
		const down = pool.stats().currentWorkers;
		expect(down).toBeGreaterThanOrEqual(1);
		expect(down).toBeLessThanOrEqual(up);
	});

	it('handles worker failures gracefully by shedding capacity', async () => {
		const embed = vi
			.fn()
			.mockRejectedValueOnce(new Error('fail-1'))
			.mockResolvedValueOnce([[1, 2]])
			.mockResolvedValueOnce([[3, 4]])
			.mockResolvedValueOnce([[5, 6]]);
		const inner: Embedder = { embed } as unknown as Embedder;
		const pool = new PooledEmbedder(inner, {
			minWorkers: 1,
			maxWorkers: 3,
			batchSize: 1,
			failureRestartThreshold: 1,
		});

		// First call fails
		await expect(pool.embed(['x'])).rejects.toThrow('fail-1');
		// Next calls succeed and pool continues operating
		const r1 = await pool.embed(['y']);
		const r2 = await pool.embed(['z']);
		expect(r1[0]).toEqual([1, 2]);
		expect(r2[0]).toEqual([3, 4]);
	});

	it('achieves >2x throughput with more workers', async () => {
		const delay = 15;
		const make = () => createFakeEmbedder(delay);
		// 1 worker
		const pool1 = new PooledEmbedder(make(), {
			minWorkers: 1,
			maxWorkers: 1,
			batchSize: 1,
			scaleUpAt: 100,
		});
		const t1 = Date.now();
		await pool1.embed(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
		const d1 = Date.now() - t1;

		// 4 workers
		const pool4 = new PooledEmbedder(make(), {
			minWorkers: 4,
			maxWorkers: 4,
			batchSize: 1,
		});
		const t2 = Date.now();
		await pool4.embed(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
		const d2 = Date.now() - t2;

		// Expect at least 2x speedup (with some slack)
		expect(d1 / Math.max(1, d2)).toBeGreaterThan(2);
	});

	it('applies backpressure when queue exceeds maxQueueSize', async () => {
		const inner = createFakeEmbedder(10);
		const pool = new PooledEmbedder(inner, {
			minWorkers: 1,
			maxWorkers: 1,
			batchSize: 1,
			maxQueueSize: 2,
		});
		// Fill queue by starting a long embed and then enqueue many
		const p = pool.embed(['x', 'y']);
		await new Promise((r) => setTimeout(r, 1));
		await expect(pool.embed(['a', 'b', 'c'])).rejects.toThrow(/Backpressure/);
		await p;
	});
});
