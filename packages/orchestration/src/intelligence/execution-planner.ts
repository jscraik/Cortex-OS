import { ExecutionPlanSchema } from '../../../libs/typescript/contracts/src/orchestration-no/intelligence-scheduler.js';
import { workflowZ } from '../schemas/workflow.zod.js';
import { validateWorkflow } from '../workflow-validator.js';

export class ExecutionPlanner {
	async createPlanFromWorkflow(input: unknown) {
		// Parse workflow and validate DAG; throws on cycles or bad refs
		const wf = workflowZ.parse(input);
		const { topologicalOrder } = validateWorkflow(wf);

		// Build parent (immediate dependency) map
		const parents = new Map<string, Set<string>>();
		for (const id of Object.keys(wf.steps)) parents.set(id, new Set());

		for (const [id, step] of Object.entries(wf.steps)) {
			if (step.next) {
				parents.get(step.next)?.add(id);
			}
			if (step.branches) {
				for (const br of step.branches) parents.get(br.to)?.add(id);
			}
		}

		// Only include reachable nodes (those in topological order) and keep order stable
		const steps = topologicalOrder.map((id) => ({
			id,
			name: wf.steps[id].name,
			dependsOn: Array.from(parents.get(id) ?? []),
		}));

		const plan = {
			id: `plan-${Date.now()}`,
			steps,
			metadata: {
				createdBy: 'execution-planner',
			},
		};

		return ExecutionPlanSchema.parse(plan);
	}
}
