import {
	AgentScheduleSchema,
	ExecutionFeedbackSchema,
	ExecutionPlanSchema,
	ExecutionRequestSchema,
	ExecutionStatusSchema,
	StrategyAdjustmentSchema,
} from '@cortex-os/contracts';
import { describe, expect, it } from 'vitest';
import { BasicScheduler } from '../src/intelligence/basic-scheduler.js';

describe('BasicScheduler (contracts integration)', () => {
	it('creates a minimal valid execution plan from a simple request', async () => {
		const scheduler = new BasicScheduler();
		const request = {
			task: 'demo-task',
			constraints: { timeoutMs: 5000, maxTokens: 512 },
		};
		// Validate input via contract
		const parsedReq = ExecutionRequestSchema.parse(request);
		const plan = await scheduler.planExecution(parsedReq);
		const parsedPlan = ExecutionPlanSchema.parse(plan);
		expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(1);
	});

	it('uses StrategySelector to generate parallel steps when taskProfile favors parallelization', async () => {
		const scheduler = new BasicScheduler();
		const request = {
			task: 'complex-task',
			constraints: { timeoutMs: 5000, maxTokens: 1024 },
			context: {
				taskProfile: {
					description: 'Complex, parallelizable task',
					complexity: 0.9,
					canParallelize: true,
					estimatedBranches: 4,
					dataSize: 100000,
				},
			},
		};
		const plan = await scheduler.planExecution(ExecutionRequestSchema.parse(request));
		const parsedPlan = ExecutionPlanSchema.parse(plan);
		// Expect at least 3 parallel steps with no dependencies
		expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(3);
		expect(
			parsedPlan.steps.every(
				(s: { id: string; name: string; dependsOn: string[] }) => s.dependsOn.length === 0,
			),
		).toBe(true);
	});

	it('falls back to sequential-safe plan with dependencies when not parallelizable', async () => {
		const scheduler = new BasicScheduler();
		const request = {
			task: 'sequential-task',
			constraints: { timeoutMs: 5000, maxTokens: 1024 },
			context: {
				taskProfile: {
					description: 'Simple task',
					complexity: 0.3,
					canParallelize: false,
					estimatedBranches: 1,
					dataSize: 1000,
				},
			},
		};
		const plan = await scheduler.planExecution(ExecutionRequestSchema.parse(request));
		const parsedPlan = ExecutionPlanSchema.parse(plan);
		// Expect at least two steps with a dependency chain
		expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(2);
		const step2 = parsedPlan.steps.find((s: { id: string }) => s.id === 'step-2');
		expect(step2?.dependsOn).toContain('step-1');
	});

	it('produces a hybrid plan with fan-out and merge and includes bounded metadata', async () => {
		const scheduler = new BasicScheduler();
		const request = {
			task: 'hybrid-task',
			constraints: { timeoutMs: 3000, maxTokens: 2048 },
			context: {
				taskProfile: {
					description: 'Moderate complexity with some branching and larger data',
					complexity: 0.6,
					canParallelize: true,
					estimatedBranches: 2,
					dataSize: 100_000,
				},
			},
		};
		const plan = await scheduler.planExecution(ExecutionRequestSchema.parse(request));
		const parsedPlan = ExecutionPlanSchema.parse(plan);
		// Expect N parallel branches and one merge step depending on all branches
		expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(3);
		const last = parsedPlan.steps[parsedPlan.steps.length - 1] as {
			id: string;
			dependsOn: string[];
		};
		expect(last.dependsOn.length).toBeGreaterThanOrEqual(2);
		// metadata bounds present
		expect(parsedPlan.metadata.bounds).toBeDefined();
		expect(parsedPlan.metadata.bounds?.timeoutMs).toBe(3000);
		expect(parsedPlan.metadata.bounds?.maxTokens).toBe(2048);
	});

	it('schedules agents for the plan (round-robin minimal)', async () => {
		const scheduler = new BasicScheduler();
		const plan = ExecutionPlanSchema.parse({
			id: 'plan-1',
			steps: [{ id: 'step-1', name: 'execute', dependsOn: [] }],
			metadata: { createdBy: 'test' },
		});
		const schedule = await scheduler.scheduleAgents(plan, ['agent-a']);
		const parsedSchedule = AgentScheduleSchema.parse(schedule);
		expect(parsedSchedule.assignments.length).toBe(1);
		expect(parsedSchedule.assignments[0].agentId).toBe('agent-a');
	});

	it('adapts strategy based on feedback', () => {
		const scheduler = new BasicScheduler();
		const feedback = ExecutionFeedbackSchema.parse({
			planId: 'plan-1',
			successRate: 0.4,
			notes: ['timeouts observed'],
		});
		const adj = scheduler.adaptStrategy(feedback);
		const parsedAdj = StrategyAdjustmentSchema.parse(adj);
		expect(parsedAdj.newStrategy).toBeTypeOf('string');
	});

	it('monitors execution and returns status', async () => {
		const scheduler = new BasicScheduler();
		const status = await scheduler.monitorExecution({
			planId: 'plan-1',
			assignments: [{ stepId: 's1', agentId: 'a1' }],
		});
		const parsed = ExecutionStatusSchema.parse(status);
		expect(parsed.state).toMatch(/planning|running|completed/);
	});
});
