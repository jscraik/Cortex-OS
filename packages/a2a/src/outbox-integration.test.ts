import { describe, expect, it, vi } from 'vitest';
import type { Envelope } from '../a2a-contracts/src/envelope.js';
import { InMemoryOutboxRepository } from './in-memory-outbox-repository';
import { createA2AOutboxIntegration } from './outbox-integration';

describe('A2A Outbox Integration', () => {
	it('should create an outbox integration', async () => {
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
		const integration = createA2AOutboxIntegration(
			transport,
			repository as any,
		);

		// Create test envelope
		const envelope: Envelope = {
			id: 'test-id',
			type: 'test.event',
			source: 'test-source',
			occurredAt: new Date().toISOString(),
			ttlMs: 60000,
			headers: {},
			payload: { test: 'data' },
		};

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
		const integration = createA2AOutboxIntegration(
			transport,
			repository as any,
		);

		// Create test envelopes
		const envelopes: Envelope[] = [
			{
				id: 'test-id-1',
				type: 'test.event.1',
				source: 'test-source',
				occurredAt: new Date().toISOString(),
				ttlMs: 60000,
				headers: {},
				payload: { test: 'data1' },
			},
			{
				id: 'test-id-2',
				type: 'test.event.2',
				source: 'test-source',
				occurredAt: new Date().toISOString(),
				ttlMs: 60000,
				headers: {},
				payload: { test: 'data2' },
			},
		];

		// Publish messages
		await integration.publishBatch(envelopes);

		// Verify transport was called for each message as fallback
		expect(transport.publish).toHaveBeenCalledTimes(2);
		expect(transport.publish).toHaveBeenCalledWith(envelopes[0]);
		expect(transport.publish).toHaveBeenCalledWith(envelopes[1]);
	});
});
