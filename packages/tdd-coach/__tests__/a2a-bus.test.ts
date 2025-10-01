import { createEnvelope } from '@cortex-os/a2a-contracts';
import { describe, expect, it } from 'vitest';
import { createTddCoachBus } from '../src/a2a.js';
import { createTddCoachEvent, TDD_COACH_EVENT_SOURCE } from '../src/events/tdd-coach-events.js';

describe('TDD Coach A2A bus integration', () => {
	it('publishes TDD cycle events with schema validation', async () => {
		const { bus, schemaRegistry } = createTddCoachBus();
		const seen: unknown[] = [];

		await bus.bind([
			{
				type: 'tdd_coach.test.written',
				handle: async (envelope) => {
					seen.push(envelope.data);
				},
			},
		]);

		const payload = {
			cycleId: 'cycle-001',
			testId: 'test-123',
			testFile: 'tests/example.test.ts',
			testName: 'should guide developers',
			description: 'ensures the AI suggests tests first',
			complexity: 'medium' as const,
			writtenAt: new Date('2024-01-02T00:00:00Z').toISOString(),
		};

		await bus.publish(createTddCoachEvent.testWritten(payload));

		expect(seen).toHaveLength(1);
		expect(seen[0]).toMatchObject(payload);
		const validation = schemaRegistry.validate('tdd_coach.test.written', seen[0]);
		expect(validation.valid).toBe(true);
	});

	it('rejects invalid TDD coach events', async () => {
		const { bus } = createTddCoachBus();

		await expect(
			bus.publish(
				createEnvelope({
					type: 'tdd_coach.test.written',
					source: TDD_COACH_EVENT_SOURCE,
					data: { cycleId: 'cycle-002' },
				}),
			),
		).rejects.toThrow(/Schema validation failed/);
	});
});
