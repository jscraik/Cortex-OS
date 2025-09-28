/**
 * @file kernel.ts
 * @description Cortex Kernel with Real LangGraphJS Integration
 * @author brAInwav Team
 * @version 2.0.0
 * @status TDD-DRIVEN
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';
import {
	workflowStateToN0,
	type N0AdapterOptions,
	type N0Session,
	type N0State,
} from '@cortex-os/orchestration';
import { fixedTimestamp } from './lib/determinism.js';
import { addToHistory, createHistory, type ExecutionHistory } from './lib/history.js';
import { runBuildNode, runEvaluationNode, runStrategyNode } from './nodes/index.js';
import { createInitialPRPState, type PRPState } from './state.js';
import { generateId } from './utils/id.js';
import type { PRPOrchestrator } from '@cortex-os/prp-runner';

/**
 * State annotation for LangGraphJS workflow using proper Annotation pattern
 */
const WorkflowStateAnnotation = Annotation.Root({
	prpState: Annotation<PRPState>(),
	messages: Annotation<Array<HumanMessage | AIMessage>>({
		reducer: (left, right) => left.concat(right),
		default: () => [],
	}),
	nextStep: Annotation<string>({
		reducer: (left, right) => right || left,
		default: () => '',
	}),
	error: Annotation<string>({
		reducer: (left, right) => right || left,
		default: () => '',
	}),
});

export type WorkflowState = typeof WorkflowStateAnnotation.State;


/**
 * Blueprint interface for PRP workflows
 */
export interface Blueprint {
	title: string;
	description: string;
	requirements: string[];
	metadata?: Record<string, unknown>;
}

/**
 * Run options for kernel execution
 */
export interface RunOptions {
	runId?: string;
	deterministic?: boolean;
	checkpointing?: boolean;
}

const RunOptionsSchema = z
	.object({
		runId: z.string().optional(),
		deterministic: z.boolean().optional(),
		checkpointing: z.boolean().optional(),
	})
	.strict();

/**
 * Factory function to create a new CortexKernel instance
 */
export function createKernel(orchestrator: PRPOrchestrator): CortexKernel {
	return new CortexKernel(orchestrator);
}

/**
 * CortexKernel with Real LangGraphJS State Machine
 */
export class CortexKernel {
	private readonly orchestrator: PRPOrchestrator;
	private readonly executionHistory: ExecutionHistory;
	private readonly compiledGraph: any; // Compiled LangGraph

	constructor(orchestrator: PRPOrchestrator) {
		this.orchestrator = orchestrator;
		this.executionHistory = createHistory();
		this.compiledGraph = this.buildLangGraph();
	}

	/**
	 * Build real LangGraphJS state machine with proper API usage
	 */
	private buildLangGraph(): any {
		const graph = new StateGraph(WorkflowStateAnnotation);

		// Add nodes for each PRP phase
		graph.addNode('strategy', async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
			return await this.strategyNode(state);
		});

		graph.addNode('build', async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
			return await this.buildNode(state);
		});

		graph.addNode('evaluation', async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
			return await this.evaluationNode(state);
		});

		graph.addNode('complete', async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
			return await this.completeNode(state);
		});

		graph.addNode('recycle', async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
			return await this.recycleNode(state);
		});

		// Define edges and transitions using proper type assertions for LangGraph compatibility
		graph.addEdge(START, 'strategy' as any);

		graph.addConditionalEdges(
			'strategy' as any,
			(state: WorkflowState) => this.routeFromStrategy(state),
			{
				build: 'build',
				recycle: 'recycle',
			} as any,
		);

		graph.addConditionalEdges(
			'build' as any,
			(state: WorkflowState) => this.routeFromBuild(state),
			{
				evaluation: 'evaluation',
				recycle: 'recycle',
			} as any,
		);

		graph.addConditionalEdges(
			'evaluation' as any,
			(state: WorkflowState) => this.routeFromEvaluation(state),
			{
				complete: 'complete',
				recycle: 'recycle',
			} as any,
		);

		graph.addEdge('complete' as any, END);
		graph.addEdge('recycle' as any, 'strategy' as any);

		return graph.compile();
	}

	/**
	 * Strategy phase node implementation
	 */
	private async strategyNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
		try {
			const updatedState = await runStrategyNode(state.prpState);
			addToHistory(this.executionHistory, updatedState.runId, updatedState);

			return {
				prpState: updatedState,
				messages: [new AIMessage(`Strategy phase completed for ${updatedState.blueprint.title}`)],
				nextStep: 'build',
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : 'Strategy phase failed',
				nextStep: 'recycle',
			};
		}
	}

	/**
	 * Build phase node implementation
	 */
	private async buildNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
		try {
			const updatedState = await runBuildNode(state.prpState);
			addToHistory(this.executionHistory, updatedState.runId, updatedState);

			return {
				prpState: updatedState,
				messages: [new AIMessage(`Build phase completed for ${updatedState.blueprint.title}`)],
				nextStep: 'evaluation',
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : 'Build phase failed',
				nextStep: 'recycle',
			};
		}
	}

	/**
	 * Evaluation phase node implementation
	 */
	private async evaluationNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
		try {
			const updatedState = await runEvaluationNode(state.prpState);
			addToHistory(this.executionHistory, updatedState.runId, updatedState);

			return {
				prpState: updatedState,
				messages: [new AIMessage(`Evaluation phase completed for ${updatedState.blueprint.title}`)],
				nextStep: 'complete',
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : 'Evaluation phase failed',
				nextStep: 'recycle',
			};
		}
	}

	/**
	 * Completion node implementation
	 */
	private async completeNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
		const completedState: PRPState = {
			...state.prpState,
			phase: 'completed',
			metadata: {
				...state.prpState.metadata,
				endTime: state.prpState.metadata.deterministic
					? fixedTimestamp('workflow-end')
					: new Date().toISOString(),
			},
		};

		addToHistory(this.executionHistory, completedState.runId, completedState);

		return {
			prpState: completedState,
			messages: [
				new AIMessage(`Workflow completed successfully for ${completedState.blueprint.title}`),
			],
		};
	}

	/**
	 * Recycle node implementation
	 */
	private async recycleNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
		const recycledState: PRPState = {
			...state.prpState,
			phase: 'recycled',
			metadata: {
				...state.prpState.metadata,
				error: state.error || 'Workflow recycled due to validation failure',
				endTime: state.prpState.metadata.deterministic
					? fixedTimestamp('workflow-recycled')
					: new Date().toISOString(),
			},
		};

		addToHistory(this.executionHistory, recycledState.runId, recycledState);

		return {
			prpState: recycledState,
			messages: [new AIMessage(`Workflow recycled: ${state.error || 'validation failure'}`)],
		};
	}

	/**
	 * Route decision from strategy phase
	 */
	private routeFromStrategy(state: WorkflowState): string {
		const strategyGate = Object.values(state.prpState.gates).find(
			(g) => g.id === 'G0' || g.id === 'G1',
		);
		if (strategyGate?.status === 'failed') {
			return 'recycle';
		}
		return 'build';
	}

	/**
	 * Route decision from build phase
	 */
	private routeFromBuild(state: WorkflowState): string {
		const buildGates = Object.values(state.prpState.gates).filter((g) =>
			['G2', 'G3', 'G4'].includes(g.id),
		);

		if (buildGates.some((g) => g.status === 'failed')) {
			return 'recycle';
		}
		return 'evaluation';
	}

	/**
	 * Route decision from evaluation phase
	 */
	private routeFromEvaluation(state: WorkflowState): string {
		if (state.prpState.cerebrum?.decision === 'recycle') {
			return 'recycle';
		}

		const evalGates = Object.values(state.prpState.gates).filter((g) =>
			['G5', 'G6', 'G7'].includes(g.id),
		);

		if (evalGates.some((g) => g.status === 'failed')) {
			return 'recycle';
		}
		return 'complete';
	}

	/**
	 * Run complete PRP workflow using LangGraphJS
	 */
	async runPRPWorkflow(blueprint: Blueprint, options: RunOptions = {}): Promise<PRPState> {
		const validatedOptions = RunOptionsSchema.parse(options);

		const deterministic = validatedOptions.deterministic || false;
		const runId = validatedOptions.runId || generateId('run', deterministic);

		const initialPRPState = createInitialPRPState(blueprint, {
			runId,
			deterministic,
		});

		const initialState: WorkflowState = {
			prpState: initialPRPState,
			messages: [new HumanMessage(`Starting PRP workflow for: ${blueprint.title}`)],
			nextStep: '',
			error: '',
		};

		addToHistory(this.executionHistory, runId, initialPRPState);

		try {
			const result = await this.compiledGraph.invoke(initialState, {
				configurable: {
					runId,
					deterministic,
				},
			});

			return result.prpState as PRPState;
		} catch (error) {
			const errorState: PRPState = {
				...initialPRPState,
				phase: 'recycled',
				metadata: {
					...initialPRPState.metadata,
					error: error instanceof Error ? error.message : 'Unknown workflow error',
					endTime: deterministic ? fixedTimestamp('workflow-error') : new Date().toISOString(),
				},
			};

			addToHistory(this.executionHistory, runId, errorState);
			return errorState;
		}
	}

	/**
	 * Get orchestrator instance
	 */
	getOrchestrator(): PRPOrchestrator {
		return this.orchestrator;
	}

	/**
	 * Get execution history for a run
	 */
	getExecutionHistory(runId: string): PRPState[] {
		return this.executionHistory.get(runId) || [];
	}

	/**
	 * Get compiled LangGraph for advanced usage
	 */
	getCompiledGraph(): any {
		return this.compiledGraph;
	}
}

export function projectKernelWorkflowToN0(
	state: WorkflowState,
	session: N0Session,
	options: N0AdapterOptions = {},
): N0State {
	return workflowStateToN0(state, session, options);
}
