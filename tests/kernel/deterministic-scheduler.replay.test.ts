import { describe, expect, it } from 'vitest';
import type { DeterministicTask } from '../../packages/kernel/src/scheduler/deterministicScheduler';
import {
	executeWithSeed,
	replay,
	schedule,
} from '../../packages/kernel/src/scheduler/deterministicScheduler';

describe('DeterministicScheduler: replay', () => {
	it('re-executes with identical hash when underlying logic unchanged', async () => {
		const tasks: DeterministicTask<number>[] = [
			{ id: 'r1', priority: 1, execute: () => 10 },
			{ id: 'r2', priority: 2, execute: () => 20 },
			{ id: 'r3', priority: 1, execute: () => 30 },
		];

		const initial = await schedule(tasks, { seed: 'replay-seed', maxConcurrent: 2 });
		const trace = {
			seed: initial.seed,
			tasks: tasks.map((t) => ({ id: t.id, priority: t.priority })),
			records: initial.records.map((r) => ({
				id: r.id,
				success: r.success,
				value: r.value,
				error: r.error,
			})),
			executionHash: initial.executionHash,
		};

		const taskMap: Record<string, DeterministicTask<number>> = Object.fromEntries(
			tasks.map((t) => [t.id, t]),
		);
		const again = await replay(trace, taskMap);
		expect(again.executionHash).toEqual(initial.executionHash);

		// Changing seed changes ordering (likely) and hash
		const diff = await executeWithSeed(tasks, 'different');
		expect(diff.executionHash).not.toEqual(initial.executionHash);
	});
});
