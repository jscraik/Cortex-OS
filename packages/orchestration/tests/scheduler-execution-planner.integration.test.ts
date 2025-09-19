import { ExecutionPlanSchema, ExecutionRequestSchema } from '@cortex-os/contracts';
import { describe, expect, it } from 'vitest';
import { BasicScheduler } from '../src/intelligence/basic-scheduler.js';

const baseWorkflow = {
	id: '00000000-0000-0000-0000-00000000abcd',
	name: 'simple',
	version: '1',
	entry: 'start',
	steps: {
		start: { id: 'start', name: 'start', kind: 'agent', next: 'end' },
		end: { id: 'end', name: 'end', kind: 'agent' },
	},
};

describe('BasicScheduler + ExecutionPlanner integration', () => {
	it('uses ExecutionPlanner when context.workflow is provided', async () => {
		const scheduler = new BasicScheduler();
		const request = ExecutionRequestSchema.parse({
			task: 'workflow-task',
			constraints: { timeoutMs: 2000, maxTokens: 256 },
			context: { workflow: baseWorkflow },
		});

		const plan = await scheduler.planExecution(request);
		const parsed = ExecutionPlanSchema.parse(plan) as {
			steps: Array<{ id: string; name: string; dependsOn: string[] }>;
			metadata: { createdBy: string };
		};

		expect(parsed.metadata.createdBy).toBe('execution-planner');
		expect(parsed.steps.map((s) => s.id)).toEqual(['start', 'end']);
		const end = parsed.steps.find((s) => s.id === 'end')!;
		expect(end.dependsOn).toEqual(['start']);
	});
});
