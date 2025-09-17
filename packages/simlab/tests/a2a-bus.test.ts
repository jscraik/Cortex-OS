import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import { describe, expect, it } from 'vitest';
import { createSimlabBus } from '../src/a2a.js';
import {
	createSimLabEvent,
	SIMLAB_EVENT_SOURCE,
} from '../src/events/simlab-events.js';

const baseSimulation = {
	simulationId: 'sim-001',
	name: 'AI Safety Drill',
	type: 'agent' as const,
	parameters: { scenario: 'safety-check' },
	duration: 120,
	startedBy: 'tester',
	startedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
};

describe('SimLab A2A bus integration', () => {
	it('delivers simulation started events to subscribers', async () => {
		const { bus, schemaRegistry } = createSimlabBus();
		const received: unknown[] = [];

		await bus.bind([
			{
				type: 'simlab.simulation.started',
				handle: async (envelope) => {
					received.push(envelope.data);
				},
			},
		]);

		await bus.publish(createSimLabEvent.simulationStarted(baseSimulation));

		expect(received).toHaveLength(1);
		expect(received[0]).toMatchObject(baseSimulation);
		const validation = schemaRegistry.validate(
			'simlab.simulation.started',
			received[0],
		);
		expect(validation.valid).toBe(true);
	});

	it('enforces schema validation for invalid payloads', async () => {
		const { bus } = createSimlabBus();

		await expect(
			bus.publish(
				createEnvelope({
					type: 'simlab.simulation.started',
					source: SIMLAB_EVENT_SOURCE,
					data: { simulationId: 'sim-002' },
				}),
			),
		).rejects.toThrow(/Schema validation failed/);
	});
});
