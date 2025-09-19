import { ExecutionPlanSchema, ExecutionRequestSchema } from '@cortex-os/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
	createOrchestrationBus,
	OrchestrationEventTypes,
} from '../src/events/orchestration-bus.js';
import type {
	CoordinationStartedEvent,
	PlanCreatedEvent,
	ResourceAllocatedEvent,
} from '../src/events/orchestration-events.js';
import { BasicScheduler } from '../src/intelligence/basic-scheduler.js';

describe('BasicScheduler + OrchestrationBus integration', () => {
	it('emits PlanCreated when planning (strategy-based)', async () => {
		const bus = createOrchestrationBus();
		const handler = vi.fn();
		await bus.bind([
			{
				type: OrchestrationEventTypes.PlanCreated,
				handle: async (evt) => {
					const d = evt.data as PlanCreatedEvent;
					handler(d.planId, (d.steps ?? []).length);
				},
			},
		]);

		const scheduler = new BasicScheduler({ bus });
		const request = ExecutionRequestSchema.parse({
			task: 'emit-plan',
			constraints: { timeoutMs: 2000, maxTokens: 256 },
			context: {
				taskProfile: {
					description: 'p',
					complexity: 0.2,
					canParallelize: false,
					estimatedBranches: 1,
					dataSize: 100,
				},
			},
		});

		const plan = await scheduler.planExecution(request);
		const parsedPlan = ExecutionPlanSchema.parse(plan);
		expect(parsedPlan.id).toBeTruthy();
		// event called once with planId and steps count
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(parsedPlan.id, parsedPlan.steps.length);
	});

	it('emits PlanCreated when planning from workflow via ExecutionPlanner', async () => {
		const bus = createOrchestrationBus();
		const handler = vi.fn();
		await bus.bind([
			{
				type: OrchestrationEventTypes.PlanCreated,
				handle: async (evt) => {
					const d = evt.data as PlanCreatedEvent;
					handler(d.planId, (d.steps ?? []).length);
				},
			},
		]);

		const scheduler = new BasicScheduler({ bus });
		const request = ExecutionRequestSchema.parse({
			task: 'wf-plan',
			constraints: { timeoutMs: 2000, maxTokens: 256 },
			context: {
				// Provide a contract-valid workflow matching workflowZ schema
				workflow: {
					id: '00000000-0000-0000-0000-00000000a001',
					name: 'bus-wf',
					version: '1',
					entry: 's1',
					steps: {
						s1: { id: 's1', name: 'S1', kind: 'agent', next: 's2' },
						s2: { id: 's2', name: 'S2', kind: 'agent' },
					},
				},
			},
		});

		const plan = await scheduler.planExecution(request);
		const parsedPlan = ExecutionPlanSchema.parse(plan);
		expect(parsedPlan.steps.length).toBe(2);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(parsedPlan.id, 2);
	});

	it('emits ResourceAllocated and CoordinationStarted during execute()', async () => {
		const bus = createOrchestrationBus();
		const onResource = vi.fn();
		const onCoord = vi.fn();
		await bus.bind([
			{
				type: OrchestrationEventTypes.ResourceAllocated,
				handle: async (evt) => {
					const d = evt.data as ResourceAllocatedEvent;
					onResource(d.resourceId, d.amount ?? 0);
				},
			},
			{
				type: OrchestrationEventTypes.CoordinationStarted,
				handle: async (evt) => {
					const d = evt.data as CoordinationStartedEvent;
					onCoord(d.runId, d.strategy);
				},
			},
		]);

		const scheduler = new BasicScheduler({ bus });
		const result = await scheduler.execute(
			ExecutionRequestSchema.parse({
				task: 'exec',
				constraints: { timeoutMs: 1500, maxTokens: 128 },
			}),
			[],
		);

		expect(result.success).toBe(true);
		expect(onResource).toHaveBeenCalled();
		expect(onCoord).toHaveBeenCalled();
	});
});
