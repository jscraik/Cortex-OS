import { z } from 'zod';

/**
 * Transactional Outbox Pattern Implementation
 * Ensures reliable event publishing with database transaction consistency
 */

/**
 * Outbox message status enumeration
 */
export enum OutboxMessageStatus {
	PENDING = 'PENDING',
	PROCESSING = 'PROCESSING',
	PUBLISHED = 'PUBLISHED',
	FAILED = 'FAILED',
	DEAD_LETTER = 'DEAD_LETTER',
}

/**
 * Outbox message entity schema
 */
export const OutboxMessageSchema = z.object({
	id: z.string().uuid(),
	aggregateType: z
		.string()
		.min(1)
		.describe('Type of aggregate (e.g., "user", "order")'),
	aggregateId: z.string().min(1).describe('ID of the aggregate'),
	eventType: z.string().min(1).describe('Event type to be published'),
	payload: z.unknown().describe('Event payload data'),
	metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
	status: z
		.nativeEnum(OutboxMessageStatus)
		.default(OutboxMessageStatus.PENDING),
	createdAt: z.date().default(() => new Date()),
	processedAt: z.date().optional(),
	publishedAt: z.date().optional(),
	retryCount: z.number().int().min(0).default(0),
	maxRetries: z.number().int().min(0).default(3),
	lastError: z.string().optional(),
	nextRetryAt: z.date().optional(),
	idempotencyKey: z
		.string()
		.optional()
		.describe('Idempotency key to prevent duplicates'),
	correlationId: z
		.string()
		.uuid()
		.optional()
		.describe('Correlation ID for related messages'),
	causationId: z
		.string()
		.uuid()
		.optional()
		.describe('ID of the event that caused this message'),
	// W3C Trace Context for distributed tracing
	traceparent: z.string().optional(),
	tracestate: z.string().optional(),
	baggage: z.string().optional(),
});

export type OutboxMessage = z.infer<typeof OutboxMessageSchema>;

/**
 * Outbox configuration options
 */
export interface OutboxConfig {
	/** Maximum number of retry attempts */
	maxRetries?: number;
	/** Initial retry delay in milliseconds */
	initialRetryDelayMs?: number;
	/** Maximum retry delay in milliseconds */
	maxRetryDelayMs?: number;
	/** Backoff multiplier for retry delays */
	backoffMultiplier?: number;
	/** Batch size for processing messages */
	batchSize?: number;
	/** Processing interval in milliseconds */
	processingIntervalMs?: number;
	/** Dead letter queue threshold (after this many failures) */
	dlqThreshold?: number;
	/** Message time-to-live in milliseconds */
	messageTtlMs?: number;
	/** Whether to enable idempotency checking */
	enableIdempotency?: boolean;
}

/**
 * Outbox processing result
 */
export interface OutboxProcessingResult {
	processed: number;
	successful: number;
	failed: number;
	deadLettered: number;
	duration: number;
}

/**
 * Outbox repository interface
 * Abstracts the storage layer for outbox messages
 */
export interface OutboxRepository {
	/**
	 * Save a new outbox message
	 */
	save(
		message: Omit<OutboxMessage, 'id' | 'createdAt'>,
	): Promise<OutboxMessage>;

	/**
	 * Save multiple outbox messages in a transaction
	 */
	saveBatch(
		messages: Array<Omit<OutboxMessage, 'id' | 'createdAt'>>,
	): Promise<OutboxMessage[]>;

	/**
	 * Find messages by status
	 */
	findByStatus(
		status: OutboxMessageStatus,
		limit?: number,
	): Promise<OutboxMessage[]>;

	/**
	 * Find messages ready for retry
	 */
	findReadyForRetry(limit?: number): Promise<OutboxMessage[]>;

	/**
	 * Find messages by aggregate
	 */
	findByAggregate(
		aggregateType: string,
		aggregateId: string,
	): Promise<OutboxMessage[]>;

	/**
	 * Update message status
	 */
	updateStatus(
		id: string,
		status: OutboxMessageStatus,
		error?: string,
	): Promise<void>;

	/**
	 * Mark message as processed
	 */
	markProcessed(id: string, publishedAt?: Date): Promise<void>;

	/**
	 * Increment retry count and schedule next retry
	 */
	incrementRetry(id: string, error: string): Promise<void>;

	/**
	 * Move message to dead letter queue
	 */
	moveToDeadLetter(id: string, error: string): Promise<void>;

	/**
	 * Delete old processed messages
	 */
	cleanup(olderThan: Date): Promise<number>;

	/**
	 * Check if idempotency key exists
	 */
	existsByIdempotencyKey(idempotencyKey: string): Promise<boolean>;
}

/**
 * Outbox publisher interface
 * Handles the actual publishing of messages
 */
export interface OutboxPublisher {
	/**
	 * Publish a single message
	 */
	publish(message: OutboxMessage): Promise<void>;

	/**
	 * Publish multiple messages
	 */
	publishBatch(messages: OutboxMessage[]): Promise<void>;
}

/**
 * Outbox processor interface
 * Orchestrates the processing of outbox messages
 */
export interface OutboxProcessor {
	/**
	 * Process pending messages
	 */
	processPending(): Promise<OutboxProcessingResult>;

	/**
	 * Process messages ready for retry
	 */
	processRetries(): Promise<OutboxProcessingResult>;

	/**
	 * Start background processing
	 */
	start(): Promise<void>;

	/**
	 * Stop background processing
	 */
	stop(): Promise<void>;
}
