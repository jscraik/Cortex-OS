import { describe, expect, it } from 'vitest';
import { createObservabilityBus, OBSERVABILITY_EVENT_TYPES, } from '../src/events/observability-bus.js';
describe('Observability A2A bus', () => {
    it('routes typed events to subscribers', async () => {
        const bus = createObservabilityBus({ source: 'urn:test:observability' });
        const received = [];
        const unsubscribe = await bus.bind([
            {
                type: OBSERVABILITY_EVENT_TYPES.TRACE_CREATED,
                handle: async (event) => {
                    received.push(event);
                },
            },
        ]);
        const payload = {
            traceId: 'trace-1',
            operationName: 'db.query',
            service: 'analytics',
            startTime: new Date().toISOString(),
            tags: { env: 'test' },
        };
        await bus.publish(OBSERVABILITY_EVENT_TYPES.TRACE_CREATED, payload);
        expect(received).toHaveLength(1);
        expect(received[0].type).toBe(OBSERVABILITY_EVENT_TYPES.TRACE_CREATED);
        // Narrow the union so TypeScript knows the payload has `service`
        const data = received[0].data;
        expect(data.service).toBe('analytics');
        await unsubscribe();
    });
    it('rejects invalid payloads', async () => {
        const bus = createObservabilityBus();
        const invalidPayload = {
            name: 'latency',
            value: 42,
            type: 'gauge',
            // Missing required timestamp should fail validation
        };
        await expect(
        // intentionally bypass compile-time types to test runtime validation by narrowing to a minimal publish signature
        bus.publish(OBSERVABILITY_EVENT_TYPES.METRIC_RECORDED, invalidPayload)).rejects.toThrow();
    });
});
//# sourceMappingURL=a2a-bus.test.js.map