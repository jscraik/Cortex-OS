import { beforeEach, describe, expect, it } from 'vitest';

import { SimplePRPGraph } from './graph-simple.js';
import type { PRPOrchestrator } from './mcp/adapter.js';
import { getMetrics, getSpans, resetTelemetry } from './observability/otel.js';

const blueprint = {
	title: 'Sample MVP workflow',
	description: 'Covers all phases of the simplified graph',
	requirements: ['strategy validation', 'build artifacts', 'evaluation review'],
};

describe('SimplePRPGraph', () => {
	beforeEach(() => {
		resetTelemetry();
	});

	it.todo('executes subAgent operations once orchestrator hooks are available');

	it('runs deterministic workflow and records telemetry', async () => {
		const orchestrator: PRPOrchestrator = {
			getNeuronCount: () => 3,
		};
		const graph = new SimplePRPGraph(orchestrator);

		const result = await graph.runPRPWorkflow(blueprint, {
			deterministic: true,
		});

		expect(result.phase).toBe('completed');
		expect(result.cerebrum?.decision).toBe('promote');

		const history = graph.getExecutionHistory(result.runId);
		expect(history).toHaveLength(4);
		expect(history.map((state) => state.phase)).toEqual([
			'strategy',
			'build',
			'evaluation',
			'completed',
		]);

		expect(getMetrics()).toEqual([
			{ name: 'prp.duration', value: expect.any(Number), unit: 'milliseconds' },
			{ name: 'prp.phases.completed', value: 3, unit: '' },
		]);

		const spanStatuses = getSpans().map((span) => span.status);
		expect(spanStatuses).toEqual(['OK', 'OK', 'OK', 'OK']);
	});

	it('captures errors and recycles workflow state', async () => {
		const orchestrator: PRPOrchestrator = {
			getNeuronCount: () => {
				throw new Error('orchestrator down');
			},
		};
		const graph = new SimplePRPGraph(orchestrator);

		const result = await graph.runPRPWorkflow(blueprint, {
			deterministic: true,
			runId: 'failing-run',
		});

		expect(result.phase).toBe('recycled');
		expect(result.metadata.error).toBe('orchestrator down');

		const history = graph.getExecutionHistory('failing-run');
		expect(history).toHaveLength(2);
		expect(history[0].phase).toBe('strategy');
		expect(history[1].phase).toBe('recycled');
		expect(history[1].metadata.error).toBe('orchestrator down');

		const statuses = getSpans().map((span) => span.status);
		expect(statuses.includes('ERROR')).toBe(true);
	});
});
