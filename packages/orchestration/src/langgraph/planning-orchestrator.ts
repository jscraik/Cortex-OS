import { randomUUID } from 'node:crypto';
import {
        AdaptiveCoordinationManager,
        type AgentDescriptor,
        type CoordinationDecision,
} from '../coordinator/adaptive-coordinator.js';
import { createLongHorizonPlanner, type LongHorizonPlanner, type LongHorizonTask, type PlanningResult } from '../lib/long-horizon-planner.js';
import type { PlanningContext } from '../utils/dsp.js';
import { createCerebrumGraph } from './create-cerebrum-graph.js';
import { createInitialN0State, mergeN0State, type N0Session, type N0State } from './n0-state.js';

export interface ExecutePlannedWorkflowOptions {
        input: string;
        task: Partial<LongHorizonTask> & Pick<LongHorizonTask, 'description'>;
        agents?: AgentDescriptor[];
        session?: Partial<N0Session>;
        planner?: LongHorizonPlanner;
        coordinationManager?: AdaptiveCoordinationManager;
        clock?: () => Date;
}

export interface PlannedWorkflowResult {
        output?: string;
        planningResult: PlanningResult;
        coordinationDecision: CoordinationDecision;
        stateTransitions: Array<{
                phase: string;
                status: 'completed' | 'failed';
                duration: number;
        }>;
        state: N0State;
}

const DEFAULT_SESSION: N0Session = {
        id: 'brAInwav-session',
        model: 'unknown',
        user: 'system',
        cwd: '/workspace',
        brainwavSession: 'planning-orchestrator',
};

export async function executePlannedWorkflow(options: ExecutePlannedWorkflowOptions): Promise<PlannedWorkflowResult> {
        const clock = options.clock ?? (() => new Date());
        const planner = options.planner ?? createLongHorizonPlanner({ clock });
        const coordinationManager =
                options.coordinationManager ?? new AdaptiveCoordinationManager({ clock, historyLimit: 25 });
        const agents: AgentDescriptor[] = options.agents ?? [
                { id: 'brAInwav.agent.primary', capabilities: ['analysis', 'execution'] },
                { id: 'brAInwav.agent.support', capabilities: ['review', 'validation'] },
        ];

        const task = normalizeTask(options.task);
        const planningResult = await planner.planAndExecute(task, async (phase, context) => {
                return buildPhaseSummary(phase, context, clock);
        });

        const coordinationDecision = coordinationManager.coordinate({
                task,
                agents,
                planningResult,
                contextSnapshot: planner.getCurrentContext(),
                requiredCapabilities: gatherCapabilities(task),
        });

        const graph = createCerebrumGraph();
        const planningPayload = {
                input: options.input,
                planning: {
                        taskId: task.id,
                        phases: planningResult.phases.map((phase) => {
                                const status: 'failed' | 'completed' = phase.error ? 'failed' : 'completed';
                                return {
                                        phase: phase.phase,
                                        duration: phase.duration,
                                        status,
                                };
                        }),
                        recommendations: planningResult.recommendations,
                        security: planningResult.security,
                },
                coordination: {
                        strategy: coordinationDecision.strategy,
                        assignments: coordinationDecision.assignments,
                        confidence: coordinationDecision.confidence,
                },
        };

        const graphState = await graph.invoke(planningPayload as unknown as Parameters<typeof graph.invoke>[0]);

        const stateTransitions = planningResult.phases.map((phase) => {
                const status: 'failed' | 'completed' = phase.error ? 'failed' : 'completed';
                return {
                        phase: phase.phase,
                        status,
                        duration: phase.duration,
                };
        });

        const session = { ...DEFAULT_SESSION, ...options.session };
        const baseState = createInitialN0State(options.input, session);
        const state = mergeN0State(baseState, {
                output: graphState.output,
                ctx: {
                        planning: {
                                phases: planningResult.phases,
                                recommendations: planningResult.recommendations,
                                success: planningResult.success,
                                security: planningResult.security,
                        },
                        coordination: {
                                strategy: coordinationDecision.strategy,
                                assignments: coordinationDecision.assignments,
                                confidence: coordinationDecision.confidence,
                        },
                        security: planningResult.security,
                        telemetry: coordinationDecision.telemetry,
                },
        });

        return {
                output: graphState.output,
                planningResult,
                coordinationDecision,
                stateTransitions,
                state,
        };
}

function normalizeTask(task: ExecutePlannedWorkflowOptions['task']): LongHorizonTask {
        return {
                id: task.id ?? randomUUID(),
                description: task.description,
                complexity: task.complexity ?? 5,
                priority: task.priority ?? 5,
                estimatedDuration: task.estimatedDuration ?? 60_000,
                dependencies: task.dependencies ?? [],
                metadata: task.metadata ?? {},
        };
}

function gatherCapabilities(task: LongHorizonTask): string[] {
        if (!task.metadata) {
                return [];
        }
        const caps = task.metadata.capabilities;
        return Array.isArray(caps) ? caps.filter((cap): cap is string => typeof cap === 'string') : [];
}

function buildPhaseSummary(phase: string, context: PlanningContext, clock: () => Date) {
        return {
                phase,
                contextId: context.id,
                stepCount: context.steps.length,
                historyCount: context.history.length,
                timestamp: clock().toISOString(),
        };
}
