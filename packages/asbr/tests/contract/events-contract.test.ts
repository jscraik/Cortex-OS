import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { createTask } from '../../src/lib/create-task.js';
import { emitPlanStarted } from '../../src/lib/emit-plan-started.js';
import {
	type Event,
	EventSchema,
	type TaskInput,
} from '../../src/types/index.js';

/** Build a minimal valid event */
function baseEvent(type: Event['type'], extra: Partial<Event> = {}): Event {
	return {
		id: uuidv4(),
		type,
		taskId: uuidv4(),
		timestamp: new Date().toISOString(),
		...extra,
	};
}

describe('ASBR Event Contract', () => {
	const allTypes: Event['type'][] = [
		'PlanStarted',
		'StepCompleted',
		'AwaitingApproval',
		'Canceled',
		'Resumed',
		'DeliverableReady',
		'Failed',
	];

	it('validates each event type round-trip via schema', () => {
		for (const t of allTypes) {
			const evt = baseEvent(
				t,
				t === 'StepCompleted' ? { step: 'initialize' } : {},
			);
			const parsed = EventSchema.parse(evt);
			expect(parsed.type).toBe(t);
			expect(parsed).toMatchObject(evt);
		}
	});

	it('rejects unknown event types', () => {
		const unknown = EventSchema.safeParse({
			...baseEvent('PlanStarted'),
			type: 'Unknown',
		});
		expect(unknown.success).toBe(false);
	});

	it('rejects invalid timestamp', () => {
		const invalid = EventSchema.safeParse({
			...baseEvent('PlanStarted'),
			timestamp: 'not-a-date',
		});
		expect(invalid.success).toBe(false);
	});

	it('emitPlanStarted produces a schema-valid event', async () => {
		const task = createTask();
		const input: TaskInput = {
			title: 'Example Task',
			brief: 'Brief',
			inputs: [],
			scopes: ['demo'],
			schema: 'cortex.task.input@1',
		} as TaskInput; // explicit for clarity
		const collected: Event[] = [];
		await emitPlanStarted(
			async (ev: Event) => {
				collected.push(ev);
			},
			task,
			input,
		);
		expect(collected).toHaveLength(1);
		const parsed = EventSchema.parse(collected[0]);
		expect(parsed.type).toBe('PlanStarted');
		expect(parsed.ariaLiveHint).toContain('Task');
	});

	it('fails validation when id is not a uuid', () => {
		const invalid = EventSchema.safeParse({
			...baseEvent('Failed'),
			id: '123',
		});
		expect(invalid.success).toBe(false);
	});

	it('fails validation when taskId is missing', () => {
		const invalidShape = { ...baseEvent('Canceled') };
		delete (invalidShape as any).taskId; // Actually remove the property at runtime
		const invalid = EventSchema.safeParse(invalidShape as unknown as Event);
		expect(invalid.success).toBe(false);
	});

	it('allows optional data and ariaLiveHint', () => {
		const evt = baseEvent('DeliverableReady', {
			ariaLiveHint: 'ready',
			data: { foo: 'bar' },
		});
		const parsed = EventSchema.parse(evt);
		expect(parsed.data?.foo).toBe('bar');
	});

	it('rejects non-object data', () => {
		const invalid = EventSchema.safeParse({
			...baseEvent('Resumed'),
			data: 123,
		});
		expect(invalid.success).toBe(false);
	});
});
