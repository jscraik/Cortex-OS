/**
 * @file packages/workflow-orchestrator/src/orchestrator/WorkflowEngine.ts
 * @description Workflow state machine orchestrator for PRP gates and task phases
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 *
 * brAInwav Standards:
 * - Functions ≤40 lines
 * - Named exports only
 * - Event emission via A2A
 * - State persistence after each step
 */

import type { GateId, PhaseId, WorkflowState } from '@cortex-os/workflow-common';
import { enforcementProfileDefaults } from '@cortex-os/workflow-common';
import type Database from 'better-sqlite3';
import { getWorkflowByTaskId, saveStep, saveWorkflow } from '../persistence/sqlite.js';

/**
 * Workflow execution options
 */
export interface ExecuteWorkflowOptions {
	taskId: string;
	featureName?: string;
	priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
	skipApprovals?: boolean;
	dryRun?: boolean;
	resume?: boolean;
	stopAt?: string;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
	workflowId: string;
	status: 'completed' | 'failed' | 'paused';
	currentStep: string;
	completedGates: GateId[];
	completedPhases: PhaseId[];
	skippedSteps?: string[];
	waitingFor?: string;
	error?: string;
}

/**
 * Generate unique workflow ID
 */
function generateWorkflowId(): string {
	return `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create initial workflow state
 */
function createInitialState(options: ExecuteWorkflowOptions): WorkflowState {
	return {
		id: generateWorkflowId(),
		featureName: options.featureName || options.taskId,
		taskId: options.taskId,
		priority: options.priority || 'P2',
		status: 'active',
		currentStep: 'G0',
		prpState: { gates: {}, approvals: [] },
		taskState: { phases: {}, artifacts: [] },
		enforcementProfile: enforcementProfileDefaults(),
		metadata: {
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			gitBranch: `feat/${options.taskId}`,
			branding: 'brAInwav',
		},
	};
}

/**
 * All gate IDs in order
 */
const GATE_SEQUENCE: GateId[] = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];

/**
 * All phase IDs in order
 */
const PHASE_SEQUENCE: PhaseId[] = [0, 1, 2, 3, 4, 5];

/**
 * Workflow Engine - orchestrates PRP gates and task phases
 */
export class WorkflowEngine {
	constructor(
		private db: Database.Database,
		private emitEvent: (event: any) => void = () => {},
	) {}

	/**
	 * Execute complete workflow from G0 to G7
	 */
	async executeWorkflow(options: ExecuteWorkflowOptions): Promise<WorkflowExecutionResult> {
		// Check for existing workflow if resuming
		let state: WorkflowState;
		const existing = await getWorkflowByTaskId(this.db, options.taskId);

		if (options.resume && existing) {
			state = existing;
		} else {
			state = createInitialState(options);

			// Save initial workflow state
			if (!options.dryRun) {
				await saveWorkflow(this.db, state);
			}
		}

		// Emit workflow-started event
		if (!options.dryRun) {
			this.emitEvent({
				type: 'workflow-started',
				workflowId: state.id,
				taskId: state.taskId,
				metadata: { branding: 'brAInwav' },
			});
		}

		const result = await this.runWorkflowSteps(state, options);

		// Emit workflow-completed event
		if (!options.dryRun && result.status === 'completed') {
			this.emitEvent({
				type: 'workflow-completed',
				workflowId: state.id,
				taskId: state.taskId,
				metadata: { branding: 'brAInwav' },
			});
		}

		return result;
	}

	/**
	 * Run all workflow steps (gates and phases)
	 */
	private async runWorkflowSteps(
		state: WorkflowState,
		options: ExecuteWorkflowOptions,
	): Promise<WorkflowExecutionResult> {
		const completedGates: GateId[] = [];
		const completedPhases: PhaseId[] = [];
		const skippedSteps: string[] = [];

		for (const gateId of GATE_SEQUENCE) {
			// Check if we should stop at this gate
			if (options.stopAt === gateId) {
				state.currentStep = gateId;
				if (!options.dryRun) {
					await saveWorkflow(this.db, state);
				}
				break;
			}

			const gateResult = await this.executeGate(state, gateId, options);

			if (gateResult.completed) {
				completedGates.push(gateId);
			}

			if (gateResult.paused) {
				return {
					workflowId: state.id,
					status: 'paused',
					currentStep: gateId,
					completedGates,
					completedPhases,
					waitingFor: `${gateId} approval`,
				};
			}

			// Execute corresponding phase
			const phaseId = PHASE_SEQUENCE[parseInt(gateId.replace('G', ''), 10)];
			if (phaseId !== undefined) {
				// Check if we should stop at this phase
				if (options.stopAt === `phase-${phaseId}`) {
					state.currentStep = `phase-${phaseId}`;
					if (!options.dryRun) {
						await saveWorkflow(this.db, state);
					}
					break;
				}

				const phaseResult = await this.executePhase(state, phaseId, options);

				if (phaseResult.completed) {
					completedPhases.push(phaseId);
				}
			}
		}

		return {
			workflowId: state.id,
			status: 'completed',
			currentStep: state.currentStep,
			completedGates,
			completedPhases,
			skippedSteps: options.resume ? skippedSteps : undefined,
		};
	}

	/**
	 * Execute a single gate
	 */
	private async executeGate(
		state: WorkflowState,
		gateId: GateId,
		options: ExecuteWorkflowOptions,
	): Promise<{ completed: boolean; paused: boolean }> {
		if (!options.skipApprovals) {
			return { completed: false, paused: true };
		}

		// Save gate step
		if (!options.dryRun) {
			await saveStep(this.db, {
				workflowId: state.id,
				type: 'gate',
				stepId: gateId,
				status: 'completed',
				evidence: [],
				completedAt: new Date().toISOString(),
			});

			state.currentStep = gateId;
			await saveWorkflow(this.db, state);
		}

		return { completed: true, paused: false };
	}

	/**
	 * Execute a single phase
	 */
	private async executePhase(
		state: WorkflowState,
		phaseId: PhaseId,
		options: ExecuteWorkflowOptions,
	): Promise<{ completed: boolean }> {
		// Save phase step
		if (!options.dryRun) {
			await saveStep(this.db, {
				workflowId: state.id,
				type: 'phase',
				stepId: String(phaseId),
				status: 'completed',
				evidence: [],
				completedAt: new Date().toISOString(),
			});

			state.currentStep = `phase-${phaseId}`;
			await saveWorkflow(this.db, state);
		}

		return { completed: true };
	}
}

/**
 * Standalone execution function for convenience
 */
export async function executeWorkflow(
	_options: ExecuteWorkflowOptions,
): Promise<WorkflowExecutionResult> {
	throw new Error('Standalone execution requires database setup');
}
