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
        type PlanningContextSnapshot,
} from '../utils/dsp.js';
import {
        PlanningContextManager as DSPPlanningContextManager,
        type PlanningContextManagerOptions,
} from '../dsp/planning-context-manager.js';
import type { LongHorizonPlanningState } from '../types.js';

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
        snapshots: PlanningContextSnapshot[];
        contextId?: string;
        contextState?: LongHorizonPlanningState;
        brainwavMetadata: {
                createdBy: 'brAInwav';
                version: string;
                timestamp: Date;
                revision: number;
        };
}

export interface LongHorizonPlannerConfig extends DSPConfig {
        enableContextIsolation?: boolean;
        maxPlanningTime?: number; // milliseconds
        adaptiveDepthEnabled?: boolean;
        persistenceEnabled?: boolean;
        contextManager?: DSPPlanningContextManager;
        contextManagerOptions?: PlanningContextManagerOptions;
        snapshotLimit?: number;
}

/**
 * Enhanced planner that combines DSP with structured long-horizon planning
 * Implements context quarantine and adaptive planning depth
 */
export class LongHorizonPlanner {
        private readonly dsp: DynamicSpeculativePlanner;
        private readonly config: LongHorizonPlannerConfig;
        private readonly contextManager?: DSPPlanningContextManager;
        private readonly snapshotLimit: number;
        private activeContext?: PlanningContext;
        private snapshots: PlanningContextSnapshot[] = [];

        constructor(config: LongHorizonPlannerConfig = {}) {
                const enableContextIsolation =
                        config.enableContextIsolation ?? config.contextIsolation ?? true;
                const persistenceActive =
                        config.persistenceEnabled ?? Boolean(config.persistenceAdapter ?? config.autoPersist);

                this.config = {
                        enableContextIsolation,
                        maxPlanningTime: config.maxPlanningTime ?? 300000, // 5 minutes default
                        adaptiveDepthEnabled: config.adaptiveDepthEnabled ?? true,
                        persistenceEnabled: persistenceActive,
                        snapshotLimit: Math.max(1, config.snapshotLimit ?? 12),
                        ...config,
                        contextIsolation: enableContextIsolation,
                };

                this.snapshotLimit = Math.max(1, this.config.snapshotLimit ?? 12);
                this.contextManager =
                        config.contextManager ??
                        (enableContextIsolation
                                ? new DSPPlanningContextManager(config.contextManagerOptions)
                                : undefined);

                this.dsp = new DynamicSpeculativePlanner({
                        ...config,
                        contextIsolation: enableContextIsolation,
                        autoPersist: config.autoPersist ?? persistenceActive,
                        resumeFromPersistence: config.resumeFromPersistence ?? persistenceActive,
                });

                console.log('brAInwav Long-Horizon Planner: Initialized with enhanced DSP capabilities');
        }

        async planAndExecute(
                task: LongHorizonTask,
                executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
        ): Promise<PlanningResult> {
                return this.planTask(task, executor);
        }

        async planTask(
                task: LongHorizonTask,
                executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
        ): Promise<PlanningResult> {
                const startTime = Date.now();
                console.log(`brAInwav Long-Horizon Planner: Starting planning for task ${task.id}`);

                this.snapshots = [];

                const context = this.hydrateContext(task);
                this.activeContext = context;

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
                        snapshots: [],
                        contextId: context.id,
                        contextState: undefined,
                        brainwavMetadata: {
                                createdBy: 'brAInwav',
                                version: '1.0.0',
                                timestamp: new Date(),
                                revision: 0,
                        },
                };

                this.updateResultContextMetadata(result);

                try {
                        const phases = this.getPlanningPhases(task);

                        for (const phase of phases) {
                                const phaseStartTime = Date.now();

                                try {
                                        this.dsp.advancePhase(`Execute ${phase} phase for task: ${task.description}`);
                                        this.recordSnapshot(`phase_advanced:${phase}`);
                                        this.updateResultContextMetadata(result);

                                        if (this.config.persistenceEnabled) {
                                                await this.persistPlanningEvent('phase_started', {
                                                        taskId: task.id,
                                                        contextId: context.id,
                                                        phase,
                                                        timestamp: new Date(),
                                                        brainwavOrigin: true,
                                                });
                                        }

                                        const executionSnapshot = this.dsp.getContextSnapshot(
                                                `phase_execute:${phase}`,
                                        );
                                        const executionContext = executionSnapshot?.context ?? (this.dsp.context ?? context);

                                        const phaseResult = await this.executePhaseWithTimeout(
                                                phase,
                                                executionContext,
                                                executor,
                                        );

                                        const phaseDuration = Date.now() - phaseStartTime;

                                        result.phases.push({
                                                phase,
                                                duration: phaseDuration,
                                                result: phaseResult,
                                        });

                                        this.dsp.update(true);
                                        this.recordSnapshot(`phase_completed:${phase}`);
                                        this.updateResultContextMetadata(result);

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

                                        this.dsp.update(false);
                                        result.success = false;
                                        this.recordSnapshot(`phase_failed:${phase}`);
                                        this.updateResultContextMetadata(result);

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

                                        console.error(
                                                `brAInwav Long-Horizon Planner: Failed ${phase} phase: ${errorMessage}`,
                                        );

                                        if (this.isCriticalPhase(phase)) {
                                                break;
                                        }
                                }
                        }

                        this.dsp.completePlanning(result);
                        this.recordSnapshot('planning_completed');
                        this.updateResultContextMetadata(result);
                } catch (error) {
                        result.success = false;
                        this.recordSnapshot('planning_exception');
                        this.updateResultContextMetadata(result);
                        console.error(
                                `brAInwav Long-Horizon Planner: Planning failed for task ${task.id}:`,
                                error,
                        );
                }

                result.totalDuration = Date.now() - startTime;
                result.adaptiveDepth = this.config.adaptiveDepthEnabled
                        ? this.dsp.getAdaptivePlanningDepth()
                        : this.config.planningDepth ?? this.dsp.getAdaptivePlanningDepth();
                result.recommendations = this.generateRecommendations(task, result);
                result.snapshots = [...this.snapshots];

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

        getCurrentContext(): PlanningContext | undefined {
                return this.activeContext;
        }

        clearContext(): void {
                this.activeContext = undefined;
                this.snapshots = [];
                this.dsp.clearContext();
                console.log('brAInwav Long-Horizon Planner: Cleared active planning context');
        }

        getStats(): {
                hasActiveContext: boolean;
                currentStep: number;
                currentPhase?: PlanningPhase;
                adaptiveDepth: number;
                snapshotCount: number;
        } {
                return {
                        hasActiveContext: !!this.dsp.context,
                        currentStep: this.dsp.currentStep,
                        currentPhase: this.dsp.currentPhase,
                        adaptiveDepth: this.dsp.getAdaptivePlanningDepth(),
                        snapshotCount: this.snapshots.length,
                };
        }

        getContextSnapshots(): PlanningContextSnapshot[] {
                return [...this.snapshots];
        }

        private hydrateContext(task: LongHorizonTask): PlanningContext {
                let context: PlanningContext | undefined;

                if (this.config.persistenceEnabled) {
                        context = this.dsp.resumePlanning(task.id, {
                                complexity: task.complexity,
                                priority: task.priority,
                        });
                }

                if (!context) {
                        context = this.dsp.initializePlanning(task.id, task.complexity, task.priority);
                }

                if (this.contextManager) {
                        this.contextManager.register(task.id, context);
                        const isolated = this.contextManager.isolate(task.id, context);
                        context = this.dsp.attachContext(isolated, {
                                reason: 'attach',
                                preserveRevision: true,
                                currentStep: this.dsp.currentStep,
                        });
                        this.contextManager.register(task.id, context);
                }

                this.activeContext = this.dsp.context ?? context;
                this.recordSnapshot('context_hydrated');
                this.updateContextStateMemory(task.id);
                return this.activeContext ?? context;
        }

        private getPlanningPhases(task: LongHorizonTask): PlanningPhase[] {
                const basePhases = [
                        PlanningPhase.INITIALIZATION,
                        PlanningPhase.ANALYSIS,
                        PlanningPhase.STRATEGY,
                        PlanningPhase.EXECUTION,
                ];

                if (task.complexity > 5) {
                        basePhases.push(PlanningPhase.VALIDATION);
                }

                basePhases.push(PlanningPhase.COMPLETION);
                return basePhases;
        }

        private async executePhaseWithTimeout(
                phase: PlanningPhase,
                context: PlanningContext,
                executor: (phase: PlanningPhase, context: PlanningContext) => Promise<unknown>,
        ): Promise<unknown> {
                const timeoutMs = this.config.maxPlanningTime ?? 300000;

                return new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                                reject(
                                        new Error(
                                                `brAInwav Long-Horizon Planner: Phase ${phase} timed out after ${timeoutMs}ms`,
                                        ),
                                );
                        }, timeoutMs);

                        executor(phase, context)
                                .then(resolve)
                                .catch(reject)
                                .finally(() => clearTimeout(timeout));
                });
        }

        private isCriticalPhase(phase: PlanningPhase): boolean {
                return phase === PlanningPhase.INITIALIZATION || phase === PlanningPhase.ANALYSIS;
        }

        private generateRecommendations(task: LongHorizonTask, result: PlanningResult): string[] {
                const recommendations: string[] = [];

                if (task.complexity > 7) {
                        recommendations.push('Consider breaking down into smaller subtasks for better manageability');
                }

                if (task.priority > 8) {
                        recommendations.push('Allocate additional resources for high priority task execution');
                }

                if (result.totalDuration > 180000) {
                        recommendations.push('Monitor execution time closely for long-running planning phases');
                }

                const failedPhases = result.phases.filter((p) => p.error);
                if (failedPhases.length > 0) {
                        recommendations.push(
                                `Review and retry failed phases: ${failedPhases.map((p) => p.phase).join(', ')}`,
                        );
                }

                if (result.adaptiveDepth > 5) {
                        recommendations.push('High planning depth detected - ensure adequate context management');
                }

                if (this.config.enableContextIsolation) {
                        recommendations.push('brAInwav isolation layer active – contexts quarantined per task.');
                }

                if (this.config.persistenceEnabled) {
                        recommendations.push('Persisted context available for follow-up sessions via brAInwav DSP.');
                }

                return recommendations;
        }

        private recordSnapshot(reason: string): void {
                const snapshot = this.dsp.getContextSnapshot(reason);
                if (!snapshot) {
                        return;
                }

                this.snapshots.push(snapshot);
                if (this.snapshots.length > this.snapshotLimit) {
                        this.snapshots.splice(0, this.snapshots.length - this.snapshotLimit);
                }

                if (this.contextManager) {
                        this.contextManager.register(snapshot.taskId, snapshot.context);
                }

                this.activeContext = this.dsp.context ?? snapshot.context;
        }

        private updateResultContextMetadata(result: PlanningResult): void {
                const lastSnapshot = this.dsp.getLastSnapshot();
                if (lastSnapshot) {
                        result.contextId = lastSnapshot.taskId;
                        result.brainwavMetadata.revision = lastSnapshot.revision;
                        result.contextState = {
                                contextId: lastSnapshot.taskId,
                                currentPhase: lastSnapshot.phase,
                                adaptiveDepth: this.dsp.getAdaptivePlanningDepth(),
                                isolationScope: lastSnapshot.scope,
                                lastSnapshotRevision: lastSnapshot.revision,
                                lastSnapshotAt: lastSnapshot.timestamp,
                        };
                } else if (this.activeContext) {
                        result.contextId = this.activeContext.id;
                        result.contextState = {
                                contextId: this.activeContext.id,
                                currentPhase: this.activeContext.currentPhase,
                                adaptiveDepth: this.dsp.getAdaptivePlanningDepth(),
                                isolationScope: this.config.enableContextIsolation ? 'task' : 'global',
                                lastSnapshotRevision: 0,
                        };
                }

                result.snapshots = [...this.snapshots];
        }

        private updateContextStateMemory(taskId: string): void {
                if (!this.contextManager || !this.dsp.context) {
                        return;
                }
                this.contextManager.register(taskId, this.dsp.context);
        }

        private async persistPlanningEvent(eventType: string, eventData: Record<string, unknown>): Promise<void> {
                if (!this.config.persistenceEnabled) {
                        return;
                }

                const latestRevision = this.snapshots.length > 0
                        ? this.snapshots[this.snapshots.length - 1].revision
                        : 0;

                console.log(`brAInwav Persistence Hook: ${eventType}`, {
                        eventType,
                        timestamp: new Date().toISOString(),
                        brainwavOrigin: true,
                        revision: latestRevision,
                        snapshots: this.snapshots.length,
                        ...eventData,
                });
        }
}

export function createLongHorizonPlanner(config?: LongHorizonPlannerConfig): LongHorizonPlanner {
        const defaultConfig: LongHorizonPlannerConfig = {
                enableContextIsolation: true,
                maxPlanningTime: 300000,
                adaptiveDepthEnabled: true,
                persistenceEnabled: true,
                planningDepth: 3,
                snapshotLimit: 12,
                ...config,
        };

        return new LongHorizonPlanner(defaultConfig);
}
