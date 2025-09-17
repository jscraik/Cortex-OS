import { describe, expect, it } from 'vitest';

import {
	createObservabilityBus,
	OBSERVABILITY_EVENT_TYPES,
	type ObservabilityEventEnvelope,
} from '../src/events/observability-bus.js';

describe('Observability A2A bus', () => {
	it('routes typed events to subscribers', async () => {
		const bus = createObservabilityBus({ source: 'urn:test:observability' });
		const received: ObservabilityEventEnvelope[] = [];

		const unsubscribe = await bus.bind([
			{
				type: OBSERVABILITY_EVENT_TYPES.TRACE_CREATED,
				handle: async (event) => {
					received.push(event);
				},
			},
		]);

		await bus.publish(OBSERVABILITY_EVENT_TYPES.TRACE_CREATED, {
			traceId: 'trace-1',
			operationName: 'db.query',
			service: 'analytics',
			startTime: new Date().toISOString(),
			tags: { env: 'test' },
		});

		expect(received).toHaveLength(1);
		expect(received[0].type).toBe(OBSERVABILITY_EVENT_TYPES.TRACE_CREATED);
		expect(received[0].data.service).toBe('analytics');

		await unsubscribe();
	});

	it('rejects invalid payloads', async () => {
		const bus = createObservabilityBus();

		await expect(
			bus.publish(OBSERVABILITY_EVENT_TYPES.METRIC_RECORDED, {
				name: 'latency',
				value: 42,
				type: 'gauge',
				// Missing required timestamp should fail validation
			} as any),
		).rejects.toThrow();
	});
});
