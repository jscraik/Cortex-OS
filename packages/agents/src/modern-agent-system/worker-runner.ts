import {
        type ApprovalGate,
        type PlannerGoal,
        type PlannerPlan,
        type PlannerStepRecord,
        type WorkerRegistry,
        type WorkerStepResult,
} from './types.js';
import { type MemoryCoordinator } from './memory-adapter.js';
import { type ToolRouter } from './tool-router.js';

export interface WorkerRunner {
        executePlan: (plan: PlannerPlan) => Promise<PlannerStepRecord[]>;
        executeTask: (goal: PlannerGoal, capability: string, input: Record<string, unknown>) => Promise<WorkerStepResult>;
}

interface WorkerRunnerOptions {
        approvalGate: ApprovalGate;
        registry: WorkerRegistry;
        memory: MemoryCoordinator;
        tools: ToolRouter;
}

const resolveWorker = (registry: WorkerRegistry, capability: string) => {
        const worker = registry.findByCapability(capability);
        if (!worker) {
                throw new Error(
                        `brAInwav modern-agent-system: no worker registered for capability "${capability}"`,
                );
        }
        return worker;
};

const ensureApproval = async (
        approvalGate: ApprovalGate,
        goal: PlannerGoal,
        capability: string,
        input: Record<string, unknown>,
) => {
        if (!approvalGate.requireApproval) return;
        const decision = await approvalGate.requestApproval({ goal, capability, input, sessionId: goal.sessionId });
        if (!decision.approved) {
                        throw new Error(
                        `brAInwav modern-agent-system: approval denied for capability "${capability}"`,
        );
        }
};

const runWorker = async (
        options: WorkerRunnerOptions,
        goal: PlannerGoal,
        capability: string,
        input: Record<string, unknown>,
) => {
        await ensureApproval(options.approvalGate, goal, capability, input);
        const worker = resolveWorker(options.registry, capability);
        const { state, context } = await options.memory.loadState(goal);
        const result = await worker.handler(
                { capability, input },
                { tools: options.tools, goal, memory: state, contextDocuments: context },
        );
        if (!result.worker) {
                return { ...result, worker: worker.name } satisfies WorkerStepResult;
        }
        return result;
};

const persist = async (
        options: WorkerRunnerOptions,
        goal: PlannerGoal,
        capability: string,
        result: WorkerStepResult,
        input: Record<string, unknown>,
) => {
        await options.memory.persistStep(goal, result);
        return {
                capability,
                worker: result.worker,
                status: 'completed' as const,
                input,
                output: result.output,
                completedAt: new Date().toISOString(),
        } satisfies PlannerStepRecord;
};

export const createWorkerRunner = (options: WorkerRunnerOptions): WorkerRunner => {
        const executeTask = async (goal: PlannerGoal, capability: string, input: Record<string, unknown>) => {
                const result = await runWorker(options, goal, capability, input);
                await persist(options, goal, capability, result, input);
                return result;
        };
        const executePlan = async (plan: PlannerPlan) => {
                const results: PlannerStepRecord[] = [];
                for (const step of plan.steps) {
                        const input = step.input ?? {};
                        const result = await runWorker(options, plan.goal, step.capability, input);
                        const record = await persist(options, plan.goal, step.capability, result, input);
                        results.push(record);
                }
                return results;
        };
        return { executePlan, executeTask };
};
