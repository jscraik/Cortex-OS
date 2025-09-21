import { describe, expect, it } from 'vitest';
import {
	AgentScheduleSchema,
	ExecutionFeedbackSchema,
	ExecutionPlanSchema,
	ExecutionRequestSchema,
	ExecutionStatusSchema,
	StrategyAdjustmentSchema,
} from '../src/contracts/no-architecture-contracts.js';
import { BasicScheduler } from '../src/intelligence/basic-scheduler.js';

describe('BasicScheduler (contracts integration)', () => {
	it('creates a minimal valid execution plan from a simple request', async () => {
		const scheduler = new BasicScheduler();
		const request = ExecutionRequestSchema.parse({
			id: 'req-simple-1',
			description: 'demo-task',
			priority: 'medium',
			complexity: 0.4,
			timeoutMs: 5000,
			resourceLimits: { memoryMB: 256, cpuPercent: 50, timeoutMs: 5000 },
			constraints: { maxTokens: 512 },
		} as unknown);
		const plan = await scheduler.planExecution(request);
		const parsedPlan = ExecutionPlanSchema.parse(plan);
		expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(1);
	});

	it('uses StrategySelector to generate parallel steps when taskProfile favors parallelization', async () => {
		const scheduler = new BasicScheduler();
		const plan = await scheduler.planExecution(
			ExecutionRequestSchema.parse({
				id: 'req-complex-2',
				description: 'Complex, parallelizable task',
				priority: 'high',
				complexity: 0.9,
				timeoutMs: 5000,
				resourceLimits: { memoryMB: 512, cpuPercent: 70, timeoutMs: 5000 },
				constraints: { maxTokens: 1024, canParallelize: true, estimatedBranches: 4 },
				metadata: { dataSize: 100000 },
			} as unknown),
		);
		const parsedPlan = ExecutionPlanSchema.parse(plan);
		// Expect at least 3 parallel steps with no dependencies
		expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(3);
		expect(parsedPlan.steps.every((s) => s.dependencies.length === 0)).toBe(true);
	});

	it('falls back to sequential-safe plan with dependencies when not parallelizable', async () => {
		const scheduler = new BasicScheduler();
		const plan = await scheduler.planExecution(
			ExecutionRequestSchema.parse({
				id: 'req-seq-2',
				description: 'Simple task',
				priority: 'medium',
				complexity: 0.3,
				timeoutMs: 5000,
				resourceLimits: { memoryMB: 256, cpuPercent: 40, timeoutMs: 5000 },
				constraints: { maxTokens: 1024, canParallelize: false, estimatedBranches: 1 },
			} as unknown),
		);
		const parsedPlan = ExecutionPlanSchema.parse(plan);
		// Expect at least two steps with a dependency chain
		expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(2);
		const step2 = parsedPlan.steps.find((s) => s.id === 'step-2');
		expect(step2?.dependencies).toContain('step-1');
	});

	it('produces a hybrid plan with fan-out and merge and includes bounded metadata', async () => {
		const scheduler = new BasicScheduler();
		const plan = await scheduler.planExecution(
			ExecutionRequestSchema.parse({
				id: 'req-hybrid-2',
				description: 'Moderate complexity task',
				priority: 'medium',
				complexity: 0.6,
				timeoutMs: 3000,
				resourceLimits: { memoryMB: 512, cpuPercent: 60, timeoutMs: 3000 },
				constraints: { maxTokens: 2048, canParallelize: true, estimatedBranches: 2 },
				metadata: { dataSize: 100_000 },
			} as unknown),
		);
		const parsedPlan = ExecutionPlanSchema.parse(plan);
		// Expect N parallel branches and one merge step depending on all branches
		expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(3);
		const last = parsedPlan.steps[parsedPlan.steps.length - 1];
		expect(last.dependencies.length).toBeGreaterThanOrEqual(2);
		// resource allocation reflects bounded values
		expect(parsedPlan.resourceAllocation.timeoutMs).toBe(3000);
		expect(parsedPlan.resourceAllocation.cpuPercent).toBe(60);
		expect(parsedPlan.resourceAllocation.memoryMB).toBe(512);
	});

	it('schedules agents for the plan (round-robin minimal)', async () => {
		const scheduler = new BasicScheduler();
		const plan = await scheduler.planExecution(
			ExecutionRequestSchema.parse({
				id: 'req-plan-1',
				description: 'schedule test',
				priority: 'medium',
				complexity: 0.5,
				timeoutMs: 2000,
				resourceLimits: { memoryMB: 256, cpuPercent: 50, timeoutMs: 2000 },
				constraints: { maxTokens: 256 },
			} as unknown),
		);
		const schedule = await scheduler.scheduleAgents(plan, ['agent-a']);
		const parsedSchedule = AgentScheduleSchema.parse(schedule);
		expect(parsedSchedule.agents.length).toBeGreaterThanOrEqual(1);
		expect(parsedSchedule.agents[0].agentId).toBe('agent-a');
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
		// Build a valid schedule via planExecution + scheduleAgents
		const plan = await scheduler.planExecution(
			ExecutionRequestSchema.parse({
				id: 'req-monitor-1',
				description: 'monitor test',
				priority: 'medium',
				complexity: 0.4,
				timeoutMs: 1500,
				resourceLimits: { memoryMB: 128, cpuPercent: 30, timeoutMs: 1500 },
				constraints: { maxTokens: 128 },
			} as unknown),
		);
		const schedule = await scheduler.scheduleAgents(plan, ['a1']);
		const status = await scheduler.monitorExecution(schedule);
		const parsed = ExecutionStatusSchema.parse(status);
		expect(['pending', 'running', 'completed', 'failed', 'cancelled']).toContain(parsed.status);
	});
});
