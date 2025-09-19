import { describe, expect, it } from 'vitest';
// Intentionally import from the package index once implemented
import {
	AgentScheduleSchema,
	ExecutionFeedbackSchema,
	ExecutionPlanSchema,
	ExecutionRequestSchema,
	ExecutionStatusSchema,
	IntelligenceSchedulerSchema,
	StrategyAdjustmentSchema,
} from '../src/orchestration-no/intelligence-scheduler.js';

describe('contract: IntelligenceScheduler', () => {
	it('defines planning and monitoring schemas', () => {
		// Minimal valid shapes (will fail until schemas exist)
		const req = { task: 'demo', constraints: { timeoutMs: 1000 } };
		const plan = { id: 'plan-1', steps: [], metadata: { createdBy: 'test' } };
		const schedule = { planId: 'plan-1', assignments: [] };
		const feedback = { planId: 'plan-1', successRate: 1, notes: [] };
		const status = { planId: 'plan-1', state: 'idle' };

		expect(() => ExecutionRequestSchema.parse(req)).toThrow();
		expect(() => ExecutionPlanSchema.parse(plan)).toThrow();
		expect(() => AgentScheduleSchema.parse(schedule)).toThrow();
		expect(() => ExecutionFeedbackSchema.parse(feedback)).toThrow();
		expect(() => ExecutionStatusSchema.parse(status)).toThrow();
		expect(IntelligenceSchedulerSchema).toBeDefined();
		expect(StrategyAdjustmentSchema).toBeDefined();
	});
});
