/**
 * Long-Horizon Planning implementation for Cortex-OS
 * Extends DSP with structured planning capabilities inspired by Deep Agents patterns
 * Maintains brAInwav branding and follows single-focus agent architecture
 */

import {
	createSecurityIntegrationService,
	type SecurityIntegrationResult,
	type SecurityIntegrationService,
} from '@cortex-os/cortex-sec';
import {
	type DSPConfig,
	DynamicSpeculativePlanner,
	type PlanningContext,
	PlanningPhase,
} from '../utils/dsp.js';

export interface LongHorizonTask {
	id: string;
	description: string;
	complexity: number; // 1-10 scale
	priority: number; // 1-10 scale
	estimatedDuration: number; // milliseconds
	dependencies: string[];
	metadata: Record<string, unknown>;
}

export interface PlanningResult {
	taskId: string;
	success: boolean;
	phases: Array<{
		phase: PlanningPhase;
		duration: number;
		result?: unknown;
		error?: string;
	}>;
	totalDuration: number;
	adaptiveDepth: number;
	recommendations: string[];
	brainwavMetadata: {
		createdBy: 'brAInwav';
		version: string;
		timestamp: Date;
	};
	security: SecurityIntegrationResult;
}

export interface LongHorizonPlannerConfig extends DSPConfig {
	enableContextIsolation?: boolean;
	maxPlanningTime?: number; // milliseconds
	adaptiveDepthEnabled?: boolean;
	persistenceEnabled?: boolean;
	securityIntegrationService?: SecurityIntegrationService;
	clock?: () => Date;
}

/**
 * Enhanced planner that combines DSP with structured long-horizon planning
 * Implements context quarantine and adaptive planning depth
 */
export class LongHorizonPlanner {
	private readonly dsp: DynamicSpeculativePlanner;
	private readonly config: LongHorizonPlannerConfig;
	private readonly securityIntegration: SecurityIntegrationService;
	private activeContext?: PlanningContext;

	constructor(config: LongHorizonPlannerConfig = {}) {
		this.config = {
			enableContextIsolation: true,
			maxPlanningTime: 300000, // 5 minutes default
			adaptiveDepthEnabled: true,
			persistenceEnabled: true,
			...config,
		};

		this.securityIntegration =
			this.config.securityIntegrationService ?? createSecurityIntegrationService();

		this.dsp = new DynamicSpeculativePlanner({
			...config,
			contextIsolation: this.config.enableContextIsolation,
			planningDepth: config.planningDepth ?? 3,
		});

		console.log('brAInwav Long-Horizon Planner: Initialized with enhanced DSP capabilities');
	}

	/**
	 * Plan and execute a long-horizon task with structured phases
	 */
	async planAndExecute(
		task: LongHorizonTask,
		executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
	): Promise<PlanningResult> {
		return this.planTask(task, executor);
	}

	/**
	 * Plan a task with enhanced DSP integration and persistence hooks
	 */
	async planTask(
		task: LongHorizonTask,
		executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
	): Promise<PlanningResult> {
		const startTime = Date.now();
		console.log(`brAInwav Long-Horizon Planner: Starting planning for task ${task.id}`);

		// Initialize planning context with task details
		const context = this.dsp.initializePlanning(task.id, task.complexity, task.priority);
		this.activeContext = context;

		const complianceSnapshot = context.compliance
			? {
				compliance: {
					standards: context.compliance.standards,
					lastCheckedAt: context.compliance.lastCheckedAt,
					riskScore: context.compliance.riskScore,
					outstandingViolations: context.compliance.outstandingViolations.map((violation) => ({
						id: violation.id,
						severity: violation.severity,
					})),
				},
			}
			: undefined;

		const securityEvaluation = this.securityIntegration.evaluate({
			taskId: task.id,
			description: task.description,
			complianceContext: complianceSnapshot,
		});

		if (!context.compliance) {
			context.compliance = {
				standards: securityEvaluation.standards,
				lastCheckedAt: securityEvaluation.lastCheckedAt,
				riskScore: securityEvaluation.aggregateRisk,
				outstandingViolations: [],
			};
		} else {
			context.compliance.standards = securityEvaluation.standards;
			context.compliance.lastCheckedAt = securityEvaluation.lastCheckedAt;
			context.compliance.riskScore = securityEvaluation.aggregateRisk;
		}

		context.preferences.notes.push(`brAInwav security summary: ${securityEvaluation.summary}`);

		// Persistence hook: Record planning start
		if (this.config.persistenceEnabled) {
			await this.persistPlanningEvent('planning_started', {
				taskId: task.id,
				contextId: context.id,
				timestamp: new Date(),
				brainwavOrigin: true,
			});
		}

		const result: PlanningResult = {
			taskId: task.id,
			success: true,
			phases: [],
			totalDuration: 0,
			adaptiveDepth: this.dsp.getAdaptivePlanningDepth(),
			recommendations: [],
			brainwavMetadata: {
				createdBy: 'brAInwav',
				version: '1.0.0',
				timestamp: new Date(),
			},
			security: securityEvaluation,
		};

		try {
			// Execute structured planning phases
			const phases = this.getPlanningPhases(task);

			for (const phase of phases) {
				const phaseStartTime = Date.now();

				try {
					// Advance to next phase
					this.dsp.advancePhase(`Execute ${phase} phase for task: ${task.description}`);

					// Persistence hook: Record phase start
					if (this.config.persistenceEnabled) {
						await this.persistPlanningEvent('phase_started', {
							taskId: task.id,
							contextId: context.id,
							phase,
							timestamp: new Date(),
							brainwavOrigin: true,
						});
					}

					// Execute phase with context isolation
					const phaseResult = await this.executePhaseWithTimeout(phase, context, executor);

					const phaseDuration = Date.now() - phaseStartTime;

					result.phases.push({
						phase,
						duration: phaseDuration,
						result: phaseResult,
					});

					// Update DSP with success
					this.dsp.update(true);

					// Persistence hook: Record phase completion
					if (this.config.persistenceEnabled) {
						await this.persistPlanningEvent('phase_completed', {
							taskId: task.id,
							contextId: context.id,
							phase,
							duration: phaseDuration,
							timestamp: new Date(),
							brainwavOrigin: true,
						});
					}

					console.log(
						`brAInwav Long-Horizon Planner: Completed ${phase} phase in ${phaseDuration}ms`,
					);
				} catch (error) {
					const phaseDuration = Date.now() - phaseStartTime;
					const errorMessage = error instanceof Error ? error.message : String(error);

					result.phases.push({
						phase,
						duration: phaseDuration,
						error: errorMessage,
					});

					// Update DSP with failure
					this.dsp.update(false);
					result.success = false;

					// Persistence hook: Record phase failure
					if (this.config.persistenceEnabled) {
						await this.persistPlanningEvent('phase_failed', {
							taskId: task.id,
							contextId: context.id,
							phase,
							error: errorMessage,
							duration: phaseDuration,
							timestamp: new Date(),
							brainwavOrigin: true,
						});
					}

					console.error(`brAInwav Long-Horizon Planner: Failed ${phase} phase: ${errorMessage}`);

					// Continue with next phase unless critical failure
					if (this.isCriticalPhase(phase)) {
						break;
					}
				}
			}

			// Complete planning
			this.dsp.completePlanning(result);
		} catch (error) {
			result.success = false;
			console.error(`brAInwav Long-Horizon Planner: Planning failed for task ${task.id}:`, error);
		}

		result.totalDuration = Date.now() - startTime;
		result.recommendations = this.generateRecommendations(task, result);

		// Persistence hook: Record planning completion
		if (this.config.persistenceEnabled) {
			await this.persistPlanningEvent('planning_completed', {
				taskId: task.id,
				contextId: context.id,
				success: result.success,
				totalDuration: result.totalDuration,
				timestamp: new Date(),
				brainwavOrigin: true,
			});
		}

		console.log(
			`brAInwav Long-Horizon Planner: Completed planning for task ${task.id} in ${result.totalDuration}ms`,
		);

		return result;
	}

	/**
	 * Get planning phases based on task complexity
	 */
	private getPlanningPhases(task: LongHorizonTask): PlanningPhase[] {
		const basePhases = [
			PlanningPhase.INITIALIZATION,
			PlanningPhase.ANALYSIS,
			PlanningPhase.STRATEGY,
			PlanningPhase.EXECUTION,
		];

		// Add validation phase for complex tasks
		if (task.complexity > 5) {
			basePhases.push(PlanningPhase.VALIDATION);
		}

		basePhases.push(PlanningPhase.COMPLETION);
		return basePhases;
	}

	/**
	 * Execute phase with timeout protection
	 */
	private async executePhaseWithTimeout(
		phase: PlanningPhase,
		context: PlanningContext,
		executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
	): Promise<unknown> {
		const timeoutMs = this.config.maxPlanningTime ?? 300000;

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(
					new Error(`brAInwav Long-Horizon Planner: Phase ${phase} timed out after ${timeoutMs}ms`),
				);
			}, timeoutMs);

			executor(phase, context)
				.then(resolve)
				.catch(reject)
				.finally(() => clearTimeout(timeout));
		});
	}

	/**
	 * Check if phase is critical (failure should stop planning)
	 */
	private isCriticalPhase(phase: PlanningPhase): boolean {
		return phase === PlanningPhase.INITIALIZATION || phase === PlanningPhase.ANALYSIS;
	}

	/**
	 * Generate recommendations based on planning results
	 */
	private generateRecommendations(task: LongHorizonTask, result: PlanningResult): string[] {
		const recommendations: string[] = [];

		// Complexity-based recommendations
		if (task.complexity > 7) {
			recommendations.push('Consider breaking down into smaller subtasks for better manageability');
		}

		// Priority-based recommendations
		if (task.priority > 8) {
			recommendations.push('Allocate additional resources for high priority task execution');
		}

		// Performance-based recommendations
		if (result.totalDuration > 180000) {
			// > 3 minutes
			recommendations.push('Monitor execution time closely for long-running planning phases');
		}

		// Failure-based recommendations
		const failedPhases = result.phases.filter((p) => p.error);
		if (failedPhases.length > 0) {
			recommendations.push(
				`Review and retry failed phases: ${failedPhases.map((p) => p.phase).join(', ')}`,
			);
		}

		// Adaptive depth recommendations
		if (result.adaptiveDepth > 5) {
			recommendations.push('High planning depth detected - ensure adequate context management');
		}

		return recommendations;
	}

	/**
	 * Get current planning context (if any)
	 */
	getCurrentContext(): PlanningContext | undefined {
		return this.activeContext;
	}

	/**
	 * Clear active context (useful for context isolation)
	 */
	clearContext(): void {
		this.activeContext = undefined;
		console.log('brAInwav Long-Horizon Planner: Cleared active planning context');
	}

	/**
	 * Get planning statistics for monitoring
	 */
	getStats(): {
		hasActiveContext: boolean;
		currentStep: number;
		currentPhase?: PlanningPhase;
		adaptiveDepth: number;
	} {
		return {
			hasActiveContext: !!this.activeContext,
			currentStep: this.dsp.currentStep,
			currentPhase: this.dsp.currentPhase,
			adaptiveDepth: this.dsp.getAdaptivePlanningDepth(),
		};
	}

	/**
	 * Persistence hook for planning events
	 * In production, this would integrate with actual persistence layer
	 */
	private async persistPlanningEvent(
		eventType: string,
		eventData: Record<string, unknown>,
	): Promise<void> {
		if (!this.config.persistenceEnabled) {
			return;
		}

		// Log persistence event for now (production would use actual persistence)
		console.log(`brAInwav Persistence Hook: ${eventType}`, {
			eventType,
			timestamp: new Date().toISOString(),
			brainwavOrigin: true,
			...eventData,
		});

		// Future: Integrate with actual persistence layer
		// await this.persistenceAdapter.recordEvent(eventType, eventData);
	}
}

/**
 * Create a long-horizon planner with brAInwav-optimized defaults
 */
export function createLongHorizonPlanner(config?: LongHorizonPlannerConfig): LongHorizonPlanner {
	const defaultConfig: LongHorizonPlannerConfig = {
		enableContextIsolation: true,
		maxPlanningTime: 300000,
		adaptiveDepthEnabled: true,
		persistenceEnabled: true,
		planningDepth: 3,
		...config,
	};

	return new LongHorizonPlanner(defaultConfig);
}
