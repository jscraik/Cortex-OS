import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { runSpool, type SpoolResult } from '../../packages/orchestration/src/langgraph/spool.js';
import { appendPerformanceHistory } from './perf-history.js';

type Metrics = {
	count: number;
	durations: number[];
};

function createTasks(count: number): Metrics & { tasks: Parameters<typeof runSpool>[0] } {
	const durations: number[] = [];
	const tasks = Array.from({ length: count }, (_v, index) => ({
		id: `task-${index}`,
		name: `benchmark-${index}`,
		estimateTokens: 4,
		execute: async () => {
			const start = performance.now();
			await new Promise((resolve) => setTimeout(resolve, 1));
			durations.push(performance.now() - start);
			return `result-${index}`;
		},
	}));
	return { tasks, count, durations };
}

describe('Spool throughput benchmark', () => {
	it('processes batches within budget limits', async () => {
		const targetCount = 16;
		const budgetMs = 2500;
		const { tasks, durations } = createTasks(targetCount);

		const start = performance.now();
		const results = await runSpool(tasks, {
			concurrency: 4,
			tokens: targetCount * 8,
			ms: budgetMs,
			onStart: () => {
				/* telemetry placeholder */
			},
		});
		const elapsed = performance.now() - start;

		const fulfilled = results.filter((res) => res.status === 'fulfilled') as Array<
			SpoolResult<string>
		>;
		expect(fulfilled).toHaveLength(targetCount);
		for (const res of fulfilled) {
			expect(res.value?.startsWith('result-')).toBe(true);
			expect(res.started).toBe(true);
		}

                const averageDuration = durations.reduce((sum, value) => sum + value, 0) / durations.length;
                expect(averageDuration).toBeLessThan(50);
                expect(elapsed).toBeLessThan(budgetMs);

                await appendPerformanceHistory({
                        target: 'spool.throughput',
                        durationMs: elapsed,
                        timestamp: new Date().toISOString(),
                        metadata: {
                                taskCount: targetCount,
                                concurrency: 4,
                                averageTaskDurationMs: Number(averageDuration.toFixed(2)),
                        },
                });
        });
});
