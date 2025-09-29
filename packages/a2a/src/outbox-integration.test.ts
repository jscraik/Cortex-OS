import { createEnvelope, type Envelope } from '@cortex-os/a2a-contracts/envelope';
import { OutboxMessageStatus, type OutboxRepository } from '@cortex-os/a2a-contracts/outbox-types';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryOutboxRepository } from './in-memory-outbox-repository.js';
import { createA2AOutboxIntegration } from './outbox-integration.js';

describe('A2A Outbox Integration', () => {
	/**
	 * NOTE: This test purposefully constructs envelopes via `createEnvelope`.
	 *
	 * Domain distinction:
	 * - Envelope: CloudEvents wrapper (uses `data`) defined in envelope contract.
	 * - OutboxMessage: Persistence layer entity (uses `payload`) defined in outbox-types.
	 *
	 * The integration maps Envelope.data -> OutboxMessage.payload when persisting,
	 * and the reverse when publishing. Any lingering direct `payload` usage on
	 * Envelope objects would be a regression and should be replaced with `data`.
	 */
	it('should create an outbox integration', () => {
		// Mock transport
		const transport = {
			publish: vi.fn().mockResolvedValue(undefined),
		};

		// Create repository
		const repository = new InMemoryOutboxRepository();

		// Create integration
		const integration = createA2AOutboxIntegration(transport, repository);

		// Verify integration methods exist
		expect(integration).toBeDefined();
		expect(typeof integration.publish).toBe('function');
		expect(typeof integration.publishBatch).toBe('function');
		expect(typeof integration.processPending).toBe('function');
		expect(typeof integration.processRetries).toBe('function');
		expect(typeof integration.start).toBe('function');
		expect(typeof integration.stop).toBe('function');
		expect(typeof integration.cleanup).toBe('function');
		expect(typeof integration.getDlqStats).toBe('function');
	});

	it('should call transport publish when outbox fails', async () => {
		const transport = {
			publish: vi.fn().mockResolvedValue(undefined),
		};

		// Create a mock repository that throws an error
		const repository = {
			save: vi.fn().mockRejectedValue(new Error('Database error')),
			saveBatch: vi.fn().mockRejectedValue(new Error('Database error')),
			findByStatus: vi.fn().mockResolvedValue([]),
			findReadyForRetry: vi.fn().mockResolvedValue([]),
			findByAggregate: vi.fn().mockResolvedValue([]),
			updateStatus: vi.fn().mockResolvedValue(undefined),
			markProcessed: vi.fn().mockResolvedValue(undefined),
			incrementRetry: vi.fn().mockResolvedValue(undefined),
			moveToDeadLetter: vi.fn().mockResolvedValue(undefined),
			cleanup: vi.fn().mockResolvedValue(0),
			existsByIdempotencyKey: vi.fn().mockResolvedValue(false),
		};

		// Create integration
		// Ensure repository mock matches OutboxRepository interface
		const repoMock: OutboxRepository = {
			save: repository.save,
			saveBatch: repository.saveBatch,
			findByStatus: repository.findByStatus,
			findReadyForRetry: repository.findReadyForRetry,
			findByAggregate: repository.findByAggregate,
			updateStatus: repository.updateStatus,
			markProcessed: repository.markProcessed,
			incrementRetry: repository.incrementRetry,
			moveToDeadLetter: repository.moveToDeadLetter,
			cleanup: repository.cleanup,
			existsByIdempotencyKey: repository.existsByIdempotencyKey,
		};
		const integration = createA2AOutboxIntegration(transport, repoMock);

		// Create test envelope via helper (auto-populates spec fields)
		const envelope: Envelope = createEnvelope({
			id: 'test-id',
			type: 'test.event',
			source: 'https://test-source.local',
			data: { test: 'data' },
			ttlMs: 60000,
			headers: {},
		});

		// Publish message
		await integration.publish(envelope);

		// Verify transport was called as fallback
		expect(transport.publish).toHaveBeenCalledWith(envelope);
	});

        it('should call transport publish for batch when outbox fails', async () => {
                // Mock transport
                const transport = {
                        publish: vi.fn().mockResolvedValue(undefined),
                };

		// Create a mock repository that throws an error
		const repository = {
			save: vi.fn().mockRejectedValue(new Error('Database error')),
			saveBatch: vi.fn().mockRejectedValue(new Error('Database error')),
			findByStatus: vi.fn().mockResolvedValue([]),
			findReadyForRetry: vi.fn().mockResolvedValue([]),
			findByAggregate: vi.fn().mockResolvedValue([]),
			updateStatus: vi.fn().mockResolvedValue(undefined),
			markProcessed: vi.fn().mockResolvedValue(undefined),
			incrementRetry: vi.fn().mockResolvedValue(undefined),
			moveToDeadLetter: vi.fn().mockResolvedValue(undefined),
			cleanup: vi.fn().mockResolvedValue(0),
			existsByIdempotencyKey: vi.fn().mockResolvedValue(false),
		};

		// Create integration
		// Ensure repository mock matches OutboxRepository interface
		const repoMock: OutboxRepository = {
			save: repository.save,
			saveBatch: repository.saveBatch,
			findByStatus: repository.findByStatus,
			findReadyForRetry: repository.findReadyForRetry,
			findByAggregate: repository.findByAggregate,
			updateStatus: repository.updateStatus,
			markProcessed: repository.markProcessed,
			incrementRetry: repository.incrementRetry,
			moveToDeadLetter: repository.moveToDeadLetter,
			cleanup: repository.cleanup,
			existsByIdempotencyKey: repository.existsByIdempotencyKey,
		};
		const integration = createA2AOutboxIntegration(transport, repoMock);

		// Create test envelopes via helper
		const envelopes: Envelope[] = [
			createEnvelope({
				id: 'test-id-1',
				type: 'test.event.1',
				source: 'https://test-source.local',
				data: { test: 'data1' },
				ttlMs: 60000,
				headers: {},
			}),
			createEnvelope({
				id: 'test-id-2',
				type: 'test.event.2',
				source: 'https://test-source.local',
				data: { test: 'data2' },
				ttlMs: 60000,
				headers: {},
			}),
		];

		// Publish messages
		await integration.publishBatch(envelopes);

		// Verify transport was called for each message as fallback
                expect(transport.publish).toHaveBeenCalledTimes(2);
                expect(transport.publish).toHaveBeenCalledWith(envelopes[0]);
                expect(transport.publish).toHaveBeenCalledWith(envelopes[1]);
        });

        it('processPending returns processing metrics', async () => {
                const transport = {
                        publish: vi.fn().mockResolvedValue(undefined),
                };

                const repository = new InMemoryOutboxRepository();
                const integration = createA2AOutboxIntegration(transport, repository);

                await repository.save({
                        aggregateType: 'test',
                        aggregateId: 'agg-1',
                        eventType: 'test.event',
                        payload: { foo: 'bar' },
                        metadata: {},
                        correlationId: 'corr-1',
                        causationId: undefined,
                        traceparent: undefined,
                        tracestate: undefined,
                        baggage: undefined,
                        idempotencyKey: 'test:agg-1:test.event:corr-1',
                        status: OutboxMessageStatus.PENDING,
                        retryCount: 0,
                        maxRetries: 3,
                });

                const metrics = await integration.processPending();
                expect(metrics.processed).toBe(1);
                expect(metrics.successful).toBe(1);
                expect(transport.publish).toHaveBeenCalledTimes(1);
        });
});
