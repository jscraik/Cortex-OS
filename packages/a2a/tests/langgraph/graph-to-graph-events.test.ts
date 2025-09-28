import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../../../orchestration/src/langgraph/create-cerebrum-graph.js';
import { MultiAgentCoordinator } from '../../../orchestration/src/langgraph/multi-agent-coordinator.js';
import { createInitialN0State } from '../../../orchestration/src/langgraph/n0-state.js';
import { InMemoryGraphEventBus } from '../../src/langgraph/event-bridge.js';

describe('A2A LangGraph event bridge', () => {
	const session = {
		id: 'graph-event-session',
		model: 'langgraph-event-model',
		user: 'graph-bridge',
		cwd: '/workspace/a2a',
	} as const;

	it('emits branded events for state sharing, handoff, and completion', async () => {
		const bus = new InMemoryGraphEventBus();
		const coordinator = new MultiAgentCoordinator({ eventPublisher: bus });

		const analysisGraph = createCerebrumGraph();
		const executionGraph = createCerebrumGraph();

		coordinator.registerWorkflow({
			id: 'analysis',
			graph: analysisGraph,
			initialState: createInitialN0State('Collect diagnostics', session, {
				ctx: { phase: 'analysis' },
			}),
			service: 'analysis-service',
		});
		coordinator.registerWorkflow({
			id: 'execution',
			graph: executionGraph,
			initialState: createInitialN0State('Apply fix', session, {
				ctx: { phase: 'execution' },
			}),
			service: 'execution-service',
		});

		const collected: string[] = [];
		bus.subscribe((event) => {
			collected.push(`${event.type}:${event.source}->${event.target}`);
		});

		await coordinator.shareState('analysis', 'execution', {
			ctx: { progress: '40%', phase: 'execution' },
		});

		await coordinator.handoffAgent('analysis', 'execution', {
			reason: 'analysis-complete',
			payload: { summary: 'Diagnostics complete' },
		});

		await coordinator.coordinateDistributedWorkflows([
			{ id: 'analysis', input: 'Collect diagnostics' },
			{ id: 'execution', input: 'Apply fix' },
		]);

		const events = bus.events;
		expect(events).toHaveLength(3);
		expect(events.every((event) => event.branding === 'brAInwav')).toBe(true);

		const shareEvent = events.find((event) => event.type === 'langgraph.state_shared');
		const handoffEvent = events.find((event) => event.type === 'langgraph.agent_handoff');
		const completionEvent = events.find((event) => event.type === 'langgraph.workflow_completed');

		expect(shareEvent).toBeDefined();
		expect(shareEvent?.target).toBe('execution');
		expect(handoffEvent?.payload).toMatchObject({ reason: 'analysis-complete' });
		expect(completionEvent?.payload.metadata).toBeDefined();
		expect(collected).toEqual([
			'langgraph.state_shared:analysis->execution',
			'langgraph.agent_handoff:analysis->execution',
			'langgraph.workflow_completed:analysis-service->analysis',
		]);
	});
});
