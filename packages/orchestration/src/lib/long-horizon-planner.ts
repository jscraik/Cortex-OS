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
import { OrchestrationMetrics } from '../observability/custom-metrics.js';
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
	private readonly metrics: OrchestrationMetrics;
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

		this.metrics = new OrchestrationMetrics();

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

		// Apply security evaluation and update context (extract to helper for clarity and testability)
		const securityEvaluation = this.applySecurityEvaluation(task, context);

		// Persistence hook: Record planning start (use centralized helper)
		await this.recordPersistenceEvent('planning_started', {
			taskId: task.id,
			contextId: context.id,
		});

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
				// Use a dedicated helper to execute a phase and update the public result object
				const continuePlanning = await this.executePhaseAndUpdateResult(
					phase,
					context,
					executor,
					task,
					result,
				);
				if (!continuePlanning) break;
			}

			// Complete planning
			this.dsp.completePlanning(result);
		} catch (error) {
			result.success = false;
			console.error(`brAInwav Long-Horizon Planner: Planning failed for task ${task.id}:`, error);
		}

		result.totalDuration = Date.now() - startTime;
		result.recommendations = this.generateRecommendations(task, result);

		// Persistence hook: Record planning completion (use centralized helper)
		await this.recordPersistenceEvent('planning_completed', {
			taskId: task.id,
			contextId: context.id,
			success: result.success,
			totalDuration: result.totalDuration,
		});

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
		return [
			...this.recommendComplexity(task),
			...this.recommendPriority(task),
			...this.recommendPerformance(result),
			...this.recommendFailures(result),
			...this.recommendAdaptiveDepth(result),
		];
	}

	private recommendComplexity(task: LongHorizonTask): string[] {
		if (task.complexity > 7) {
			return ['Consider breaking down into smaller subtasks for better manageability'];
		}
		return [];
	}

	private recommendPriority(task: LongHorizonTask): string[] {
		if (task.priority > 8) {
			return ['Allocate additional resources for high priority task execution'];
		}
		return [];
	}

	private recommendPerformance(result: PlanningResult): string[] {
		if (result.totalDuration > 180000) {
			return ['Monitor execution time closely for long-running planning phases'];
		}
		return [];
	}

	private recommendFailures(result: PlanningResult): string[] {
		const failedPhases = result.phases.filter((p) => p.error);
		if (failedPhases.length > 0) {
			return [`Review and retry failed phases: ${failedPhases.map((p) => p.phase).join(', ')}`];
		}
		return [];
	}

	private recommendAdaptiveDepth(result: PlanningResult): string[] {
		if (result.adaptiveDepth > 5) {
			return ['High planning depth detected - ensure adequate context management'];
		}
		return [];
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

	/**
	 * Centralized persistence/telemetry helper. Adds common envelope fields, respects
	 * persistenceEnabled, and handles errors without bubbling to callers.
	 */
	private async recordPersistenceEvent(
		eventType: string,
		eventData: Record<string, unknown>,
	): Promise<void> {
		if (!this.config.persistenceEnabled) return;

		const envelope = {
			...eventData,
			timestamp: new Date(),
			brainwavOrigin: true,
		};

		const start = Date.now();
		try {
			await this.persistPlanningEvent(eventType, envelope);
			const durationMs = Date.now() - start;
			// Emit metric for persistence success
			try {
				this.metrics.recordPlannerPersistenceEvent(
					eventType,
					'success',
					undefined,
					durationMs / 1000,
				);
			} catch (merr) {
				console.warn('brAInwav Telemetry hook failed (recordPlannerPersistenceEvent):', merr);
			}
		} catch (err) {
			console.warn(`brAInwav Persistence helper failed (${eventType}):`, err);
			// Emit metric for persistence failure
			try {
				this.metrics.recordPlannerPersistenceEvent(
					eventType,
					'error',
					err instanceof Error ? err.message : String(err),
				);
			} catch (merr) {
				console.warn('brAInwav Telemetry hook failed (recordPlannerPersistenceEvent):', merr);
			}
		}
	}

	/**
	 * Execute a single planning phase and handle persistence and timeouts.
	 * Returns an outcome object describing success or failure and the duration.
	 */
	private async runPhase(
		phase: PlanningPhase,
		context: PlanningContext,
		executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
		task: LongHorizonTask,
	): Promise<{ phaseDuration: number; result?: unknown; error?: string }> {
		const phaseStartTime = Date.now();

		// Advance DSP to indicate phase execution
		this.dsp.advancePhase(`Execute ${phase} phase for task: ${task.description}`);

		// Persistence hook: Record phase start
		// Fire-and-forget persistence call through the resilient helper
		this.recordPersistenceEvent('phase_started', {
			taskId: task.id,
			contextId: context.id,
			phase,
		});

		try {
			const phaseResult = await this.executePhaseWithTimeout(phase, context, executor);
			const phaseDuration = Date.now() - phaseStartTime;

			// Persistence hook: Record phase completion
			if (this.config.persistenceEnabled) {
				this.recordPersistenceEvent('phase_completed', {
					taskId: task.id,
					contextId: context.id,
					phase,
					duration: phaseDuration,
				});
			}

			return { phaseDuration, result: phaseResult };
		} catch (err) {
			const phaseDuration = Date.now() - phaseStartTime;
			const errorMessage = err instanceof Error ? err.message : String(err);

			if (this.config.persistenceEnabled) {
				this.recordPersistenceEvent('phase_failed', {
					taskId: task.id,
					contextId: context.id,
					phase,
					error: errorMessage,
					duration: phaseDuration,
				});
			}

			return { phaseDuration, error: errorMessage };
		}
	}

	/**
	 * Apply security evaluation to the planning context. Wraps the configured securityIntegration
	 * call and ensures the context.compliance is populated; on failure, returns a safe fallback
	 * and records a note on the context.
	 */
	private applySecurityEvaluation(task: LongHorizonTask, context: PlanningContext) {
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

		try {
			const evaluation = this.securityIntegration.evaluate({
				taskId: task.id,
				description: task.description,
				complianceContext: complianceSnapshot,
			});

			if (!context.compliance) {
				context.compliance = {
					standards: evaluation.standards,
					lastCheckedAt: evaluation.lastCheckedAt,
					riskScore: evaluation.aggregateRisk,
					outstandingViolations: [],
				};
			} else {
				context.compliance.standards = evaluation.standards;
				context.compliance.lastCheckedAt = evaluation.lastCheckedAt;
				context.compliance.riskScore = evaluation.aggregateRisk;
			}

			context.preferences.notes.push(`brAInwav security summary: ${evaluation.summary}`);
			return evaluation;
		} catch (e) {
			// Fail open: record the failure in context notes and return a safe fallback
			const errMsg = e instanceof Error ? e.message : String(e);
			console.warn(`brAInwav Long-Horizon Planner: Security evaluation failed: ${errMsg}`);

			const fallback = {
				standards: [],
				lastCheckedAt: new Date(),
				aggregateRisk: 0,
				outstandingViolations: [],
				summary: `Security evaluation failed: ${errMsg}`,
			} as unknown as SecurityIntegrationResult;

			if (!context.compliance) {
				context.compliance = {
					standards: fallback.standards,
					lastCheckedAt: fallback.lastCheckedAt,
					riskScore: fallback.aggregateRisk,
					outstandingViolations: [],
				};
			}

			context.preferences.notes.push(`brAInwav security evaluation failed: ${errMsg}`);
			return fallback;
		}
	}

	/**
	 * Execute a single planning phase and update the public PlanningResult with phase outcome.
	 * Returns true to continue planning or false to stop (critical failure).
	 */
	private async executePhaseAndUpdateResult(
		phase: PlanningPhase,
		context: PlanningContext,
		executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
		task: LongHorizonTask,
		result: PlanningResult,
	): Promise<boolean> {
		const phaseOutcome = await this.runPhase(phase, context, executor, task);

		if (phaseOutcome.result !== undefined) {
			result.phases.push({
				phase,
				duration: phaseOutcome.phaseDuration,
				result: phaseOutcome.result,
			});
			this.dsp.update(true);
			return true;
		}

		result.phases.push({ phase, duration: phaseOutcome.phaseDuration, error: phaseOutcome.error });
		this.dsp.update(false);
		result.success = false;
		console.error(`brAInwav Long-Horizon Planner: Failed ${phase} phase: ${phaseOutcome.error}`);

		if (this.isCriticalPhase(phase)) {
			return false;
		}

		return true;
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
