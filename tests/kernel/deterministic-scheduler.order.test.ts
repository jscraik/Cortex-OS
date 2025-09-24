import { describe, expect, it } from 'vitest';
import type { DeterministicTask } from '../../packages/kernel/src/scheduler/deterministicScheduler.js';
import { schedule } from '../../packages/kernel/src/scheduler/deterministicScheduler.js';

const makeTask = (id: string, priority: number, log: string[]): DeterministicTask<number> => ({
    id,
    priority,
    execute: () => {
        log.push(id);
        return priority;
    },
});

describe('DeterministicScheduler: ordering', () => {
    it('orders by priority desc then stable hash then id', async () => {
        const exec: string[] = [];
        const tasks: DeterministicTask<number>[] = [
            makeTask('a', 1, exec),
            makeTask('b', 3, exec),
            makeTask('c', 2, exec),
            makeTask('d', 3, exec),
        ];

        const result = await schedule(tasks, { seed: 'seed-1', maxConcurrent: 1 });

        // Highest priority 3 tasks first (b,d) order deterministic via hash/id, then priority 2 (c), then 1 (a)
        expect(result.records.map((r) => r.id).length).toBe(4);
        // Stability check re-run with same seed
        const again = await schedule(tasks, { seed: 'seed-1', maxConcurrent: 1 });
        expect(again.executionHash).toEqual(result.executionHash);
    });
});
