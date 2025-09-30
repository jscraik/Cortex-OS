import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import {
	type OutboxConfig,
	type OutboxMessage,
	OutboxMessageStatus,
	type OutboxProcessingResult,
	type OutboxRepository,
} from '@cortex-os/a2a-contracts/outbox-types';
import { DeadLetterQueue, InMemoryDeadLetterStore } from '@cortex-os/a2a-core/dlq';
import {
	createReliableOutboxProcessor,
	EnhancedOutbox,
	ReliableOutboxPublisher,
} from '@cortex-os/a2a-core/outbox';
import { withSpan } from '@cortex-os/telemetry';

/**
 * A2A Outbox Integration
 *
 * This module integrates the transactional outbox pattern with the A2A bus
 * to ensure reliable message delivery with database transaction consistency.
 */

export interface A2AOutboxIntegration {
	/**
	 * Publish a message through the outbox
	 */
	publish: (envelope: Envelope) => Promise<void>;

	/**
	 * Publish multiple messages through the outbox
	 */
	publishBatch: (envelopes: Envelope[]) => Promise<void>;

	/**
	 * Process pending outbox messages
	 */
	processPending: () => Promise<OutboxProcessingResult>;

	/**
	 * Process retry messages
	 */
	processRetries: () => Promise<OutboxProcessingResult>;

	/**
	 * Start background processing
	 */
	start: () => Promise<void>;

	/**
	 * Stop background processing
	 */
	stop: () => Promise<void>;

	/**
	 * Clean up old processed messages
	 */
	cleanup: (olderThanDays?: number) => Promise<number>;

	/**
	 * Get DLQ statistics
	 */
	getDlqStats: () => Promise<{ size: number; details: Record<string, unknown> }>;
}

/**
 * Create an A2A outbox integration
 */
export function createA2AOutboxIntegration(
	transport: {
		publish: (envelope: Envelope) => Promise<void>;
	},
	repository: OutboxRepository,
	config: OutboxConfig = {},
): A2AOutboxIntegration {
	// Merge with default configuration
	const mergedConfig: Required<OutboxConfig> = {
		maxRetries: config.maxRetries ?? 3,
		initialRetryDelayMs: config.initialRetryDelayMs ?? 1000,
		maxRetryDelayMs: config.maxRetryDelayMs ?? 30000,
		backoffMultiplier: config.backoffMultiplier ?? 2,
		batchSize: config.batchSize ?? 10,
		processingIntervalMs: config.processingIntervalMs ?? 5000,
		dlqThreshold: config.dlqThreshold ?? 5,
		messageTtlMs: config.messageTtlMs ?? 86400000, // 24 hours
		enableIdempotency: config.enableIdempotency ?? true,
	};

	// Create outbox components
	const publisher = new ReliableOutboxPublisher(transport, mergedConfig);
	const processor = createReliableOutboxProcessor(repository, publisher, mergedConfig);
	const outbox = new EnhancedOutbox(repository, publisher, processor);

	// Create DLQ components
	const dlqStore = new InMemoryDeadLetterStore();
	const dlq = new DeadLetterQueue(dlqStore);

	/**
	 * Convert Envelope to OutboxMessage
	 */
	function envelopeToOutboxMessage(envelope: Envelope): Omit<OutboxMessage, 'id' | 'createdAt'> {
		return {
			aggregateType: 'a2a-message',
			aggregateId: envelope.id,
			eventType: envelope.type,
			payload: envelope.data,
			metadata: {
				source: envelope.source,
				headers: envelope.headers,
				ttlMs: envelope.ttlMs,
				occurredAt: envelope.time,
			},
			correlationId: envelope.correlationId,
			causationId: envelope.causationId,
			traceparent: envelope.traceparent,
			tracestate: envelope.tracestate,
			baggage: envelope.baggage,
			idempotencyKey: envelope.headers?.['idempotency-key'] as string | undefined,
			status: OutboxMessageStatus.PENDING,
			retryCount: 0,
			maxRetries: 3,
		};
	}

	/**
	 * Enhanced publish with outbox support
	 */
	async function publish(envelope: Envelope): Promise<void> {
		return withSpan('a2a.outbox.publish', async (span) => {
			span.setAttributes({
				'envelope.id': envelope.id,
				'envelope.type': envelope.type,
			});

			try {
				// Add to outbox within transaction
				const outboxMessage = envelopeToOutboxMessage(envelope);
				await outbox.addToOutbox(outboxMessage);

				// Process immediately for better performance
				await processor.processPending();
			} catch (error) {
				// If outbox fails, fallback to direct publish
				console.warn('brAInwav Outbox failed, falling back to direct publish', error);
				await transport.publish(envelope);
			}
		});
	}

	/**
	 * Enhanced batch publish with outbox support
	 */
	async function publishBatch(envelopes: Envelope[]): Promise<void> {
		return withSpan('a2a.outbox.publishBatch', async (span) => {
			span.setAttributes({
				'envelope.count': envelopes.length,
			});

			try {
				// Add to outbox within transaction
				const outboxMessages = envelopes.map(envelopeToOutboxMessage);
				await outbox.addBatchToOutbox(outboxMessages);

				// Process immediately for better performance
				await processor.processPending();
			} catch (error) {
				// If outbox fails, fallback to direct publish
				console.warn('brAInwav Outbox batch failed, falling back to direct publish', error);
				await Promise.all(envelopes.map((env) => transport.publish(env)));
			}
		});
	}

	/**
	 * Process pending messages
	 */
	async function processPending(): Promise<OutboxProcessingResult> {
		return withSpan('a2a.outbox.processPending', async () => {
			return await processor.processPending();
		});
	}

	/**
	 * Process retry messages
	 */
	async function processRetries(): Promise<OutboxProcessingResult> {
		return withSpan('a2a.outbox.processRetries', async () => {
			return await processor.processRetries();
		});
	}

	/**
	 * Start background processing
	 */
	async function start(): Promise<void> {
		return withSpan('a2a.outbox.start', async () => {
			await processor.start();
		});
	}

	/**
	 * Stop background processing
	 */
	async function stop(): Promise<void> {
		return withSpan('a2a.outbox.stop', async () => {
			await processor.stop();
		});
	}

	/**
	 * Clean up old processed messages
	 */
	async function cleanup(olderThanDays: number = 30): Promise<number> {
		return withSpan('a2a.outbox.cleanup', async (span) => {
			const count = await outbox.cleanup(olderThanDays);
			span.setAttributes({
				'cleanup.count': count,
				'cleanup.olderThanDays': olderThanDays,
			});
			return count;
		});
	}

	/**
	 * Get DLQ statistics
	 */
	async function getDlqStats() {
		return withSpan('a2a.outbox.getDlqStats', async () => {
			const stats = await dlq.getStats();
			return {
				size:
					(stats as { total?: number; size?: number }).total ??
					(stats as { size?: number }).size ??
					0,
				details: stats as Record<string, unknown>,
			};
		});
	}

	return {
		publish,
		publishBatch,
		processPending,
		processRetries,
		start,
		stop,
		cleanup,
		getDlqStats,
	};
}
