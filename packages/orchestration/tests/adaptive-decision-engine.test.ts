import { ExecutionFeedbackSchema, StrategyAdjustmentSchema } from '@cortex-os/contracts';
import { describe, expect, it } from 'vitest';
import { AdaptiveDecisionEngine } from '../src/intelligence/adaptive-decision-engine.js';

describe('AdaptiveDecisionEngine', () => {
	it('adjusts to sequential-safe when successRate is low (<0.5)', () => {
		const engine = new AdaptiveDecisionEngine();
		const feedback = ExecutionFeedbackSchema.parse({
			planId: 'p1',
			successRate: 0.4,
			notes: ['timeouts observed'],
		});
		const adj = engine.adaptStrategy(feedback);
		const parsed = StrategyAdjustmentSchema.parse(adj);
		expect(parsed.newStrategy).toBe('sequential-safe');
	});

	it('adjusts to hybrid when successRate is moderate (>=0.5 and <0.8)', () => {
		const engine = new AdaptiveDecisionEngine();
		const feedback = ExecutionFeedbackSchema.parse({
			planId: 'p2',
			successRate: 0.6,
			notes: ['mixed outcomes'],
		});
		const adj = engine.adaptStrategy(feedback);
		const parsed = StrategyAdjustmentSchema.parse(adj);
		expect(parsed.newStrategy).toBe('hybrid');
	});

	it('adjusts to parallel-coordinated when successRate is high (>=0.8)', () => {
		const engine = new AdaptiveDecisionEngine();
		const feedback = ExecutionFeedbackSchema.parse({
			planId: 'p3',
			successRate: 0.85,
			notes: ['great performance'],
		});
		const adj = engine.adaptStrategy(feedback);
		const parsed = StrategyAdjustmentSchema.parse(adj);
		expect(parsed.newStrategy).toBe('parallel-coordinated');
	});
});
