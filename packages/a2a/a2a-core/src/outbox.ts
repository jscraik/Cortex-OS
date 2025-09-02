import type { Envelope } from "@cortex-os/a2a-contracts/envelope";
import {
	type OutboxConfig,
	type OutboxMessage,
	OutboxMessageStatus,
	type OutboxProcessingResult,
	type OutboxProcessor,
	type OutboxPublisher,
	type OutboxRepository,
} from "../../a2a-contracts/src/outbox-types";
import { createTraceParent } from "../../a2a-contracts/src/trace-context";
import { getCurrentTraceContext } from "./trace-context-manager";

/**
 * Enhanced Transactional Outbox Pattern Implementation
 * Ensures reliable event publishing with database transaction consistency
 * Implements ASBR best practices for reliability and observability
 */
/**
 * Enhanced Outbox Publisher with reliability features
 */
export class ReliableOutboxPublisher implements OutboxPublisher {
	constructor(
		private readonly transport: {
			publish: (envelope: Envelope) => Promise<void>;
		},
		private readonly config: OutboxConfig = {},
	) {}
	async publish(message: OutboxMessage): Promise<void> {
		// Inject current trace context if available
		const traceContext = getCurrentTraceContext();
		if (traceContext) {
			message.traceparent = createTraceParent(traceContext);
			message.tracestate = traceContext.traceState;
			message.baggage = traceContext.baggage;
		}

		const envelope: Envelope = {
			id: message.id,
			type: message.eventType,
			source: "/outbox-publisher",
			specversion: "1.0",
			time: message.createdAt.toISOString(),
			data: message.payload,
			correlationId: message.correlationId,
			causationId: message.causationId,
			traceparent: message.traceparent,
			tracestate: message.tracestate,
			baggage: message.baggage,
		};

		await this.transport.publish(envelope);
	}

	async publishBatch(messages: OutboxMessage[]): Promise<void> {
		// Publish messages in parallel with concurrency control
		const concurrency = this.config.batchSize || 10;
		const chunks = this.chunkArray(messages, concurrency);

		for (const chunk of chunks) {
			await Promise.allSettled(chunk.map((msg) => this.publish(msg)));
		}
	}

	private chunkArray<T>(array: T[], size: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	}
}
/**
 * Enhanced Outbox Processor with retry logic and DLQ support
 */
async function processBatch(
	messages: OutboxMessage[],
	repo: OutboxRepository,
	processMessage: (msg: OutboxMessage) => Promise<void>,
	handleError: (msg: OutboxMessage, error: string) => Promise<void>,
): Promise<{ successful: number; failed: number }> {
	let successful = 0;
	let failed = 0;
	const results = await Promise.allSettled(messages.map(processMessage));

	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		const message = messages[i];
		if (result.status === "fulfilled") {
			successful++;
			await repo.markProcessed(message.id, new Date());
		} else {
			failed++;
			const error =
				result.reason instanceof Error
					? result.reason.message
					: "Unknown error";
			await handleError(message, error);
		}
	}

	return { successful, failed };
}

/** Process pending messages from repository. */
export async function processPendingMessages(
	repo: OutboxRepository,
	config: Required<OutboxConfig>,
	processMessage: (msg: OutboxMessage) => Promise<void>,
	handleError: (msg: OutboxMessage, error: string) => Promise<void>,
): Promise<OutboxProcessingResult> {
	const start = Date.now();
	const messages = await repo.findByStatus(
		OutboxMessageStatus.PENDING,
		config.batchSize,
	);
	if (messages.length === 0) {
		return {
			processed: 0,
			successful: 0,
			failed: 0,
			deadLettered: 0,
			duration: 0,
		};
	}

	await Promise.all(
		messages.map((msg) =>
			repo.updateStatus(msg.id, OutboxMessageStatus.PROCESSING),
		),
	);

	const { successful, failed } = await processBatch(
		messages,
		repo,
		processMessage,
		handleError,
	);

	let deadLettered = 0;
	for (const message of messages) {
		if (message.retryCount >= config.dlqThreshold) {
			deadLettered++;
			await repo.moveToDeadLetter(message.id, "Max retries exceeded");
		}
	}

	return {
		processed: messages.length,
		successful,
		failed,
		deadLettered,
		duration: Date.now() - start,
	};
}

/** Process messages that are ready for retry. */
export async function processRetryMessages(
	repo: OutboxRepository,
	config: Required<OutboxConfig>,
	processMessage: (msg: OutboxMessage) => Promise<void>,
	handleError: (msg: OutboxMessage, error: string) => Promise<void>,
): Promise<OutboxProcessingResult> {
	const start = Date.now();
	const messages = await repo.findReadyForRetry(config.batchSize);
	if (messages.length === 0) {
		return {
			processed: 0,
			successful: 0,
			failed: 0,
			deadLettered: 0,
			duration: 0,
		};
	}

	const { successful, failed } = await processBatch(
		messages,
		repo,
		processMessage,
		handleError,
	);

	return {
		processed: messages.length,
		successful,
		failed,
		deadLettered: 0,
		duration: Date.now() - start,
	};
}

/**
 * Factory to create a reliable outbox processor with retry logic and DLQ support.
 */
export function createReliableOutboxProcessor(
	repository: OutboxRepository,
	publisher: OutboxPublisher,
	config: Required<OutboxConfig>,
): OutboxProcessor {
	let isRunning = false;
	let processingTimer: NodeJS.Timeout | undefined;

	const processMessage = async (message: OutboxMessage): Promise<void> => {
		if (config.enableIdempotency && message.idempotencyKey) {
			const exists = await repository.existsByIdempotencyKey(
				message.idempotencyKey,
			);
			if (exists) {
				console.log(
					`Skipping duplicate message with idempotency key: ${message.idempotencyKey}`,
				);
				return;
			}
		}

		await publisher.publish(message);
	};

	const handleProcessingError = async (
		message: OutboxMessage,
		error: string,
	): Promise<void> => {
		if (message.retryCount >= config.maxRetries) {
			await repository.moveToDeadLetter(message.id, error);
		} else {
			await repository.incrementRetry(message.id, error);
		}
	};

	const processPending = () =>
		processPendingMessages(
			repository,
			config,
			processMessage,
			handleProcessingError,
		);

	const processRetries = () =>
		processRetryMessages(
			repository,
			config,
			processMessage,
			handleProcessingError,
		);

	const start = async (): Promise<void> => {
		if (isRunning) return;

		isRunning = true;
		console.log("Starting outbox processor...");

		processingTimer = setInterval(async () => {
			try {
				await processPending();
				await processRetries();
			} catch (error) {
				console.error("Background processing error:", error);
			}
		}, config.processingIntervalMs);
	};

	const stop = async (): Promise<void> => {
		if (!isRunning) return;

		isRunning = false;
		if (processingTimer) {
			clearInterval(processingTimer);
			processingTimer = undefined;
		}
		console.log("Stopped outbox processor");
	};

	return { processPending, processRetries, start, stop };
}

/**
 * Enhanced Outbox with transactional guarantees
 */
export class EnhancedOutbox {
	constructor(
		private readonly repository: OutboxRepository,
		readonly _publisher: OutboxPublisher,
		private readonly processor: OutboxProcessor,
	) {}

	/**
	 * Add message to outbox within a database transaction
	 */
	async addToOutbox(
		message: Omit<OutboxMessage, "id" | "createdAt">,
	): Promise<OutboxMessage> {
		// Generate idempotency key if not provided
		const idempotencyKey =
			message.idempotencyKey || this.generateIdempotencyKey(message);

		const outboxMessage: Omit<OutboxMessage, "id" | "createdAt"> = {
			...message,
			idempotencyKey,
			status: OutboxMessageStatus.PENDING,
			retryCount: 0,
			maxRetries: 3,
			...this.extractTraceContext(),
		};

		return await this.repository.save(outboxMessage);
	}

	/**
	 * Add multiple messages to outbox in a single transaction
	 */
	async addBatchToOutbox(
		messages: Array<Omit<OutboxMessage, "id" | "createdAt">>,
	): Promise<OutboxMessage[]> {
		const outboxMessages = messages.map((message) => ({
			...message,
			idempotencyKey:
				message.idempotencyKey || this.generateIdempotencyKey(message),
			status: OutboxMessageStatus.PENDING,
			retryCount: 0,
			maxRetries: 3,
			...this.extractTraceContext(),
		}));

		return await this.repository.saveBatch(outboxMessages);
	}

	/**
	 * Process pending messages manually
	 */
	async processPending(): Promise<OutboxProcessingResult> {
		return await this.processor.processPending();
	}

	/**
	 * Process retry messages manually
	 */
	async processRetries(): Promise<OutboxProcessingResult> {
		return await this.processor.processRetries();
	}

	/**
	 * Start background processing
	 */
	async start(): Promise<void> {
		await this.processor.start();
	}

	/**
	 * Stop background processing
	 */
	async stop(): Promise<void> {
		await this.processor.stop();
	}

	/**
	 * Clean up old processed messages
	 */
	async cleanup(olderThanDays = 30): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
		return await this.repository.cleanup(cutoffDate);
	}

	private generateIdempotencyKey(
		message: Omit<OutboxMessage, "id" | "createdAt">,
	): string {
		// Generate deterministic idempotency key based on aggregate and event
		const components = [
			message.aggregateType,
			message.aggregateId,
			message.eventType,
			message.correlationId || "no-correlation",
		];
		return components.join(":");
	}

	private extractTraceContext(): {
		traceparent?: string;
		tracestate?: string;
		baggage?: string;
	} {
		const traceContext = getCurrentTraceContext();
		if (!traceContext) {
			return {};
		}

		return {
			traceparent: `00-${traceContext.traceId}-${traceContext.spanId}-${traceContext.traceFlags.toString(16).padStart(2, "0")}`,
			tracestate: traceContext.traceState,
			baggage: traceContext.baggage,
		};
	}
}
