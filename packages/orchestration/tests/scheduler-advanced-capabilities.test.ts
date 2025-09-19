import { describe, expect, it } from 'vitest';
import {
	AdaptationResultSchema,
	EnvironmentChangeSchema,
	ExecutionOutcomeSchema,
	ExecutionPlanSchema,
	LearningUpdateSchema,
	ObjectiveSchema,
	OptimizationResultSchema,
	PerformancePredictionSchema,
} from '../../libs/typescript/contracts/src/orchestration-no/intelligence-scheduler';
import {
	BasicScheduler,
	type IntelligenceSchedulerAdvanced,
} from '../src/intelligence/basic-scheduler.js';

describe('BasicScheduler – advanced capabilities', () => {
	it('optimizeMultiObjective returns contract-valid optimization result with sensible strategy', () => {
		const scheduler = new BasicScheduler();
		const objectives = [
			ObjectiveSchema.parse({ type: 'performance', weight: 0.9 }),
			ObjectiveSchema.parse({ type: 'cost', weight: 0.2 }),
			ObjectiveSchema.parse({ type: 'reliability', weight: 0.7 }),
		];

		const advanced = scheduler as unknown as IntelligenceSchedulerAdvanced;
		const result = advanced.optimizeMultiObjective(objectives);
		const parsed = OptimizationResultSchema.parse(result);

		expect(parsed.score).toBeGreaterThanOrEqual(0);
		expect(parsed.score).toBeLessThanOrEqual(1);
		expect(parsed.tradeoffs).toEqual(
			expect.arrayContaining(['opt:performance', 'opt:cost', 'opt:reliability']),
		);
		expect(['parallel-coordinated', 'sequential-safe', 'hybrid']).toContain(
			parsed.recommendedStrategy,
		);
	});

	it('predictPerformance estimates duration, cost, and success probability from plan size', () => {
		const scheduler = new BasicScheduler();
		const plan = ExecutionPlanSchema.parse({
			id: 'plan-adv-1',
			steps: [
				{ id: 's1', name: 'step 1', dependsOn: [] },
				{ id: 's2', name: 'step 2', dependsOn: ['s1'] },
				{ id: 's3', name: 'step 3', dependsOn: ['s2'] },
			],
			metadata: { createdBy: 'test' },
		});

		const advanced = scheduler as unknown as IntelligenceSchedulerAdvanced;
		const prediction = advanced.predictPerformance(plan);
		const parsed = PerformancePredictionSchema.parse(prediction);

		expect(parsed.predictedDurationMs).toBe(3000);
		expect(parsed.predictedCost).toBeCloseTo(0.03, 6);
		expect(parsed.successProbability).toBeGreaterThanOrEqual(0);
		expect(parsed.successProbability).toBeLessThanOrEqual(1);
		if (parsed.successProbability < 0.7) {
			expect(parsed.riskFactors).toContain('complexity');
		}
	});

	it('learnFromOutcomes produces adjustments based on success rate (low success)', () => {
		const scheduler = new BasicScheduler();
		const outcomes = [
			ExecutionOutcomeSchema.parse({ stepId: 's1', success: false }),
			ExecutionOutcomeSchema.parse({ stepId: 's2', success: false }),
			ExecutionOutcomeSchema.parse({ stepId: 's3', success: true }),
		];

		const advanced = scheduler as unknown as IntelligenceSchedulerAdvanced;
		const update = advanced.learnFromOutcomes(outcomes);
		const parsed = LearningUpdateSchema.parse(update);
		expect(parsed.adjustments).toContain('tighten-checkpoints');
		expect(parsed.confidence).toBeGreaterThanOrEqual(0);
		expect(parsed.confidence).toBeLessThanOrEqual(1);
	});

	it('learnFromOutcomes produces adjustments based on success rate (high success)', () => {
		const scheduler = new BasicScheduler();
		const outcomes = [
			ExecutionOutcomeSchema.parse({ stepId: 's1', success: true }),
			ExecutionOutcomeSchema.parse({ stepId: 's2', success: true }),
			ExecutionOutcomeSchema.parse({ stepId: 's3', success: false }),
		];

		const advanced = scheduler as unknown as IntelligenceSchedulerAdvanced;
		const update = advanced.learnFromOutcomes(outcomes);
		const parsed = LearningUpdateSchema.parse(update);
		expect(parsed.adjustments).toContain('increase-parallelism');
		expect(parsed.confidence).toBeGreaterThanOrEqual(0);
		expect(parsed.confidence).toBeLessThanOrEqual(1);
	});

	it('adaptToEnvironmentChanges yields contract-valid actions for environment events', () => {
		const scheduler = new BasicScheduler();
		const changes = [
			EnvironmentChangeSchema.parse({ type: 'resources', details: { available: 2 } }),
			EnvironmentChangeSchema.parse({ type: 'latency', details: { region: 'eu-west' } }),
			EnvironmentChangeSchema.parse({ type: 'policy', details: { rule: 'no-secrets' } }),
		];

		const advanced = scheduler as unknown as IntelligenceSchedulerAdvanced;
		const result = advanced.adaptToEnvironmentChanges(changes);
		const parsed = AdaptationResultSchema.parse(result);
		expect(parsed.actions).toEqual(
			expect.arrayContaining(['handle:resources', 'handle:latency', 'handle:policy']),
		);
		expect(parsed.rationale).toMatch(/.+/);
	});
});
