import { describe, expect, it } from 'vitest';
import type { DeterministicTask } from '../../packages/kernel/src/scheduler/deterministicScheduler.js';
import { schedule } from '../../packages/kernel/src/scheduler/deterministicScheduler.js';

describe('DeterministicScheduler: constraints', () => {
	it('respects maxConcurrent batching and memory cap', async () => {
		const tasks: DeterministicTask[] = Array.from({ length: 6 }).map((_, i) => ({
			id: `c${i}`,
			priority: 0,
			memoryMB: i < 3 ? 50 : 600,
			execute: () => i,
		}));

		const result = await schedule(tasks, { maxConcurrent: 4, maxMemoryMB: 200, seed: 'cap' });
		expect(result.records.length).toBeGreaterThan(0);
		expect(result.records.some((r) => r.id === 'c3')).toBe(false);
	});
});
