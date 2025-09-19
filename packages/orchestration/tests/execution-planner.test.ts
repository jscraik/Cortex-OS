import { ExecutionPlanSchema } from '@cortex-os/contracts';
import { describe, expect, it } from 'vitest';
import { ExecutionPlanner } from '../src/intelligence/execution-planner.js';

const baseWorkflow = {
	id: '00000000-0000-0000-0000-000000000100',
	name: 'simple',
	version: '1',
	entry: 'start',
	steps: {
		start: { id: 'start', name: 'start', kind: 'agent', next: 'end' },
		end: { id: 'end', name: 'end', kind: 'agent' },
	},
};

describe('ExecutionPlanner', () => {
	it('builds a contract-valid plan from an acyclic workflow with correct dependencies', async () => {
		const planner = new ExecutionPlanner();
		const plan = await planner.createPlanFromWorkflow(baseWorkflow);
		const parsed = ExecutionPlanSchema.parse(plan) as {
			steps: Array<{ id: string; name: string; dependsOn: string[] }>;
			metadata: { createdBy: string };
		};

		// Expect two steps in topological order with dependencies
		expect(parsed.steps.map((s: { id: string }) => s.id)).toEqual(['start', 'end']);
		const byId: Record<string, { id: string; name: string; dependsOn: string[] }> =
			Object.fromEntries(
				parsed.steps.map(
					(s: { id: string; name: string; dependsOn: string[] }) => [s.id, s] as const,
				),
			);
		expect(byId.start.dependsOn).toEqual([]);
		expect(byId.end.dependsOn).toEqual(['start']);
		expect(parsed.metadata.createdBy).toBe('execution-planner');
	});

	it('handles branching workflows and computes immediate dependencies', async () => {
		const branching = {
			id: '00000000-0000-0000-0000-000000000101',
			name: 'branching',
			version: '1',
			entry: 'start',
			steps: {
				start: {
					id: 'start',
					name: 'start',
					kind: 'branch',
					branches: [
						{ when: 'a', to: 'a' },
						{ when: 'b', to: 'b' },
					],
				},
				a: { id: 'a', name: 'a', kind: 'agent', next: 'end' },
				b: { id: 'b', name: 'b', kind: 'agent', next: 'end' },
				end: { id: 'end', name: 'end', kind: 'agent' },
			},
		};

		const planner = new ExecutionPlanner();
		const plan = await planner.createPlanFromWorkflow(branching);
		const parsed = ExecutionPlanSchema.parse(plan) as {
			steps: Array<{ id: string; name: string; dependsOn: string[] }>;
		};
		const byId: Record<string, { id: string; name: string; dependsOn: string[] }> =
			Object.fromEntries(
				parsed.steps.map(
					(s: { id: string; name: string; dependsOn: string[] }) => [s.id, s] as const,
				),
			);

		expect(parsed.steps.map((s: { id: string }) => s.id)).toEqual(['start', 'a', 'b', 'end']);
		expect(byId.start.dependsOn).toEqual([]);
		expect(byId.a.dependsOn).toEqual(['start']);
		expect(byId.b.dependsOn).toEqual(['start']);
		expect(byId.end.dependsOn.sort()).toEqual(['a', 'b']);
	});

	it('throws on cyclic workflows', async () => {
		const cyclic = {
			id: '00000000-0000-0000-0000-000000000102',
			name: 'cyclic',
			version: '1',
			entry: 'start',
			steps: {
				start: { id: 'start', name: 'start', kind: 'agent', next: 'end' },
				end: { id: 'end', name: 'end', kind: 'agent', next: 'start' },
			},
		};

		const planner = new ExecutionPlanner();
		await expect(planner.createPlanFromWorkflow(cyclic)).rejects.toThrow(/Cycle detected/);
	});
});
