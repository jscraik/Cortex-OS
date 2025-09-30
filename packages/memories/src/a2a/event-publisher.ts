import { randomUUID } from 'node:crypto';
import type { A2AOutboxIntegration } from '@cortex-os/a2a';
import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import type {
	A2AEventPublisher,
	A2AEventPublisherConfig,
	MemoryCreatedData,
	MemoryDeletedData,
	MemoryErrorData,
	MemoryEvent,
	MemoryPurgedData,
	MemoryRealtimeMetricsData,
	MemorySearchedData,
	MemoryUpdatedData,
} from './types.js';

type RetryConfig = Required<NonNullable<A2AEventPublisherConfig['retry']>>;

/**
 * A2A Event Publisher for Memory Events
 *
 * Implements the event publishing functionality for memory operations
 * using the A2A outbox integration for reliable delivery.
 */
export class MemoryA2AEventPublisher implements A2AEventPublisher {
	private outbox?: A2AOutboxIntegration;
	private readonly config: A2AEventPublisherConfig;
	private readonly retryConfig: RetryConfig;
	private running = false;
	private eventQueue: MemoryEvent[] = [];
	private batchTimer?: NodeJS.Timeout;

	constructor(config: A2AEventPublisherConfig) {
		const { retry, ...restConfig } = config;
		const retryConfig: RetryConfig = {
			maxAttempts: 3,
			baseDelayMs: 100,
			maxDelayMs: 5000,
			...(retry ?? {}),
		};

		this.config = {
			defaultTopic: 'memories.events',
			enabled: true,
			batchSize: 10,
			batchTimeout: 1000,
			retry: retryConfig,
			...restConfig,
		};
		this.retryConfig = retryConfig;
	}

	/**
	 * Set the A2A outbox integration
	 */
	setOutbox(outbox: A2AOutboxIntegration): void {
		this.outbox = outbox;
	}

	/**
	 * Publish a single memory event
	 */
	async publishEvent(event: MemoryEvent): Promise<void> {
		if (!this.config.enabled || !this.outbox) {
			return;
		}

		this.eventQueue.push(event);

		const batchSize = this.config.batchSize ?? 10;
		if (this.eventQueue.length >= batchSize) {
			await this.flushEvents();
		} else if (!this.batchTimer) {
			const timeout = this.config.batchTimeout ?? 1000;
			this.batchTimer ??= setTimeout(() => {
				this.batchTimer = undefined;
				this.flushEvents().catch((error) => {
					console.error('brAInwav A2A flush failed during timeout:', error);
				});
			}, timeout);
		}
	}

	/**
	 * Publish multiple memory events
	 */
	async publishEvents(events: MemoryEvent[]): Promise<void> {
		if (!this.config.enabled || !this.outbox) {
			return;
		}

		this.eventQueue.push(...events);

		const batchSize = this.config.batchSize ?? 10;
		if (this.eventQueue.length >= batchSize) {
			await this.flushEvents();
		}
	}

	/**
	 * Start the event publisher
	 */
	async start(): Promise<void> {
		if (this.running) {
			return;
		}

		this.running = true;

		if (this.outbox) {
			await this.outbox.start();
		}
	}

	/**
	 * Stop the event publisher
	 */
	async stop(): Promise<void> {
		if (!this.running) {
			return;
		}

		this.running = false;

		// Flush any remaining events
		if (this.eventQueue.length > 0) {
			await this.flushEvents();
		}

		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = undefined;
		}

		if (this.outbox) {
			await this.outbox.stop();
		}
	}

	/**
	 * Check if publisher is running
	 */
	isRunning(): boolean {
		return this.running;
	}

	/**
	 * Manually flush queued events (for testing)
	 */
	async flush(): Promise<void> {
		await this.flushEvents();
	}

	/**
	 * Flush queued events to the outbox
	 */
	protected async flushEvents(): Promise<void> {
		if (!this.outbox || this.eventQueue.length === 0) {
			return;
		}

		const events = [...this.eventQueue];
		this.eventQueue = [];

		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = undefined;
		}

		try {
			const envelopes = events.map((event) => this.createEnvelope(event));
			const outbox = this.outbox;
			if (!outbox) {
				return;
			}
			await this.withRetry(() => outbox.publishBatch(envelopes));
		} catch (error) {
			console.error('brAInwav A2A memory event publish failed:', error);
			// Re-queue events for retry - they'll be retried on next flush
			this.eventQueue.unshift(...events);
		}
	}

	/**
	 * Create an A2A envelope from a memory event
	 */
	private createEnvelope(event: MemoryEvent): Envelope {
		const sanitizedType = event.type.replace(/[^a-zA-Z0-9]/g, '-');
		const envelopeId = `evt-${sanitizedType}-${randomUUID()}`;
		const subject = event.subject ?? event.memoryId;
		const dataschema =
			event.dataschema ?? 'https://schemas.cortex-os/memories/v1/memory-event.json';
		const ttlMs = event.ttlMs ?? 30000;
		return {
			id: envelopeId,
			type: `memories.${event.type}`,
			source: this.config.source,
			specversion: '1.0',
			time: event.timestamp,
			datacontenttype: 'application/json',
			dataschema,
			subject,
			ttlMs,
			data: event.data,
			headers: {
				'memory-namespace': event.namespace,
				'event-type': event.type,
				'brainwav-brand': 'brAInwav',
				...(event.headers ?? {}),
			},
		};
	}

	/**
	 * Execute operation with retry logic
	 */
	private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
		const { maxAttempts, baseDelayMs, maxDelayMs } = this.retryConfig;

		let attempt = 0;
		let delay = baseDelayMs;
		let timeoutId: NodeJS.Timeout | undefined;

		try {
			while (attempt < maxAttempts) {
				try {
					return await operation();
				} catch (error) {
					attempt++;

					if (attempt >= maxAttempts) {
						throw error;
					}

					// Clean up previous timeout if exists
					if (timeoutId) {
						clearTimeout(timeoutId);
					}

					await new Promise<void>((resolve) => {
						timeoutId = setTimeout(() => {
							timeoutId = undefined;
							resolve(undefined);
						}, delay);
					});

					delay = Math.min(delay * 2, maxDelayMs);
				}
			}
		} finally {
			// Ensure timeout is cleaned up
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}

		throw new Error('Max retry attempts exceeded');
	}

	// Convenience methods for specific event types

	/**
	 * Publish memory created event
	 */
	async publishMemoryCreated(
		memoryId: string,
		namespace: string,
		data: MemoryCreatedData,
	): Promise<void> {
		await this.publishEvent({
			type: 'memory.created',
			memoryId,
			namespace,
			timestamp: new Date().toISOString(),
			data,
		});
	}

	/**
	 * Publish memory updated event
	 */
	async publishMemoryUpdated(
		memoryId: string,
		namespace: string,
		data: MemoryUpdatedData,
	): Promise<void> {
		await this.publishEvent({
			type: 'memory.updated',
			memoryId,
			namespace,
			timestamp: new Date().toISOString(),
			data,
		});
	}

	/**
	 * Publish memory deleted event
	 */
	async publishMemoryDeleted(
		memoryId: string,
		namespace: string,
		data: MemoryDeletedData,
	): Promise<void> {
		await this.publishEvent({
			type: 'memory.deleted',
			memoryId,
			namespace,
			timestamp: new Date().toISOString(),
			data,
		});
	}

	/**
	 * Publish memory searched event
	 */
	async publishMemorySearched(
		memoryId: string,
		namespace: string,
		data: MemorySearchedData,
	): Promise<void> {
		await this.publishEvent({
			type: 'memory.searched',
			memoryId,
			namespace,
			timestamp: new Date().toISOString(),
			data,
		});
	}

	/**
	 * Publish memory purged event
	 */
	async publishMemoryPurged(
		memoryId: string,
		namespace: string,
		data: MemoryPurgedData,
	): Promise<void> {
		await this.publishEvent({
			type: 'memory.purged',
			memoryId,
			namespace,
			timestamp: new Date().toISOString(),
			data,
		});
	}

	/**
	 * Publish memory error event
	 */
	async publishMemoryError(
		memoryId: string,
		namespace: string,
		data: MemoryErrorData,
	): Promise<void> {
		await this.publishEvent({
			type: 'memory.error',
			memoryId,
			namespace,
			timestamp: new Date().toISOString(),
			data,
		});
	}

	/**
	 * Publish realtime connection metrics snapshot event
	 */
	async publishRealtimeMetrics(event: MemoryRealtimeMetricsData): Promise<void> {
		await this.publishEvent({
			type: event.type,
			memoryId: event.snapshotId,
			namespace: 'metrics',
			timestamp: event.timestamp,
			data: event,
			subject: event.snapshotId,
			dataschema: 'https://schemas.cortex-os/memories/v1/realtime-metrics-event.json',
			ttlMs: 60000,
			headers: {
				'metrics-source': event.source,
				'metrics-reason': event.reason,
				'brainwav-brand': event.brand,
			},
		});
	}
}
