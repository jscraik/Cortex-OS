/**
 * Long-Horizon Planning implementation for Cortex-OS
 * Extends DSP with structured planning capabilities inspired by Deep Agents patterns
 * Maintains brAInwav branding and follows single-focus agent architecture
 */

import {
        type DSPConfig,
        DynamicSpeculativePlanner,
        type PlanningContext,
        PlanningPhase,
} from '../utils/dsp.js';
import { PlanningContextManager } from '../dsp/planning-context-manager.js';

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
}

export interface LongHorizonPlannerConfig extends DSPConfig {
        enableContextIsolation?: boolean;
        maxPlanningTime?: number; // milliseconds
        adaptiveDepthEnabled?: boolean;
        persistenceEnabled?: boolean;
        contextManager?: PlanningContextManager;
        persistenceAdapter?: PlanningPersistenceAdapter;
        clock?: () => Date;
}

export interface PlanningPhaseRecord {
        taskId: string;
        phase: PlanningPhase;
        duration: number;
        success: boolean;
        timestamp: Date;
        result?: unknown;
        error?: string;
}

export interface PlanningPersistenceAdapter {
        load(taskId: string): Promise<PlanningResult | undefined>;
        save(result: PlanningResult): Promise<void>;
        recordPhase?(record: PlanningPhaseRecord): Promise<void> | void;
}

/**
 * Enhanced planner that combines DSP with structured long-horizon planning
 * Implements context quarantine and adaptive planning depth
 */
export class LongHorizonPlanner {
        private readonly dsp: DynamicSpeculativePlanner;
        private readonly config: LongHorizonPlannerConfig;
        private readonly contextManager?: PlanningContextManager;
        private readonly persistence?: PlanningPersistenceAdapter;
        private readonly clock: () => Date;
        private activeContext?: PlanningContext;

        constructor(config: LongHorizonPlannerConfig = {}) {
                const { contextManager, persistenceAdapter, clock, ...plannerConfig } = config;

                this.config = {
                        enableContextIsolation: true,
                        maxPlanningTime: 300000, // 5 minutes default
                        adaptiveDepthEnabled: true,
                        persistenceEnabled: true,
                        planningDepth: plannerConfig.planningDepth ?? 3,
                        ...plannerConfig,
                };

                this.contextManager = contextManager;
                this.persistence = persistenceAdapter;
                this.clock = clock ?? (() => new Date());

                this.dsp = new DynamicSpeculativePlanner({
                        initialStep: plannerConfig.initialStep,
                        maxStep: plannerConfig.maxStep,
                        planningDepth: this.config.planningDepth,
                        contextIsolation: this.config.enableContextIsolation,
                        workspaceId: plannerConfig.workspaceId,
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
                const startTime = this.clock().getTime();
                console.log(`brAInwav Long-Horizon Planner: Starting planning for task ${task.id}`);

                const persisted = await this.loadPersistedResult(task.id);

                const context = this.dsp.initializePlanning(task.id, task.complexity, task.priority);
                this.activeContext = context;
                if (this.contextManager && this.dsp.context) {
                        this.contextManager.register(task.id, this.dsp.context);
                }

                const result: PlanningResult = {
                        taskId: task.id,
                        success: true,
                        phases: [],
                        totalDuration: 0,
                        adaptiveDepth: this.config.adaptiveDepthEnabled
                                ? this.dsp.getAdaptivePlanningDepth()
                                : Math.max(1, Math.floor(this.config.planningDepth ?? 1)),
                        recommendations: persisted?.recommendations ? [...persisted.recommendations] : [],
                        brainwavMetadata: {
                                createdBy: 'brAInwav',
                                version: persisted?.brainwavMetadata.version ?? '1.0.0',
                                timestamp: this.clock(),
                        },
                };

                try {
                        const phases = this.getPlanningPhases(task);

                        for (const phase of phases) {
                                const phaseStartTime = this.clock().getTime();

                                try {
                                        this.dsp.advancePhase(`Execute ${phase} phase for task: ${task.description}`);

                                        const dspContext = this.dsp.context ?? context;
                                        if (dspContext && this.contextManager) {
                                                this.contextManager.register(task.id, dspContext);
                                        }

                                        const phaseContext =
                                                dspContext && this.contextManager
                                                        ? this.contextManager.isolate(task.id, dspContext)
                                                        : dspContext ?? context;

                                        const phaseResult = await this.executePhaseWithTimeout(
                                                task,
                                                phase,
                                                phaseContext,
                                                executor,
                                        );

                                        const phaseDuration = this.clock().getTime() - phaseStartTime;

                                        result.phases.push({
                                                phase,
                                                duration: phaseDuration,
                                                result: phaseResult,
                                        });

                                        this.dsp.update(true);
                                        if (this.dsp.context) {
                                                this.contextManager?.register(task.id, this.dsp.context);
                                        }

                                        await this.persistPhase({
                                                taskId: task.id,
                                                phase,
                                                duration: phaseDuration,
                                                success: true,
                                                timestamp: this.clock(),
                                                result: phaseResult,
                                        });

                                        console.log(
                                                `brAInwav Long-Horizon Planner: Completed ${phase} phase in ${phaseDuration}ms`,
                                        );
                                } catch (error) {
                                        const phaseDuration = this.clock().getTime() - phaseStartTime;
                                        const errorMessage = error instanceof Error ? error.message : String(error);

                                        result.phases.push({
                                                phase,
                                                duration: phaseDuration,
                                                error: errorMessage,
                                        });

                                        this.dsp.update(false);
                                        if (this.dsp.context) {
                                                this.contextManager?.register(task.id, this.dsp.context);
                                        }

                                        await this.persistPhase({
                                                taskId: task.id,
                                                phase,
                                                duration: phaseDuration,
                                                success: false,
                                                timestamp: this.clock(),
                                                error: errorMessage,
                                        });

                                        result.success = false;

                                        console.error(`brAInwav Long-Horizon Planner: Failed ${phase} phase: ${errorMessage}`);

                                        if (this.isCriticalPhase(phase)) {
                                                break;
                                        }
                                }
                        }

                        this.dsp.completePlanning(result);
                        if (this.dsp.context) {
                                this.contextManager?.register(task.id, this.dsp.context);
                        }
                } catch (error) {
                        result.success = false;
                        console.error(`brAInwav Long-Horizon Planner: Planning failed for task ${task.id}:`, error);
                }

                result.totalDuration = this.clock().getTime() - startTime;
                const generatedRecommendations = this.generateRecommendations(task, result);
                result.recommendations = Array.from(
                        new Set([...(result.recommendations ?? []), ...generatedRecommendations]),
                );
                result.adaptiveDepth = this.config.adaptiveDepthEnabled
                        ? this.dsp.getAdaptivePlanningDepth()
                        : Math.max(1, Math.floor(this.config.planningDepth ?? 1));

                console.log(
                        `brAInwav Long-Horizon Planner: Completed planning for task ${task.id} in ${result.totalDuration}ms`,
                );

                await this.saveResult(result);

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
                task: LongHorizonTask,
                phase: PlanningPhase,
                context: PlanningContext,
                executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
        ): Promise<unknown> {
                const timeoutMs = this.config.maxPlanningTime ?? 300000;

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
                                reject(
                                        new Error(
                                                `brAInwav Long-Horizon Planner: Task ${task.id} phase ${phase} timed out after ${timeoutMs}ms`,
                                        ),
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

        private async loadPersistedResult(taskId: string): Promise<PlanningResult | undefined> {
                if (!this.persistence || this.config.persistenceEnabled === false) {
                        return undefined;
                }

                try {
                        return await this.persistence.load(taskId);
                } catch (error) {
                        console.warn(
                                `brAInwav Long-Horizon Planner: Unable to load persisted planning result for ${taskId}`,
                                error,
                        );
                        return undefined;
                }
        }

        private async persistPhase(record: PlanningPhaseRecord): Promise<void> {
                if (!this.persistence || typeof this.persistence.recordPhase !== 'function') {
                        return;
                }

                try {
                        await this.persistence.recordPhase(record);
                } catch (error) {
                        console.warn(
                                `brAInwav Long-Horizon Planner: Failed to persist phase ${record.phase} for ${record.taskId}`,
                                error,
                        );
                }
        }

        private async saveResult(result: PlanningResult): Promise<void> {
                if (!this.persistence || this.config.persistenceEnabled === false) {
                        return;
                }

                try {
                        await this.persistence.save(result);
                } catch (error) {
                        console.warn(
                                `brAInwav Long-Horizon Planner: Failed to save planning result for ${result.taskId}`,
                                error,
                        );
                }
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
                if (this.contextManager && this.activeContext) {
                        console.log('brAInwav Long-Horizon Planner: Clearing managed planning context cache');
                        this.contextManager.clear(this.activeContext.id);
                } else if (this.contextManager) {
                        this.contextManager.clearAll();
                }
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
                contextManager: config?.contextManager ?? new PlanningContextManager(),
                persistenceAdapter: config?.persistenceAdapter ?? new InMemoryPlanningPersistence(),
                ...config,
        };

        return new LongHorizonPlanner(defaultConfig);
}

export class InMemoryPlanningPersistence implements PlanningPersistenceAdapter {
        private readonly results = new Map<string, PlanningResult>();
        private readonly phases = new Map<string, PlanningPhaseRecord[]>();
        private readonly clonedResults = new Map<string, PlanningResult>();

        async load(taskId: string): Promise<PlanningResult | undefined> {
                if (this.clonedResults.has(taskId)) {
                        return this.clonedResults.get(taskId);
                }
                const original = this.results.get(taskId);
                const cloned = clonePlanningResult(original);
                if (cloned) {
                        this.clonedResults.set(taskId, cloned);
                }
                return cloned;
        }

        async save(result: PlanningResult): Promise<void> {
                this.results.set(result.taskId, clonePlanningResult(result));
                this.clonedResults.delete(result.taskId);
        }

        async recordPhase(record: PlanningPhaseRecord): Promise<void> {
                const history = this.phases.get(record.taskId) ?? [];
                history.push({ ...record, timestamp: new Date(record.timestamp) });
                this.phases.set(record.taskId, history.slice(-100));
        }

        getPhaseHistory(taskId: string): PlanningPhaseRecord[] {
                const history = this.phases.get(taskId) ?? [];
                return history.map((entry) => ({ ...entry, timestamp: new Date(entry.timestamp) }));
        }
}

function clonePlanningResult(result: PlanningResult | undefined): PlanningResult | undefined {
        if (!result) {
                return undefined;
        }

        if (typeof structuredClone === 'function') {
                return structuredClone(result);
        }

        return JSON.parse(JSON.stringify(result), (key, value) => {
                if (key === 'timestamp' && typeof value === 'string') {
                        return new Date(value);
                }
                return value;
        });
}
