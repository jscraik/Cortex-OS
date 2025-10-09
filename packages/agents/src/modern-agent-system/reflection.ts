import type {
	PlannerExecutionResult,
	PlannerGoal,
	PlannerPlan,
	ReflectionContext,
	ReflectionModule,
	ReflectionOutcome,
} from './types.js';

const nowIso = () => new Date().toISOString();

const summarizeStep = (result: PlannerExecutionResult) => {
	const completed = result.steps.filter((step) => step.status === 'completed');
	const failed = result.steps.filter((step) => step.status === 'failed');
	return {
		total: result.steps.length,
		completed: completed.length,
		failed: failed.length,
	};
};

const buildSummary = (goal: PlannerGoal, execution: PlannerExecutionResult) => {
	const stats = summarizeStep(execution);
	if (stats.failed > 0) {
		return `Reflection on "${goal.objective}": ${stats.failed} step(s) failed, ${stats.completed} completed.`;
	}
	return `Reflection on "${goal.objective}": all ${stats.completed} step(s) completed successfully.`;
};

const inferImprovements = (_plan: PlannerPlan, execution: PlannerExecutionResult): string[] => {
	const improvements: string[] = [];
	for (const step of execution.steps) {
		if (step.status === 'failed') {
			improvements.push(
				`Retry capability "${step.capability}" with revised input (previous error: ${step.error ?? 'unknown'})`,
			);
		}
	}

	if (
		execution.reasoning.strategy === 'tree-of-thought' &&
		execution.reasoning.alternatives?.length
	) {
		const alt = execution.reasoning.alternatives[0];
		improvements.push(`Explore alternative branch: ${alt.summary}`);
	}

	if (improvements.length === 0) {
		improvements.push('Leverage retrieved context to enhance final deliverable.');
	}

	return improvements;
};

const needsRetry = (execution: PlannerExecutionResult): boolean =>
	execution.steps.some((step) => step.status === 'failed');

const deriveNextGoal = (
	goal: PlannerGoal,
	_plan: PlannerPlan,
	execution: PlannerExecutionResult,
): PlannerGoal | undefined => {
	if (!needsRetry(execution)) return undefined;
	const failed = execution.steps.find((step) => step.status === 'failed');
	if (!failed) return undefined;
	const updatedCapabilities = [
		failed.capability,
		...goal.requiredCapabilities.filter((cap) => cap !== failed.capability),
	];
	return {
		...goal,
		requiredCapabilities: updatedCapabilities,
		strategy: 'chain-of-thought',
	} satisfies PlannerGoal;
};

const reflect = async (context: ReflectionContext): Promise<ReflectionOutcome> => {
	const summary = buildSummary(context.goal, context.lastResult);
	const improvements = inferImprovements(context.plan, context.lastResult);
	const retry = needsRetry(context.lastResult);
	const nextGoal = deriveNextGoal(context.goal, context.plan, context.lastResult);

	return {
		feedback: {
			summary,
			improvements,
			status: retry ? 'retry' : 'accepted',
			createdAt: nowIso(),
		},
		nextGoal,
	} satisfies ReflectionOutcome;
};

export const createReflectionModule = (): ReflectionModule => ({ reflect });

export const applyReflection = async (options: {
	reflection: ReflectionModule;
	context: ReflectionContext;
}): Promise<ReflectionOutcome> => {
	return options.reflection.reflect(options.context);
};
