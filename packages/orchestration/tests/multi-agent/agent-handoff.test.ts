import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../../src/langgraph/create-cerebrum-graph.js';
import { MultiAgentCoordinator } from '../../src/langgraph/multi-agent-coordinator.js';
import { createInitialN0State } from '../../src/langgraph/n0-state.js';

describe('LangGraph agent handoff coordination', () => {
	const baseSession = {
		model: 'handoff-model',
		user: 'handoff-runner',
		cwd: '/workspace/handoff',
		id: 'session-handoff',
	} as const;

	it('records handoff history and merges context', async () => {
		const coordinator = new MultiAgentCoordinator();
		const planningGraph = createCerebrumGraph();
		const executionGraph = createCerebrumGraph();

		coordinator.registerWorkflow({
			id: 'planner',
			graph: planningGraph,
			initialState: createInitialN0State('Plan recovery', baseSession, {
				ctx: { owner: 'planner', step: 'analysis' },
			}),
		});
		coordinator.registerWorkflow({
			id: 'executor',
			graph: executionGraph,
			initialState: createInitialN0State('Execute recovery', baseSession, {
				ctx: { owner: 'executor', step: 'idle' },
			}),
		});

		const handoffEvents: Array<{ coordinationId: string; to: string }> = [];
		coordinator.on('agentHandoff', (event) => {
			handoffEvents.push({ coordinationId: event.coordinationId, to: event.to });
		});

		const record = await coordinator.handoffAgent('planner', 'executor', {
			reason: 'analysis-complete',
			payload: { summary: 'Plan validated with telemetry evidence' },
		});

		expect(record.reason).toBe('analysis-complete');
		expect(record.to).toBe('executor');
		expect(handoffEvents).toHaveLength(1);

		const executorState = coordinator.getWorkflowState('executor');
		expect(executorState.ctx?.lastHandoff).toMatchObject({
			from: 'planner',
			reason: 'analysis-complete',
		});

		const history = coordinator.getHandoffHistory();
		expect(history).toHaveLength(1);
		expect(history[0].coordinationId).toBe(record.coordinationId);

		const executorHistory = coordinator.getHandoffHistory('executor');
		expect(executorHistory).toHaveLength(1);
		expect(executorHistory[0].coordinationId).toBe(record.coordinationId);
	});
});
