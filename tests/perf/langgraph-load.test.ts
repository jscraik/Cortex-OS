import { describe, expect, it } from 'vitest';
import { bootstrapLanggraphTestHarness } from '../setup/langgraph-integration.js';

describe('LangGraph load benchmark', () => {
	it('records integration duration metrics under load', async () => {
		const harness = bootstrapLanggraphTestHarness();
		const metrics: number[] = [];

		const tasks = Array.from({ length: 12 }, (_value, index) => ({
			id: `workflow-${index}`,
			estimateTokens: 6,
			execute: async () => {
				const result = await harness.run(`Load iteration ${index}`);
				return result.output ?? '';
			},
		}));

		await harness.spool(tasks, {
			concurrency: 4,
			ms: 4000,
			tokens: 12 * 6,
			integrationMetrics: {
				enabled: true,
				attributes: { scenario: 'langgraph-load' },
				onRecord: (value) => {
					metrics.push(value);
				},
			},
		});

		expect(metrics[0]).toBeGreaterThan(0);
		expect(metrics[0]).toBeLessThan(4000);
	});
});
