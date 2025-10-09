import type { MemoryCoordinator } from './memory-adapter.js';
import {
	type Planner,
	type PlannerGoal,
	PlannerGoalSchema,
	type PlannerPlan,
	type PlannerReasoning,
	type PlannerStepRecord,
	type PlannerStrategy,
	type WorkerRegistry,
} from './types.js';
import type { WorkerRunner } from './worker-runner.js';

interface PlannerOptions {
	registry: WorkerRegistry;
	memory: MemoryCoordinator;
	runner: WorkerRunner;
}

const normalizeGoal = (goal: PlannerGoal): PlannerGoal => PlannerGoalSchema.parse(goal);

const normalizeWeights = (weights: Record<string, number>): Record<string, number> => {
	const entries = Object.entries(weights);
	if (entries.length === 0) return {};
	const total = entries.reduce((acc, [, value]) => acc + value, 0);
	if (total <= 0) return {};
	return entries.reduce<Record<string, number>>((acc, [key, value]) => {
		acc[key] = Number((value / total).toFixed(4));
		return acc;
	}, {});
};

const PROVIDER_VENDOR_WEIGHTS: Record<string, Record<string, number>> = Object.freeze({
	anthropic: Object.freeze(
		normalizeWeights({
			'claude-3-5-sonnet': 0.62,
			'claude-3-5-haiku': 0.38,
		}),
	),
});

const deriveVendorWeighting = (goal: PlannerGoal): Record<string, number> | undefined => {
	if (!goal.input || typeof goal.input !== 'object') return undefined;
	const provider = (goal.input as { provider?: unknown }).provider;
	if (typeof provider !== 'string') return undefined;
	const weights = PROVIDER_VENDOR_WEIGHTS[provider];
	if (!weights) return undefined;
	return { ...weights };
};

const selectInput = (goal: PlannerGoal, capability: string): Record<string, unknown> => {
	const tasks =
		goal.input && typeof goal.input === 'object'
			? (goal.input.tasks as Record<string, unknown>)
			: undefined;
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
			throw new Error(`brAInwav modern-agent-system: capability "${capability}" missing worker`);
		}
		return {
			capability,
			worker: worker.name,
			status: 'pending' as const,
			input: selectInput(goal, capability),
		} satisfies PlannerStepRecord;
	});

const determineStrategy = (goal: PlannerGoal, steps: PlannerStepRecord[]): PlannerStrategy => {
	if (goal.strategy === 'tree-of-thought') return 'tree-of-thought';
	if (steps.length > 3) return 'tree-of-thought';
	return 'chain-of-thought';
};

const buildChainReasoning = (
	goal: PlannerGoal,
	steps: PlannerStepRecord[],
	vendorWeighting?: Record<string, number>,
): PlannerReasoning => {
	const thoughts = steps.map((step, index) => ({
		id: `thought-${index + 1}`,
		capability: step.capability,
		text: `Thought ${index + 1}: Deploy capability "${step.capability}" to progress "${goal.objective}".`,
	}));
	const reasoning: PlannerReasoning = {
		strategy: 'chain-of-thought',
		thoughts,
		decision: `Execute ${steps.length} step plan to accomplish "${goal.objective}".`,
	};
	if (vendorWeighting) {
		reasoning.vendorWeighting = vendorWeighting;
	}
	return reasoning;
};

const buildTreeAlternatives = (
	steps: PlannerStepRecord[],
): { path: string[]; summary: string; score: number }[] => {
	if (steps.length === 0) return [];
	const ordered = steps.map((step) => step.capability);
	const reversed = [...ordered].reverse();
	const alternatives = [
		{
			path: ordered,
			summary: `Primary path emphasising ${ordered.join(' → ')}`,
			score: 0.7,
		},
	];
	if (reversed.join('|') !== ordered.join('|')) {
		alternatives.push({
			path: reversed,
			summary: `Alternate branch exploring ${reversed.join(' → ')}`,
			score: 0.5,
		});
	}
	return alternatives;
};

const buildTreeReasoning = (
	goal: PlannerGoal,
	steps: PlannerStepRecord[],
	vendorWeighting?: Record<string, number>,
): PlannerReasoning => {
	const thoughts = steps.map((step, index) => ({
		id: `branch-${index + 1}`,
		capability: step.capability,
		text: `Branch ${index + 1}: Evaluate outcomes if "${step.capability}" leads the sequence for "${goal.objective}".`,
	}));
	const alternatives = buildTreeAlternatives(steps).map((alt, index) => ({
		path: alt.path,
		summary: alt.summary,
		score: Math.min(1, Math.max(0, alt.score - index * 0.1)),
	}));
	const reasoning: PlannerReasoning = {
		strategy: 'tree-of-thought',
		thoughts,
		decision: `Prioritise branch ${alternatives[0]?.path.join(' → ') ?? ''} while monitoring alternatives`,
		alternatives,
	};
	if (vendorWeighting) {
		reasoning.vendorWeighting = vendorWeighting;
	}
	return reasoning;
};

const createReasoning = (goal: PlannerGoal, steps: PlannerStepRecord[]): PlannerReasoning => {
	const strategy = determineStrategy(goal, steps);
	const vendorWeighting = deriveVendorWeighting(goal);
	return strategy === 'tree-of-thought'
		? buildTreeReasoning(goal, steps, vendorWeighting)
		: buildChainReasoning(goal, steps, vendorWeighting);
};

const preparePlan = async (goal: PlannerGoal, options: PlannerOptions): Promise<PlannerPlan> => {
	const steps = buildSteps(goal, options.registry);
	const { context } = await options.memory.loadState(goal);
	const reasoning = createReasoning(goal, steps);
	const plan: PlannerPlan = { goal, steps, retrievedContext: context, reasoning };
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
		return { goal: plan.goal, steps, context: plan.retrievedContext, reasoning: plan.reasoning };
	};
	return { prepare, run };
};
