import { OutboxMessageStatus } from '@cortex-os/a2a-contracts';
import { describe, expect, it } from 'vitest';
import { InMemoryOutboxRepository } from '../src/in-memory-outbox-repository.js';
import { createInMemoryOutboxService } from '../src/outbox-service.js';

describe('OutboxService (instrumented in-memory implementation)', () => {
	it('processes pending messages and reports metrics', async () => {
		const repository = new InMemoryOutboxRepository();
		const dispatched: string[] = [];
		const recordedActions: Array<{ action: string; metrics?: Record<string, unknown> }> = [];

		const service = createInMemoryOutboxService({
			repository,
			onDispatch: (envelope) => {
				dispatched.push(envelope.id);
			},
			metricsRecorder: {
				record(action, payload) {
					recordedActions.push({ action, metrics: payload.metrics });
				},
			},
		});

		await repository.save({
			aggregateType: 'test',
			aggregateId: '123',
			eventType: 'test.event',
			payload: { foo: 'bar' },
			metadata: {},
			correlationId: 'corr-1',
			causationId: undefined,
			traceparent: undefined,
			tracestate: undefined,
			baggage: undefined,
			idempotencyKey: 'test:123:test.event:corr-1',
			status: OutboxMessageStatus.PENDING,
			retryCount: 0,
			maxRetries: 3,
		});

		const pendingMetrics = await service.processPending();
		expect(pendingMetrics.processed).toBe(1);
		expect(pendingMetrics.successful).toBe(1);
		expect(dispatched).toHaveLength(1);
		expect(recordedActions.find((entry) => entry.action === 'processPending')).toBeDefined();

		// Allow processedAt timestamps to settle before cleanup
		await new Promise((resolve) => setTimeout(resolve, 5));

		const cleanupMetrics = await service.cleanup(0);
		expect(cleanupMetrics.cleanupDeleted).toBeGreaterThanOrEqual(1);
		expect(recordedActions.find((entry) => entry.action === 'cleanup')).toBeDefined();

		const retryMetrics = await service.processRetries();
		expect(retryMetrics.processed).toBe(0);

		const dlqSnapshot = await service.dlqStats();
		expect(dlqSnapshot.size).toBe(0);
		expect(dlqSnapshot.details).toBeDefined();
		expect(recordedActions.find((entry) => entry.action === 'dlqStats')).toBeDefined();
	});
});
