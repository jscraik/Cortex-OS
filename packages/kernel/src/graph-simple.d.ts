/**
 * @file graph-simple.ts
 * @description Cortex Kernel - Simplified State Machine (No LangGraph)
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */
import { type PRPState } from './state.js';
import type { PRPOrchestrator } from '@cortex-os/prp-runner';
/**
 * Factory function to create a new CortexKernel instance
 */
export declare function createKernel(
	orchestrator: PRPOrchestrator,
): CortexKernel;
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
export declare class CortexKernel {
	private readonly orchestrator;
	private readonly executionHistory;
	constructor(orchestrator: PRPOrchestrator);
	/**
	 * Add a state to execution history
	 */
	private addToHistory;
	/**
	 * Execute build phase
	 */
	private executeBuildPhase;
	/**
	 * Expose orchestrator neuron count
	 */
	getNeuronCount(): number;
	/**
	 * Run a complete PRP workflow
	 */
	runPRPWorkflow(blueprint: Blueprint, options?: RunOptions): Promise<PRPState>;
	/**
	 * Execute strategy phase
	 */
	private executeStrategyPhase;
	/**
	 * Get execution history for a run
	 */
	getExecutionHistory(runId: string): PRPState[];
	/**
	 * Execute evaluation phase
	 */
	private executeEvaluationPhase;
}
//# sourceMappingURL=graph-simple.d.ts.map
