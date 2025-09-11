import { EventEmitter } from 'node:events';
import { z } from 'zod';

// Outbox message schema
export const OutboxMessageSchema = z.object({
	id: z.string().uuid(),
	aggregateType: z.string(),
	aggregateId: z.string(),
	eventType: z.string(),
	payload: z.record(z.any()),
	metadata: z.record(z.any()).optional(),
	createdAt: z.date(),
	processedAt: z.date().optional(),
	status: z.enum(['pending', 'processing', 'processed', 'failed']),
	retryCount: z.number().default(0),
	maxRetries: z.number().default(3),
	error: z.string().optional(),
});

export type OutboxMessage = z.infer<typeof OutboxMessageSchema>;

// Outbox repository interface
export interface OutboxRepository {
	save(message: OutboxMessage): Promise<void>;
	findPending(limit?: number): Promise<OutboxMessage[]>;
	markProcessed(id: string, processedAt: Date): Promise<void>;
	markFailed(id: string, error: string, retryCount: number): Promise<void>;
	getById(id: string): Promise<OutboxMessage | null>;
	delete(id: string): Promise<void>;
}

// Outbox publisher interface
export interface OutboxPublisher {
	publish(message: OutboxMessage): Promise<void>;
}

// Outbox processor configuration
export interface OutboxProcessorConfig {
	batchSize: number;
	pollingInterval: number;
	maxRetries: number;
	retryDelay: number;
}

// Outbox processor - handles publishing messages from outbox
export class OutboxProcessor extends EventEmitter {
	private isRunning = false;
	private timeoutId?: NodeJS.Timeout;

	constructor(
		private repository: OutboxRepository,
		private publisher: OutboxPublisher,
		private config: OutboxProcessorConfig = {
			batchSize: 10,
			pollingInterval: 5000,
			maxRetries: 3,
			retryDelay: 1000,
		},
	) {
		super();
	}

	async start(): Promise<void> {
		if (this.isRunning) {
			return;
		}

		this.isRunning = true;
		this.emit('started');

		const processMessages = async () => {
			if (!this.isRunning) {
				return;
			}

			try {
				await this.processBatch();
			} catch (error) {
				this.emit('error', error);
			}

			if (this.isRunning) {
				this.timeoutId = setTimeout(() => {
					processMessages().catch((error) => this.emit('error', error));
				}, this.config.pollingInterval);
			}
		};

		// Start processing immediately
		await processMessages();
	}

	stop(): void {
		this.isRunning = false;

		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = undefined;
		}

		this.emit('stopped');
	}

	private async processBatch(): Promise<void> {
		const messages = await this.repository.findPending(this.config.batchSize);

		if (messages.length === 0) {
			return;
		}

		this.emit('batchStarted', messages.length);

		for (const message of messages) {
			try {
				await this.processMessage(message);
			} catch (error) {
				await this.handleMessageError(message, error);
			}
		}

		this.emit('batchCompleted', messages.length);
	}

	private async processMessage(message: OutboxMessage): Promise<void> {
		// Publish the message
		await this.publisher.publish(message);

		// Mark as processed
		await this.repository.markProcessed(message.id, new Date());

		this.emit('messageProcessed', message.id);
	}

	private async handleMessageError(
		message: OutboxMessage,
		error: unknown,
	): Promise<void> {
		const newRetryCount = message.retryCount + 1;
		const errorMessage =
			error instanceof Error
				? error.message
				: typeof error === 'string'
					? error
					: 'Unknown error';

		if (newRetryCount >= this.config.maxRetries) {
			// Mark as failed
			await this.repository.markFailed(message.id, errorMessage, newRetryCount);
			this.emit('messageFailed', message.id, errorMessage);
		} else {
			// Mark as pending for retry
			const retryMessage = {
				...message,
				status: 'pending' as const,
				retryCount: newRetryCount,
				error: errorMessage,
			};
			await this.repository.save(retryMessage);
			this.emit('messageRetried', message.id, newRetryCount);
		}
	}
}

// Outbox service - high-level interface for adding messages
export class OutboxService {
	constructor(private repository: OutboxRepository) {}

	async addMessage(
		aggregateType: string,
		aggregateId: string,
		eventType: string,
		payload: Record<string, unknown>,
		metadata?: Record<string, unknown>,
	): Promise<string> {
		const message: OutboxMessage = {
			id: crypto.randomUUID(),
			aggregateType,
			aggregateId,
			eventType,
			payload,
			metadata,
			createdAt: new Date(),
			status: 'pending',
			retryCount: 0,
			maxRetries: 3,
		};

		await this.repository.save(message);
		return message.id;
	}

	async getMessage(id: string): Promise<OutboxMessage | null> {
		return this.repository.getById(id);
	}

	async deleteMessage(id: string): Promise<void> {
		await this.repository.delete(id);
	}
}
