import {
        PlannerGoalSchema,
        type Planner,
        type PlannerGoal,
        type PlannerPlan,
        type PlannerStepRecord,
        type WorkerRegistry,
} from './types.js';
import { type MemoryCoordinator } from './memory-adapter.js';
import { type WorkerRunner } from './worker-runner.js';

interface PlannerOptions {
        registry: WorkerRegistry;
        memory: MemoryCoordinator;
        runner: WorkerRunner;
}

const normalizeGoal = (goal: PlannerGoal): PlannerGoal => PlannerGoalSchema.parse(goal);

const selectInput = (goal: PlannerGoal, capability: string): Record<string, unknown> => {
        const tasks = goal.input && typeof goal.input === 'object' ? (goal.input.tasks as Record<string, unknown>) : undefined;
        if (tasks && typeof tasks === 'object' && capability in tasks) {
                const value = tasks[capability];
                if (value && typeof value === 'object') return value as Record<string, unknown>;
        }
        return (goal.input ?? {}) as Record<string, unknown>;
};

const buildSteps = (goal: PlannerGoal, registry: WorkerRegistry): PlannerStepRecord[] =>
        goal.requiredCapabilities.map((capability) => {
                const worker = registry.findByCapability(capability);
                if (!worker) {
                        throw new Error(
                                `brAInwav modern-agent-system: capability "${capability}" missing worker`,
                        );
                }
                return {
                        capability,
                        worker: worker.name,
                        status: 'pending' as const,
                        input: selectInput(goal, capability),
                } satisfies PlannerStepRecord;
        });

const preparePlan = async (
        goal: PlannerGoal,
        options: PlannerOptions,
): Promise<PlannerPlan> => {
        const steps = buildSteps(goal, options.registry);
        const { context } = await options.memory.loadState(goal);
        const plan: PlannerPlan = { goal, steps, retrievedContext: context };
        await options.memory.persistPlan(plan);
        return plan;
};

export const createPlanner = (options: PlannerOptions): Planner => {
        const prepare = async (rawGoal: PlannerGoal) => {
                const goal = normalizeGoal(rawGoal);
                return preparePlan(goal, options);
        };
        const run = async (rawGoal: PlannerGoal) => {
                const plan = await prepare(rawGoal);
                const steps = await options.runner.executePlan(plan);
                return { goal: plan.goal, steps, context: plan.retrievedContext };
        };
        return { prepare, run };
};
