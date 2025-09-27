import { describe, expect, it } from 'vitest';
import type { DeterministicTask } from '../../packages/kernel/src/scheduler/deterministicScheduler.js';
import { executeWithSeed } from '../../packages/kernel/src/scheduler/deterministicScheduler.js';

describe('DeterministicScheduler: seed reproducibility', () => {
	const tasks: DeterministicTask<number>[] = Array.from({ length: 10 }).map((_, i) => ({
		id: `t${i}`,
		priority: i % 3,
		execute: () => i,
	}));

	it('produces identical execution hash for same seed', async () => {
		const run1 = await executeWithSeed(tasks, 'alpha', { maxConcurrent: 3 });
		const run2 = await executeWithSeed(tasks, 'alpha', { maxConcurrent: 3 });
		expect(run2.executionHash).toEqual(run1.executionHash);
	});

	it('produces different hash for different seed (probabilistic)', async () => {
		const run1 = await executeWithSeed(tasks, 'alpha');
		const run2 = await executeWithSeed(tasks, 'beta');
		// Could theoretically collide but extremely unlikely with differing ordering
		expect(run2.executionHash).not.toEqual(run1.executionHash);
	});
});
