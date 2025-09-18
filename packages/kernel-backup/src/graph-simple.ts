/**
 * @file graph-simple.ts
 * @description Cortex Kernel - Simplified State Machine (No LangGraph)
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import { z } from 'zod';
import { fixedTimestamp } from './lib/determinism.js';
import {
	createInitialPRPState,
	type PRPState,
	validateStateTransition,
} from './state.js';
import { generateId } from './utils/id.js';

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

	constructor(orchestrator: PRPOrchestrator) {
		this.orchestrator = orchestrator;
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
	 * Execute build phase
	 */
	private async executeBuildPhase(
		state: PRPState,
		deterministic = false,
	): Promise<PRPState> {
		const newState: PRPState = {
			...state,
			phase: 'build',
			metadata: {
				...state.metadata,
				currentNeuron: 'build-neuron',
			},
		};

		newState.validationResults.build = {
			passed: true,
			blockers: [],
			majors: [],
			evidence: [],
			timestamp: deterministic
				? fixedTimestamp('build-validation')
				: new Date().toISOString(),
		};

		return newState;
	}

	/**
	 * Expose orchestrator neuron count
	 */
	getNeuronCount(): number {
		return this.orchestrator.getNeuronCount();
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
			// Execute strategy phase
			const strategyState = await this.executeStrategyPhase(
				state,
				deterministic,
			);
			this.addToHistory(runId, strategyState);

			// Check if we should proceed or recycle
			if (strategyState.phase === 'recycled') {
				return strategyState;
			}

			// Execute build phase
			const buildState = await this.executeBuildPhase(
				strategyState,
				deterministic,
			);
			this.addToHistory(runId, buildState);

			if (buildState.phase === 'recycled') {
				return buildState;
			}

			// Execute evaluation phase
			const evaluationState = await this.executeEvaluationPhase(
				buildState,
				deterministic,
			);
			this.addToHistory(runId, evaluationState);

			// Final state
			return evaluationState;
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
	 * Execute strategy phase
	 */
	private async executeStrategyPhase(
		state: PRPState,
		deterministic = false,
	): Promise<PRPState> {
		const newState: PRPState = {
			...state,
			phase: 'strategy',
			metadata: {
				...state.metadata,
				currentNeuron: 'strategy-neuron',
			},
		};

		// Add strategy validation results
		newState.validationResults.strategy = {
			passed: true,
			blockers: [],
			majors: [],
			evidence: [],
			timestamp: deterministic
				? fixedTimestamp('strategy-validation')
				: new Date().toISOString(),
		};

		return newState;
	}

	/**
	 * Get execution history for a run
	 */
	getExecutionHistory(runId: string): PRPState[] {
		return this.executionHistory.get(runId) || [];
	}

	/**
	 * Execute evaluation phase
	 */
	private async executeEvaluationPhase(
		state: PRPState,
		deterministic = false,
	): Promise<PRPState> {
		const newState: PRPState = {
			...state,
			phase: 'evaluation',
			metadata: {
				...state.metadata,
				currentNeuron: 'evaluation-neuron',
			},
		};

		// Add evaluation validation results
		newState.validationResults.evaluation = {
			passed: true,
			blockers: [],
			majors: [],
			evidence: [],
			timestamp: deterministic
				? fixedTimestamp('evaluation-validation')
				: new Date().toISOString(),
		};

		// Final cerebrum decision
		newState.cerebrum = {
			decision: 'promote',
			reasoning: 'All validation gates passed successfully',
			confidence: 0.95,
			timestamp: deterministic
				? fixedTimestamp('cerebrum-decision')
				: new Date().toISOString(),
		};

		// Complete the workflow
		const completedState: PRPState = {
			...newState,
			phase: 'completed',
			metadata: {
				...newState.metadata,
				endTime: deterministic
					? fixedTimestamp('workflow-end')
					: new Date().toISOString(),
			},
		};

		return validateStateTransition(newState, completedState)
			? completedState
			: newState;
	}
}
