/**
 * Long-Horizon Planning implementation for Cortex-OS
 * Extends DSP with structured planning capabilities inspired by Deep Agents patterns
 * Maintains brAInwav branding and follows single-focus agent architecture
 */
import {
	type SecurityIntegrationResult,
	type SecurityIntegrationService,
} from '@cortex-os/cortex-sec';
import { type DSPConfig, type PlanningContext, PlanningPhase } from '../utils/dsp.js';
export interface LongHorizonTask {
	id: string;
	description: string;
	complexity: number;
	priority: number;
	estimatedDuration: number;
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
	maxPlanningTime?: number;
	adaptiveDepthEnabled?: boolean;
	persistenceEnabled?: boolean;
	securityIntegrationService?: SecurityIntegrationService;
	clock?: () => Date;
}
/**
 * Enhanced planner that combines DSP with structured long-horizon planning
 * Implements context quarantine and adaptive planning depth
 */
export declare class LongHorizonPlanner {
	private readonly dsp;
	private readonly config;
	private readonly securityIntegration;
	private readonly metrics;
	private activeContext?;
	constructor(config?: LongHorizonPlannerConfig);
	/**
	 * Plan and execute a long-horizon task with structured phases
	 */
	planAndExecute(
		task: LongHorizonTask,
		executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
	): Promise<PlanningResult>;
	/**
	 * Plan a task with enhanced DSP integration and persistence hooks
	 */
	planTask(
		task: LongHorizonTask,
		executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
	): Promise<PlanningResult>;
	/**
	 * Get planning phases based on task complexity
	 */
	private getPlanningPhases;
	/**
	 * Execute phase with timeout protection
	 */
	private executePhaseWithTimeout;
	/**
	 * Check if phase is critical (failure should stop planning)
	 */
	private isCriticalPhase;
	/**
	 * Generate recommendations based on planning results
	 */
	private generateRecommendations;
	private recommendComplexity;
	private recommendPriority;
	private recommendPerformance;
	private recommendFailures;
	private recommendAdaptiveDepth;
	/**
	 * Get current planning context (if any)
	 */
	getCurrentContext(): PlanningContext | undefined;
	/**
	 * Clear active context (useful for context isolation)
	 */
	clearContext(): void;
	/**
	 * Get planning statistics for monitoring
	 */
	getStats(): {
		hasActiveContext: boolean;
		currentStep: number;
		currentPhase?: PlanningPhase;
		adaptiveDepth: number;
	};
	/**
	 * Persistence hook for planning events
	 * In production, this would integrate with actual persistence layer
	 */
	private persistPlanningEvent;
	/**
	 * Centralized persistence/telemetry helper. Adds common envelope fields, respects
	 * persistenceEnabled, and handles errors without bubbling to callers.
	 */
	private recordPersistenceEvent;
	/**
	 * Execute a single planning phase and handle persistence and timeouts.
	 * Returns an outcome object describing success or failure and the duration.
	 */
	private runPhase;
	/**
	 * Apply security evaluation to the planning context. Wraps the configured securityIntegration
	 * call and ensures the context.compliance is populated; on failure, returns a safe fallback
	 * and records a note on the context.
	 */
	private applySecurityEvaluation;
	/**
	 * Execute a single planning phase and update the public PlanningResult with phase outcome.
	 * Returns true to continue planning or false to stop (critical failure).
	 */
	private executePhaseAndUpdateResult;
}
/**
 * Create a long-horizon planner with brAInwav-optimized defaults
 */
export declare function createLongHorizonPlanner(
	config?: LongHorizonPlannerConfig,
): LongHorizonPlanner;
//# sourceMappingURL=long-horizon-planner.d.ts.map
