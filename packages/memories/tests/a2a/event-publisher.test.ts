import type { A2AOutboxIntegration } from '@cortex-os/a2a';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeMemoryMetricsEventSchema } from '../../../../libs/typescript/contracts/src/memory-realtime.js';
import { MemoryA2AEventPublisher } from '../../src/a2a/event-publisher.js';

describe('A2A Event Publisher', () => {
	let publisher: MemoryA2AEventPublisher;
	let mockOutbox: A2AOutboxIntegration;

	beforeEach(() => {
		vi.useFakeTimers();
		mockOutbox = {
			publish: vi.fn(),
			publishBatch: vi.fn(),
			processPending: vi.fn(),
			processRetries: vi.fn(),
			start: vi.fn(),
			stop: vi.fn(),
		} as any;

		publisher = new MemoryA2AEventPublisher({
			source: 'test-memories',
			enabled: true,
			batchSize: 2,
			batchTimeout: 100,
		});

		publisher.setOutbox(mockOutbox);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('Configuration', () => {
		it('should use default values when not provided', () => {
			const publisher = new MemoryA2AEventPublisher({
				source: 'test',
			});

			expect(publisher.config.defaultTopic).toBe('memories.events');
			expect(publisher.config.enabled).toBe(true);
			expect(publisher.config.batchSize).toBe(10);
			expect(publisher.config.batchTimeout).toBe(1000);
			expect(publisher.config.retry?.maxAttempts).toBe(3);
		});

		it('should use provided configuration values', () => {
			const config = {
				source: 'custom-source',
				defaultTopic: 'custom-topic',
				enabled: false,
				batchSize: 5,
				batchTimeout: 500,
				retry: {
					maxAttempts: 5,
					baseDelayMs: 200,
					maxDelayMs: 10000,
				},
			};

			const publisher = new MemoryA2AEventPublisher(config);

			expect(publisher.config.source).toBe('custom-source');
			expect(publisher.config.defaultTopic).toBe('custom-topic');
			expect(publisher.config.enabled).toBe(false);
			expect(publisher.config.batchSize).toBe(5);
			expect(publisher.config.batchTimeout).toBe(500);
			expect(publisher.config.retry?.maxAttempts).toBe(5);
		});
	});

	describe('Event Publishing', () => {
		it('should not publish when disabled', async () => {
			const disabledPublisher = new MemoryA2AEventPublisher({
				source: 'test',
				enabled: false,
			});
			disabledPublisher.setOutbox(mockOutbox);

			await disabledPublisher.publishEvent({
				type: 'memory.created',
				memoryId: 'test-id',
				namespace: 'default',
				timestamp: new Date().toISOString(),
				data: {},
			});

			expect(mockOutbox.publishBatch).not.toHaveBeenCalled();
		});

		it('should publish immediately when batch size is reached', async () => {
			const event1 = {
				type: 'memory.created' as const,
				memoryId: 'id1',
				namespace: 'default',
				timestamp: new Date().toISOString(),
				data: {},
			};

			const event2 = {
				type: 'memory.updated' as const,
				memoryId: 'id2',
				namespace: 'default',
				timestamp: new Date().toISOString(),
				data: {},
			};

			await publisher.publishEvent(event1);
			expect(mockOutbox.publishBatch).not.toHaveBeenCalled();

			await publisher.publishEvent(event2);
			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);

			const call = mockOutbox.publishBatch.mock.calls[0][0];
			expect(call).toHaveLength(2);
			expect(call[0].type).toBe('memories.memory.created');
			expect(call[1].type).toBe('memories.memory.updated');
		});

		it('should batch events within timeout window', async () => {
			await publisher.publishEvent({
				type: 'memory.created' as const,
				memoryId: 'test-id',
				namespace: 'default',
				timestamp: new Date().toISOString(),
				data: {},
			});

			expect(mockOutbox.publishBatch).not.toHaveBeenCalled();

			vi.advanceTimersByTime(100);
			await vi.runAllTimersAsync();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
		});

		it('should handle publishing errors and re-queue events', async () => {
			vi.useFakeTimers({ shouldClearNativeTimers: true });
			mockOutbox.publishBatch.mockRejectedValue(new Error('Publish failed'));

			const event = {
				type: 'memory.created' as const,
				memoryId: 'test-id',
				namespace: 'default',
				timestamp: new Date().toISOString(),
				data: {},
			};

			// Start the publisher
			await publisher.start();

			// Set batch size to 1 for immediate flush
			publisher.config.batchSize = 1;

			// First publish should fail and retry (max attempts is 3)
			const publishPromise = publisher.publishEvents([event]);

			// Advance timers through all retry attempts (100ms, 200ms, 400ms)
			await vi.advanceTimersByTimeAsync(100); // First retry
			await vi.advanceTimersByTimeAsync(200); // Second retry
			await vi.advanceTimersByTimeAsync(400); // Third retry

			await publishPromise;

			// Should have been called 3 times due to retries
			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(3);
			// Event should be re-queued after all retries fail
			expect(publisher.eventQueue).toHaveLength(1);

			// Clear the mock to track new calls
			mockOutbox.publishBatch.mockClear();

			// Next publish should succeed - this will also retry the failed event
			mockOutbox.publishBatch.mockResolvedValue(undefined);
			const newEvent = {
				type: 'memory.created' as const,
				memoryId: 'test-id-2',
				namespace: 'default',
				timestamp: new Date().toISOString(),
				data: {},
			};
			await publisher.publishEvents([newEvent]);

			// Should have published both the new event AND the retried failed event
			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			// Queue should be empty since both events were published successfully
			expect(publisher.eventQueue).toHaveLength(0);

			vi.useRealTimers();
		});
	});

	describe('Envelope Creation', () => {
		it('should create correct envelope structure', async () => {
			const event = {
				type: 'memory.created' as const,
				memoryId: 'test-id',
				namespace: 'test-ns',
				timestamp: '2024-01-01T00:00:00.000Z',
				data: { test: 'data' },
			};

			await publisher.publishEvent(event);
			await vi.runAllTimersAsync();

			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];

			expect(envelope.id).toMatch(
				/^evt-memory-created-[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/i,
			);
			expect(envelope.type).toBe('memories.memory.created');
			expect(envelope.source).toBe('test-memories');
			expect(envelope.specversion).toBe('1.0');
			expect(envelope.time).toBe('2024-01-01T00:00:00.000Z');
			expect(envelope.datacontenttype).toBe('application/json');
			expect(envelope.dataschema).toBe('https://schemas.cortex-os/memories/v1/memory-event.json');
			expect(envelope.subject).toBe('test-id');
			expect(envelope.data).toEqual({ test: 'data' });
			expect(envelope.headers['memory-namespace']).toBe('test-ns');
			expect(envelope.headers['event-type']).toBe('memory.created');
		});
	});

	describe('Convenience Methods', () => {
		it('should provide typed convenience methods', async () => {
			// Use a larger batch size to prevent immediate flushing
			const largeBatchPublisher = new MemoryA2AEventPublisher({
				source: 'test-memories',
				enabled: true,
				batchSize: 10, // Larger than the number of events
				batchTimeout: 100,
			});
			largeBatchPublisher.setOutbox(mockOutbox);
			await largeBatchPublisher.publishMemoryCreated('id1', 'ns', {
				memory: {
					id: 'id1',
					kind: 'note',
					text: 'test',
					createdAt: '',
					updatedAt: '',
					provenance: { source: 'system' },
				},
			});

			await largeBatchPublisher.publishMemoryUpdated('id2', 'ns', {
				memory: {
					id: 'id2',
					kind: 'note',
					text: 'updated',
					createdAt: '',
					updatedAt: '',
					provenance: { source: 'system' },
				},
				changes: {
					old: { text: 'old' },
					new: { text: 'updated' },
				},
			});

			await largeBatchPublisher.publishMemoryDeleted('id3', 'ns', {
				memoryId: 'id3',
				reason: 'manual',
			});

			await largeBatchPublisher.publishMemorySearched('search1', 'ns', {
				query: { text: 'test', limit: 10 },
				results: { count: 5, memories: [], executionTimeMs: 100 },
			});

			await largeBatchPublisher.publishMemoryPurged('purge1', 'ns', {
				namespace: 'ns',
				count: 10,
				timestamp: new Date().toISOString(),
			});

			await largeBatchPublisher.publishMemoryError('error1', 'ns', {
				error: { type: 'Error', message: 'test error' },
				operation: 'test',
			});

			// All events should be queued
			expect(largeBatchPublisher.eventQueue).toHaveLength(6);
		});

		it('publishes realtime metrics events with branded envelope metadata', async () => {
			const metricsPublisher = new MemoryA2AEventPublisher({
				source: 'test-memories',
				enabled: true,
				batchSize: 1,
			});
			metricsPublisher.setOutbox(mockOutbox);

			const timestamp = new Date().toISOString();
			const metricsEvent = RealtimeMemoryMetricsEventSchema.parse({
				type: 'memory.realtime.metrics',
				snapshotId: 'metrics-123',
				brand: 'brAInwav',
				source: 'brAInwav.realtime.memory',
				timestamp,
				description: 'brAInwav realtime metrics snapshot for vitest',
				reason: 'connection-established',
				aggregate: {
					totalConnections: 1,
					activeConnections: 1,
					reconnections: 0,
					messagesSent: 2,
					messagesReceived: 3,
					bytesSent: 512,
					bytesReceived: 256,
					lastActivityAt: timestamp,
					connectionTimestamps: [timestamp],
				},
				connections: [
					{
						connectionId: 'client-a',
						status: 'connected',
						subscriptions: ['default'],
						connectedAt: timestamp,
						lastActivityAt: timestamp,
						metrics: {
							messagesSent: 2,
							messagesReceived: 3,
							bytesSent: 512,
							bytesReceived: 256,
							queueDepth: 0,
						},
					},
				],
			});

			await metricsPublisher.publishRealtimeMetrics(metricsEvent);

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			const envelope = mockOutbox.publishBatch.mock.calls[0][0][0];
			expect(envelope.type).toBe('memories.memory.realtime.metrics');
			expect(envelope.subject).toBe(metricsEvent.snapshotId);
			expect(envelope.data).toEqual(metricsEvent);
			expect(envelope.headers['metrics-source']).toBe(metricsEvent.source);
			expect(envelope.headers['metrics-reason']).toBe(metricsEvent.reason);
			expect(envelope.headers['metrics-brand']).toBe('brAInwav');
			expect(envelope.dataschema).toBe(
				'https://schemas.cortex-os/memories/v1/realtime-metrics-event.json',
			);
		});
	});

	describe('Lifecycle Management', () => {
		it('should start and stop the publisher', async () => {
			await publisher.start();
			expect(publisher.isRunning()).toBe(true);
			expect(mockOutbox.start).toHaveBeenCalledTimes(1);

			await publisher.stop();
			expect(publisher.isRunning()).toBe(false);
			expect(mockOutbox.stop).toHaveBeenCalledTimes(1);
		});

		it('should flush remaining events on stop', async () => {
			vi.useFakeTimers();

			// Start the publisher first
			await publisher.start();

			// Set batch size to 2 so event stays in queue
			publisher.config.batchSize = 2;

			// Ensure the outbox will succeed when stop flushes
			mockOutbox.publishBatch.mockResolvedValue(undefined);

			await publisher.publishEvent({
				type: 'memory.created' as const,
				memoryId: 'test-id',
				namespace: 'default',
				timestamp: new Date().toISOString(),
				data: {},
			});

			// Ensure the batch timer is set (event is queued but not flushed)
			expect(publisher.batchTimer).toBeDefined();
			expect(publisher.eventQueue).toHaveLength(1);

			// Stop should flush immediately
			await publisher.stop();

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(1);
			expect(publisher.eventQueue).toHaveLength(0);

			vi.useRealTimers();
		});

		it('should handle multiple start calls', async () => {
			await publisher.start();
			await publisher.start();

			expect(mockOutbox.start).toHaveBeenCalledTimes(1);
			expect(publisher.isRunning()).toBe(true);
		});

		it('should handle multiple stop calls', async () => {
			await publisher.start();
			await publisher.stop();
			await publisher.stop();

			expect(mockOutbox.stop).toHaveBeenCalledTimes(1);
			expect(publisher.isRunning()).toBe(false);
		});
	});

	describe('Retry Logic', () => {
		it('should retry on failure with exponential backoff', async () => {
			vi.useFakeTimers();

			let attempt = 0;
			mockOutbox.publishBatch.mockImplementation(async () => {
				attempt++;
				if (attempt < 3) {
					throw new Error('Temporary failure');
				}
			});

			const event = {
				type: 'memory.created' as const,
				memoryId: 'test-id',
				namespace: 'default',
				timestamp: new Date().toISOString(),
				data: {},
			};

			// Set batch size to 1 to trigger immediate flush
			publisher.config.batchSize = 1;

			const publishPromise = publisher.publishEvents([event]);

			// First attempt fails
			await vi.advanceTimersByTimeAsync(100);

			// Second attempt fails
			await vi.advanceTimersByTimeAsync(200);

			// Third attempt succeeds
			await vi.advanceTimersByTimeAsync(400);

			await publishPromise;

			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(3);
			expect(attempt).toBe(3);

			vi.useRealTimers();
		});

		it('should give up after max attempts', async () => {
			vi.useFakeTimers({ shouldClearNativeTimers: true });
			mockOutbox.publishBatch.mockRejectedValue(new Error('Permanent failure'));

			const event = {
				type: 'memory.created' as const,
				memoryId: 'test-id',
				namespace: 'default',
				timestamp: new Date().toISOString(),
				data: {},
			};

			// Set batch size to 1 to trigger immediate flush
			publisher.config.batchSize = 1;

			// The publishEvents method returns immediately when batch size is reached
			// The retry happens within the flushEvents call
			const publishPromise = publisher.publishEvents([event]);

			// Advance timers through all retry attempts (100ms, 200ms, 400ms)
			await vi.advanceTimersByTimeAsync(100); // First retry
			await vi.advanceTimersByTimeAsync(200); // Second retry
			await vi.advanceTimersByTimeAsync(400); // Third retry (final)

			await publishPromise;

			// Should have been called 3 times (initial + 2 retries)
			expect(mockOutbox.publishBatch).toHaveBeenCalledTimes(3);
			// Event should be re-queued after all retries fail
			expect(publisher.eventQueue).toHaveLength(1);

			vi.useRealTimers();
		}, 10000);
	});
});
