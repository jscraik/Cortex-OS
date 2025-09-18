/**
 * @file graph-simple.ts
 * @description Cortex Kernel - Simplified State Machine (No LangGraph)
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { MemorySaver, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';
import { fixedTimestamp } from './lib/determinism.js';
import {
	runBuildNode,
	runEvaluationNode,
	runStrategyNode,
} from './nodes/index.js';
import {
	createInitialPRPState,
	type PRPState,
	validateStateTransition,
} from './state.js';
import { generateId } from './utils/id.js';

// Minimal types to avoid any
interface LangGraphConfig {
	configurable?: { runId?: string; deterministic?: boolean };
}
interface LangGraphApp {
	invoke(input: PRPState, config?: LangGraphConfig): Promise<PRPState>;
}

/**
 * Minimal interface to break circular dependency
 */
interface PRPOrchestrator {
	getNeuronCount(): number;
}

// Zod schema for validating generateId inputs and run options
const RunOptionsSchema = z
	.object({
		runId: z.string().optional(),
		deterministic: z.boolean().optional(),
	})
	.strict();

/**
 * Factory function to create a new CortexKernel instance
 */
export function createKernel(orchestrator: PRPOrchestrator): CortexKernel {
	return new CortexKernel(orchestrator);
}

interface Blueprint {
	title: string;
	description: string;
	requirements: string[];
}

interface RunOptions {
	runId?: string;
	deterministic?: boolean;
}

/**
 * Execute the PRP workflow sequence for a blueprint.
 */

export class CortexKernel {
	private readonly orchestrator: PRPOrchestrator;
	private readonly executionHistory: Map<string, PRPState[]> = new Map();
	private readonly app: LangGraphApp; // LangGraph compiled app

	constructor(orchestrator: PRPOrchestrator) {
		this.orchestrator = orchestrator;
		this.app = this.buildLangGraphApp();
	}

	// Expose orchestrator for direct access (preferred over wrapper methods)
	getOrchestrator(): PRPOrchestrator {
		return this.orchestrator;
	}

	/**
	 * Add a state to execution history
	 */
	private addToHistory(runId: string, state: PRPState): void {
		if (!this.executionHistory.has(runId)) {
			this.executionHistory.set(runId, []);
		}
		const history = this.executionHistory.get(runId);
		if (history) {
			history.push(state);
		}
	}

	/**
	 * Build LangGraph app using existing nodes with history hooks
	 */
	private buildLangGraphApp(): LangGraphApp {
		// Create a graph. Keep generics minimal to satisfy local linting.
		const graph = new StateGraph() as unknown as {
			addNode: (
				name: string,
				fn: (state: PRPState, config?: LangGraphConfig) => Promise<PRPState>,
			) => void;
			setEntryPoint: (name: string) => void;
			addEdge: (from: string, to: string) => void;
			compile: (opts: { checkpointer: MemorySaver }) => LangGraphApp;
		};

		graph.addNode(
			'strategy',
			async (state: PRPState, config?: LangGraphConfig) => {
				const runId = config?.configurable?.runId || state.metadata.runId;
				const next = await runStrategyNode(state);
				this.addToHistory(runId, { ...next, phase: 'strategy' });
				return next;
			},
		);

		graph.addNode(
			'build',
			async (state: PRPState, config?: LangGraphConfig) => {
				const runId = config?.configurable?.runId || state.metadata.runId;
				const next = await runBuildNode(state);
				this.addToHistory(runId, { ...next, phase: 'build' });
				return next;
			},
		);

		graph.addNode(
			'evaluation',
			async (state: PRPState, config?: LangGraphConfig) => {
				const runId = config?.configurable?.runId || state.metadata.runId;
				const next = await runEvaluationNode(state);
				this.addToHistory(runId, { ...next, phase: 'evaluation' });
				return next;
			},
		);

		graph.setEntryPoint('strategy');
		graph.addEdge('strategy', 'build');
		graph.addEdge('build', 'evaluation');

		const checkpointer = new MemorySaver();
		return graph.compile({ checkpointer });
	}

	/**
	 * Run a complete PRP workflow
	 */
	async runPRPWorkflow(
		blueprint: Blueprint,
		options: RunOptions = {},
	): Promise<PRPState> {
		// Validate inputs with Zod schema as recommended in coding guidelines
		const validatedOptions = RunOptionsSchema.parse(options);

		const deterministic = validatedOptions.deterministic || false;
		const runId = validatedOptions.runId || generateId('run', deterministic);
		const state = createInitialPRPState(blueprint, { runId, deterministic });

		// Initialize execution history
		this.executionHistory.set(runId, []);
		this.addToHistory(runId, state);

		try {
			// Invoke LangGraph app to run the full workflow
			const finalState: PRPState = await this.app.invoke(state, {
				configurable: { runId, deterministic },
			});

			// Mark completion metadata deterministically if requested
			const completed: PRPState = {
				...finalState,
				phase: 'completed',
				metadata: {
					...finalState.metadata,
					endTime: deterministic
						? fixedTimestamp('workflow-end')
						: new Date().toISOString(),
				},
			};

			this.addToHistory(runId, completed);

			return validateStateTransition(finalState, completed)
				? completed
				: finalState;
		} catch (error) {
			const errorState: PRPState = {
				...state,
				phase: 'recycled',
				metadata: {
					...state.metadata,
					error: error instanceof Error ? error.message : 'Unknown error',
					endTime: deterministic
						? fixedTimestamp('workflow-error')
						: new Date().toISOString(),
				},
			};
			this.addToHistory(runId, errorState);
			return errorState;
		}
	}

	/**
	 * Get execution history for a run
	 */
	getExecutionHistory(runId: string): PRPState[] {
		return this.executionHistory.get(runId) || [];
	}
}
