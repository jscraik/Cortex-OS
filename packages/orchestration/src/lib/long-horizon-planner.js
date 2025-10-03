/**
 * Long-Horizon Planning implementation for Cortex-OS
 * Extends DSP with structured planning capabilities inspired by Deep Agents patterns
 * Maintains brAInwav branding and follows single-focus agent architecture
 */
import { createSecurityIntegrationService } from '@cortex-os/cortex-sec';
import { OrchestrationMetrics } from '../observability/custom-metrics.js';
import { DynamicSpeculativePlanner, PlanningPhase } from '../utils/dsp.js';
/**
 * Enhanced planner that combines DSP with structured long-horizon planning
 * Implements context quarantine and adaptive planning depth
 */
export class LongHorizonPlanner {
	dsp;
	config;
	securityIntegration;
	metrics;
	activeContext;
	constructor(config = {}) {
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
	async planAndExecute(task, executor) {
		return this.planTask(task, executor);
	}
	/**
	 * Plan a task with enhanced DSP integration and persistence hooks
	 */
	async planTask(task, executor) {
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
		const result = {
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
	getPlanningPhases(task) {
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
	async executePhaseWithTimeout(phase, context, executor) {
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
	isCriticalPhase(phase) {
		return phase === PlanningPhase.INITIALIZATION || phase === PlanningPhase.ANALYSIS;
	}
	/**
	 * Generate recommendations based on planning results
	 */
	generateRecommendations(task, result) {
		return [
			...this.recommendComplexity(task),
			...this.recommendPriority(task),
			...this.recommendPerformance(result),
			...this.recommendFailures(result),
			...this.recommendAdaptiveDepth(result),
		];
	}
	recommendComplexity(task) {
		if (task.complexity > 7) {
			return ['Consider breaking down into smaller subtasks for better manageability'];
		}
		return [];
	}
	recommendPriority(task) {
		if (task.priority > 8) {
			return ['Allocate additional resources for high priority task execution'];
		}
		return [];
	}
	recommendPerformance(result) {
		if (result.totalDuration > 180000) {
			return ['Monitor execution time closely for long-running planning phases'];
		}
		return [];
	}
	recommendFailures(result) {
		const failedPhases = result.phases.filter((p) => p.error);
		if (failedPhases.length > 0) {
			return [`Review and retry failed phases: ${failedPhases.map((p) => p.phase).join(', ')}`];
		}
		return [];
	}
	recommendAdaptiveDepth(result) {
		if (result.adaptiveDepth > 5) {
			return ['High planning depth detected - ensure adequate context management'];
		}
		return [];
	}
	/**
	 * Get current planning context (if any)
	 */
	getCurrentContext() {
		return this.activeContext;
	}
	/**
	 * Clear active context (useful for context isolation)
	 */
	clearContext() {
		this.activeContext = undefined;
		console.log('brAInwav Long-Horizon Planner: Cleared active planning context');
	}
	/**
	 * Get planning statistics for monitoring
	 */
	getStats() {
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
	async persistPlanningEvent(eventType, eventData) {
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
	async recordPersistenceEvent(eventType, eventData) {
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
	async runPhase(phase, context, executor, task) {
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
	applySecurityEvaluation(task, context) {
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
			};
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
	async executePhaseAndUpdateResult(phase, context, executor, task, result) {
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
export function createLongHorizonPlanner(config) {
	const defaultConfig = {
		enableContextIsolation: true,
		maxPlanningTime: 300000,
		adaptiveDepthEnabled: true,
		persistenceEnabled: true,
		planningDepth: 3,
		...config,
	};
	return new LongHorizonPlanner(defaultConfig);
}
//# sourceMappingURL=long-horizon-planner.js.map
