import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../../src/langgraph/create-cerebrum-graph.js';
import { MultiAgentCoordinator } from '../../src/langgraph/multi-agent-coordinator.js';
import { createInitialN0State } from '../../src/langgraph/n0-state.js';

describe('Distributed LangGraph workflows', () => {
	const baseSession = {
		model: 'distributed-langgraph-model',
		user: 'distributed-runner',
		cwd: '/workspace/distributed',
		id: 'session-distributed',
	} as const;

	it('coordinates workflows across services with metadata preservation', async () => {
		const coordinator = new MultiAgentCoordinator();
		const planningGraph = createCerebrumGraph();
		const executionGraph = createCerebrumGraph();

		coordinator.registerWorkflow({
			id: 'planning-service',
			service: 'orchestration-service',
			graph: planningGraph,
			initialState: createInitialN0State('Plan deployment', baseSession, {
				ctx: { phase: 'planning' },
			}),
			metadata: { region: 'us-east-1' },
		});

		coordinator.registerWorkflow({
			id: 'execution-service',
			service: 'mlx-runtime',
			graph: executionGraph,
			initialState: createInitialN0State('Execute rollout', baseSession, {
				ctx: { phase: 'execution' },
			}),
			metadata: { region: 'us-west-2' },
		});

		const completed: Array<{ id: string; service?: string }> = [];
		coordinator.on('workflowCompleted', (event) => {
			completed.push({ id: event.id, service: event.service });
		});

		const results = await coordinator.coordinateDistributedWorkflows([
			{
				id: 'planning-service',
				input: 'Draft remediation steps',
				metadata: { release: '2025.09.27' },
			},
			{
				id: 'execution-service',
				input: 'Apply remediation playbook',
				metadata: { release: '2025.09.27' },
			},
		]);

		expect(results).toHaveLength(2);
		const planningResult = results.find((result) => result.id === 'planning-service');
		const executionResult = results.find((result) => result.id === 'execution-service');

		expect(planningResult?.output).toBe('Draft remediation steps');
		expect(planningResult?.service).toBe('orchestration-service');
		expect(executionResult?.output).toBe('Apply remediation playbook');
		expect(executionResult?.service).toBe('mlx-runtime');

		const planningState = coordinator.getWorkflowState('planning-service');
		const executionState = coordinator.getWorkflowState('execution-service');

		expect(planningState.ctx?.lastResult).toBeDefined();
		expect(executionState.ctx?.lastResult).toBeDefined();

		const metrics = coordinator.getMetrics();
		expect(metrics.workflowsCompleted).toBe(2);
		expect(completed).toEqual([
			{ id: 'planning-service', service: 'orchestration-service' },
			{ id: 'execution-service', service: 'mlx-runtime' },
		]);
	});
});
