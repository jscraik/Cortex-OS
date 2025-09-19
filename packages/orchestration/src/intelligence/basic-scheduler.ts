import {
	AdaptationResultSchema,
	AgentScheduleSchema,
	EnvironmentChangeSchema,
	ExecutionOutcomeSchema,
	ExecutionPlanSchema,
	ExecutionRequestSchema,
	ExecutionStatusSchema,
	LearningUpdateSchema,
	ObjectiveSchema,
	OptimizationResultSchema,
	PerformancePredictionSchema,
} from '../../../libs/typescript/contracts/src/orchestration-no/intelligence-scheduler.js';
import type { OrchestrationBus } from '../events/orchestration-bus.js';
import { OrchestrationEventTypes } from '../events/orchestration-bus.js';
import { withEnhancedSpan } from '../observability/otel.js';
import { AdaptiveDecisionEngine } from './adaptive-decision-engine.js';
import { ExecutionPlanner } from './execution-planner.js';
import { ResourceManager } from './resource-manager.js';
import { StrategySelector, type TaskProfile } from './strategy-selector.js';

export class BasicScheduler {
	private readonly selector = new StrategySelector();
	private readonly bus?: OrchestrationBus;

	constructor(opts?: { bus?: OrchestrationBus }) {
		this.bus = opts?.bus;
	}

	async planExecution(request: unknown) {
		const req = ExecutionRequestSchema.parse(request);
		return withEnhancedSpan(
			'scheduler.planExecution',
			async () => {
				// If a workflow is provided, use ExecutionPlanner to build the plan DAG
				const ctx: { workflow?: unknown } = (req.context as Record<string, unknown>) ?? {};
				if (ctx.workflow) {
					const planner = new ExecutionPlanner();
					const plan = await planner.createPlanFromWorkflow(ctx.workflow);
					// publish plan created event if bus exists
					if (this.bus) {
						await this.bus.publish(OrchestrationEventTypes.PlanCreated, {
							planId: plan.id,
							summary: `Plan for ${req.task}`,
							steps: plan.steps.map((s: { id: string }) => s.id),
						});
					}
					return plan;
				}

				// Otherwise, build a plan based on strategy selection
				const profile = this.buildTaskProfile(req.context);
				const strategy = this.selector.selectStrategy(profile);

				let steps: Array<{ id: string; name: string; dependsOn: string[] }> = [];
				switch (strategy) {
					case 'parallel-coordinated': {
						const branchCount = Math.max(3, Math.min(5, profile.estimatedBranches || 3));
						steps = Array.from({ length: branchCount }).map((_, i) => ({
							id: `step-${i + 1}`,
							name: `${req.task} (part ${i + 1})`,
							dependsOn: [],
						}));
						break;
					}
					case 'hybrid': {
						const fanOut = Math.max(2, Math.min(4, profile.estimatedBranches || 2));
						const parallelSteps = Array.from({ length: fanOut }).map((_, i) => ({
							id: `step-${i + 1}`,
							name: `${req.task} (branch ${i + 1})`,
							dependsOn: [],
						}));
						const mergeStep = {
							id: `step-${fanOut + 1}`,
							name: `${req.task} (merge results)`,
							dependsOn: parallelSteps.map((s) => s.id),
						};
						steps = [...parallelSteps, mergeStep];
						break;
					}
					default: {
						steps = [
							{ id: 'step-1', name: `${req.task} (phase 1)`, dependsOn: [] },
							{ id: 'step-2', name: `${req.task} (phase 2)`, dependsOn: ['step-1'] },
						];
					}
				}

				const timeoutMs = req.constraints.timeoutMs;
				const maxTokens = req.constraints.maxTokens;
				const plan = {
					id: `plan-${Date.now()}`,
					steps,
					metadata: {
						createdBy: 'basic-scheduler',
						strategy,
						bounds: { timeoutMs, maxTokens },
					},
				};
				const parsed = ExecutionPlanSchema.parse(plan);
				if (this.bus) {
					await this.bus.publish(OrchestrationEventTypes.PlanCreated, {
						planId: parsed.id,
						summary: `Plan for ${req.task}`,
						steps: parsed.steps.map((s: { id: string }) => s.id),
					});
				}
				return parsed;
			},
			{
				workflowName: 'basic-scheduler',
				stepKind: 'planning',
				phase: 'planExecution',
			},
		);
	}

	async scheduleAgents(plan: unknown, agents: string[]) {
		const p = ExecutionPlanSchema.parse(plan);
		let pool = agents;
		if (pool.length === 0) {
			const rm = new ResourceManager();
			const allocation = await rm.allocateResources(p);
			pool = allocation.agents;
			if (this.bus) {
				await this.bus.publish(OrchestrationEventTypes.ResourceAllocated, {
					resourceId: 'agent-pool',
					taskId: p.id,
					amount: pool.length,
					unit: 'agents',
				});
			}
		}
		const assignments = p.steps.map((s: { id: string }, idx: number) => ({
			stepId: s.id,
			agentId: pool[idx % pool.length],
		}));
		return AgentScheduleSchema.parse({ planId: p.id, assignments });
	}

	adaptStrategy(feedback: unknown) {
		// Delegate to AdaptiveDecisionEngine (which performs contract validation)
		const engine = new AdaptiveDecisionEngine();
		const adjustment = engine.adaptStrategy(feedback);
		if (this.bus) {
			// best-effort decision event
			void this.bus.publish(OrchestrationEventTypes.DecisionMade, {
				decisionId: `decision-${Date.now()}`,
				outcome: `newStrategy=${adjustment.newStrategy}`,
			});
		}
		return adjustment;
	}

	async monitorExecution(_schedule: unknown) {
		// For now, just return a running status
		return ExecutionStatusSchema.parse({ planId: 'unknown', state: 'running' });
	}

	/**
	 * End-to-end convenience: plan -> schedule -> monitor -> adapt
	 * Returns a minimal integration result for tests.
	 */
	async execute(request: unknown, agents: string[] = []) {
		// Plan
		const plan = await this.planExecution(request);

		// Schedule
		const schedule = await this.scheduleAgents(plan, agents);

		// Publish coordination started event if a bus is available
		if (this.bus) {
			await this.bus.publish(OrchestrationEventTypes.CoordinationStarted, {
				strategy: 'sequential-safe',
				runId: String(schedule.planId),
				participants: agents,
			});
		}

		// Monitor (stubbed running)
		const status = await this.monitorExecution(schedule);

		// Adapt a strategy based on a simple synthetic feedback for now
		const feedback = {
			planId: schedule.planId,
			successRate: 0.9,
			notes: ['integration-execute synthetic feedback'],
		} as unknown;
		const adjustment = this.adaptStrategy(feedback);

		return {
			success: true,
			plan,
			schedule,
			status,
			adjustment,
		};
	}

	private buildTaskProfile(context: unknown): TaskProfile {
		const ctx: Record<string, unknown> = (context as Record<string, unknown>) || {};
		const provided = (ctx.taskProfile || {}) as Partial<TaskProfile>;
		// Simple heuristic defaults if not provided
		const defaults: TaskProfile = {
			description: typeof ctx.description === 'string' ? ctx.description : 'generic task',
			complexity: typeof provided.complexity === 'number' ? provided.complexity : 0.4,
			canParallelize:
				typeof provided.canParallelize === 'boolean' ? provided.canParallelize : false,
			estimatedBranches:
				typeof provided.estimatedBranches === 'number' ? provided.estimatedBranches : 1,
			dataSize: typeof provided.dataSize === 'number' ? provided.dataSize : 1000,
		};
		return defaults;
	}
}

// --- Advanced capabilities (nO plan) ---
export interface IntelligenceSchedulerAdvanced {
	optimizeMultiObjective(objectives: unknown[]): unknown;
	predictPerformance(plan: unknown): unknown;
	learnFromOutcomes(outcomes: unknown[]): unknown;
	adaptToEnvironmentChanges(changes: unknown[]): unknown;
}

// Provide minimal implementations with contract validation and simple heuristics
BasicScheduler.prototype.optimizeMultiObjective = (objectives: unknown[]) => {
	const objs = objectives.map((o) => ObjectiveSchema.parse(o));
	const avgWeight = objs.length ? objs.reduce((s, o) => s + (o.weight ?? 0), 0) / objs.length : 0;
	const score = Math.max(0, Math.min(1, 0.6 + (avgWeight - 0.2)));
	return OptimizationResultSchema.parse({
		score,
		tradeoffs: objs.map((o) => `opt:${o.type}`),
		recommendedStrategy:
			score > 0.75 ? 'parallel-coordinated' : score > 0.55 ? 'hybrid' : 'sequential-safe',
		notes: ['heuristic optimization'],
	});
};

BasicScheduler.prototype.predictPerformance = (plan: unknown) => {
	const p = ExecutionPlanSchema.parse(plan) as { steps: Array<unknown> };
	const predictedDurationMs = p.steps.length * 1000;
	const successProbability = Math.max(0.5, 1 - p.steps.length * 0.05);
	return PerformancePredictionSchema.parse({
		predictedDurationMs,
		predictedCost: p.steps.length * 0.01,
		successProbability,
		riskFactors: successProbability < 0.7 ? ['complexity'] : [],
	});
};

BasicScheduler.prototype.learnFromOutcomes = (outcomes: unknown[]) => {
	const outs = outcomes.map((o) => ExecutionOutcomeSchema.parse(o));
	const successRate = outs.length ? outs.filter((o) => o.success).length / outs.length : 0;
	const adjustments = [successRate < 0.5 ? 'tighten-checkpoints' : 'increase-parallelism'];
	return LearningUpdateSchema.parse({
		adjustments,
		newHeuristics: [],
		confidence: Math.min(1, successRate + 0.2),
	});
};

BasicScheduler.prototype.adaptToEnvironmentChanges = (changes: unknown[]) => {
	const ch = changes.map((c) => EnvironmentChangeSchema.parse(c));
	const actions = ch.map((c) => `handle:${c.type}`);
	return AdaptationResultSchema.parse({
		actions,
		newConfig: {},
		rationale: 'reactive adjustments',
	});
};
