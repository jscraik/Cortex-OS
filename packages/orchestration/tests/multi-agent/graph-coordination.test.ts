import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../../src/langgraph/create-cerebrum-graph.js';
import { MultiAgentCoordinator } from '../../src/langgraph/multi-agent-coordinator.js';
import { createInitialN0State } from '../../src/langgraph/n0-state.js';

describe('Multi-agent LangGraph coordination', () => {
	const baseSession = {
		id: 'session-graph-test',
		model: 'langgraph-test-model',
		user: 'graph-coordinator',
		cwd: '/workspace/tests',
		brainwavSession: 'brAInwav-multi-agent',
	} as const;

	it('shares state updates across graphs with conflict resolution', async () => {
		const coordinator = new MultiAgentCoordinator();
		const analysisGraph = createCerebrumGraph();
		const executionGraph = createCerebrumGraph();

		coordinator.registerWorkflow({
			id: 'analysis',
			graph: analysisGraph,
			initialState: createInitialN0State('Analyse logs', baseSession, {
				ctx: { progress: '10%', branch: 'analysis' },
			}),
		});
		coordinator.registerWorkflow({
			id: 'execution',
			graph: executionGraph,
			initialState: createInitialN0State('Execute remediation', baseSession, {
				ctx: { progress: '0%', branch: 'execution' },
			}),
		});

		const events: Array<{ target: string; progress?: string }> = [];
		coordinator.on('stateShared', (event) => {
			events.push({
				target: event.target,
				progress: event.state.ctx?.progress as string | undefined,
			});
		});

		const updated = await coordinator.shareState('analysis', 'execution', {
			ctx: { progress: '55%', branch: 'execution', lastUpdate: 'analysis' },
			output: 'analysis complete',
		});

		expect(updated.ctx?.progress).toBe('55%');
		expect(updated.ctx?.lastUpdate).toBe('analysis');

		const targetState = coordinator.getWorkflowState('execution');
		expect(targetState.ctx?.progress).toBe('55%');
		expect(targetState.output).toBe('analysis complete');

		const metrics = coordinator.getMetrics();
		expect(metrics.stateShares).toBe(1);
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({ target: 'execution', progress: '55%' });
	});

	it('coordinates multiple workflows and persists outputs', async () => {
		const coordinator = new MultiAgentCoordinator();
		const analysisGraph = createCerebrumGraph();
		const executionGraph = createCerebrumGraph();

		coordinator.registerWorkflow({
			id: 'analysis',
			graph: analysisGraph,
			initialState: createInitialN0State('Collect requirements', baseSession),
		});
		coordinator.registerWorkflow({
			id: 'execution',
			graph: executionGraph,
			initialState: createInitialN0State('Implement plan', baseSession),
		});

		const results = await coordinator.coordinateWorkflows({
			analysis: { input: 'Coordinate telemetry plan' },
			execution: { input: 'Run remediation workflow' },
		});

		expect(results.analysis.output).toBe('Coordinate telemetry plan');
		expect(results.execution.output).toBe('Run remediation workflow');

		const analysisState = coordinator.getWorkflowState('analysis');
		const executionState = coordinator.getWorkflowState('execution');

		expect(analysisState.output).toBe('Coordinate telemetry plan');
		expect(executionState.output).toBe('Run remediation workflow');

		const metrics = coordinator.getMetrics();
		expect(metrics.workflowsCompleted).toBe(2);
	});
});
