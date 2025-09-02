import { z } from "zod";

// Dead letter queue message schema
export const DeadLetterMessageSchema = z.object({
	id: z.string().uuid(),
	originalMessageId: z.string().uuid(),
	aggregateType: z.string(),
	aggregateId: z.string(),
	eventType: z.string(),
	payload: z.record(z.unknown()),
	metadata: z.record(z.unknown()).optional(),
	createdAt: z.date(),
	failedAt: z.date(),
	error: z.string(),
	retryCount: z.number(),
	maxRetries: z.number(),
	failureReason: z.enum([
		"max_retries_exceeded",
		"message_expired",
		"invalid_message_format",
		"processing_error",
		"infrastructure_failure",
	]),
	processingNode: z.string().optional(),
	stackTrace: z.string().optional(),
});

export type DeadLetterMessage = z.infer<typeof DeadLetterMessageSchema>;

// DLQ repository interface
export interface DeadLetterRepository {
	save(message: DeadLetterMessage): Promise<void>;
	findByAggregate(
		aggregateType: string,
		aggregateId: string,
	): Promise<DeadLetterMessage[]>;
	findByEventType(eventType: string): Promise<DeadLetterMessage[]>;
	findByFailureReason(
		reason: DeadLetterMessage["failureReason"],
	): Promise<DeadLetterMessage[]>;
	findAll(limit?: number, offset?: number): Promise<DeadLetterMessage[]>;
	getById(id: string): Promise<DeadLetterMessage | null>;
	delete(id: string): Promise<void>;
	count(): Promise<number>;
	countByFailureReason(
		reason: DeadLetterMessage["failureReason"],
	): Promise<number>;
}

// DLQ service configuration
export interface DeadLetterConfig {
	retentionPeriod: number; // in days
	maxMessages: number; // maximum messages to keep
	enableNotifications: boolean;
	notificationThreshold: number; // notify when DLQ size exceeds this
}

// DLQ service - manages dead letter messages
export class DeadLetterService {
	constructor(
		private repository: DeadLetterRepository,
		private config: DeadLetterConfig = {
			retentionPeriod: 30,
			maxMessages: 10000,
			enableNotifications: true,
			notificationThreshold: 100,
		},
	) {}

	async addMessage(
		originalMessageId: string,
		aggregateType: string,
		aggregateId: string,
		eventType: string,
		payload: Record<string, unknown>,
		error: string,
		retryCount: number,
		maxRetries: number,
		failureReason: DeadLetterMessage["failureReason"],
		metadata?: Record<string, unknown>,
		processingNode?: string,
		stackTrace?: string,
	): Promise<string> {
		const message: DeadLetterMessage = {
			id: crypto.randomUUID(),
			originalMessageId,
			aggregateType,
			aggregateId,
			eventType,
			payload,
			metadata,
			createdAt: new Date(),
			failedAt: new Date(),
			error,
			retryCount,
			maxRetries,
			failureReason,
			processingNode,
			stackTrace,
		};

		await this.repository.save(message);

		// Check if we need to trigger notifications
		if (this.config.enableNotifications) {
			await this.checkNotificationThreshold();
		}

		// Clean up old messages if needed
		await this.cleanupOldMessages();

		return message.id;
	}

	async getMessage(id: string): Promise<DeadLetterMessage | null> {
		return this.repository.getById(id);
	}

	async getMessagesByAggregate(
		aggregateType: string,
		aggregateId: string,
	): Promise<DeadLetterMessage[]> {
		return this.repository.findByAggregate(aggregateType, aggregateId);
	}

	async getMessagesByEventType(
		eventType: string,
	): Promise<DeadLetterMessage[]> {
		return this.repository.findByEventType(eventType);
	}

	async getMessagesByFailureReason(
		reason: DeadLetterMessage["failureReason"],
	): Promise<DeadLetterMessage[]> {
		return this.repository.findByFailureReason(reason);
	}

	async getAllMessages(limit = 100, offset = 0): Promise<DeadLetterMessage[]> {
		return this.repository.findAll(limit, offset);
	}

	async deleteMessage(id: string): Promise<void> {
		await this.repository.delete(id);
	}

	async getStatistics(): Promise<{
		total: number;
		byFailureReason: Record<DeadLetterMessage["failureReason"], number>;
	}> {
		const total = await this.repository.count();
		const byFailureReason: Record<DeadLetterMessage["failureReason"], number> =
			{
				max_retries_exceeded: await this.repository.countByFailureReason(
					"max_retries_exceeded",
				),
				message_expired:
					await this.repository.countByFailureReason("message_expired"),
				invalid_message_format: await this.repository.countByFailureReason(
					"invalid_message_format",
				),
				processing_error:
					await this.repository.countByFailureReason("processing_error"),
				infrastructure_failure: await this.repository.countByFailureReason(
					"infrastructure_failure",
				),
			};

		return { total, byFailureReason };
	}

	private async checkNotificationThreshold(): Promise<void> {
		const count = await this.repository.count();
		if (count >= this.config.notificationThreshold) {
			// In a real implementation, this would send notifications
			// For now, we'll just log it
			console.error(
				`Dead Letter Queue size (${count}) exceeds threshold (${this.config.notificationThreshold})`,
			);
		}
	}

	private async cleanupOldMessages(): Promise<void> {
		// This is a simplified cleanup - in a real implementation,
		// you might want to archive old messages or implement more sophisticated cleanup logic
		const count = await this.repository.count();
		if (count > this.config.maxMessages) {
			// For now, we'll just log that cleanup is needed
			// In a real implementation, you'd implement actual cleanup logic
			console.error(
				`Dead Letter Queue size (${count}) exceeds max messages (${this.config.maxMessages}). Cleanup needed.`,
			);
		}
	}
}

// DLQ processor - handles reprocessing of dead letter messages
export class DeadLetterProcessor {
	constructor(private service: DeadLetterService) {}

	async reprocessMessage(
		id: string,
		reprocessor: (message: DeadLetterMessage) => Promise<void>,
	): Promise<boolean> {
		const message = await this.service.getMessage(id);
		if (!message) {
			return false;
		}

		try {
			await reprocessor(message);
			await this.service.deleteMessage(id);
			return true;
		} catch (error) {
			// If reprocessing fails, we could either leave it in DLQ or
			// create a new entry with updated retry information
			console.error(`Failed to reprocess dead letter message ${id}:`, error);
			return false;
		}
	}

	async bulkReprocess(
		filter: {
			aggregateType?: string;
			eventType?: string;
			failureReason?: DeadLetterMessage["failureReason"];
		},
		reprocessor: (message: DeadLetterMessage) => Promise<void>,
		limit = 100,
	): Promise<{ processed: number; failed: number }> {
		let processed = 0;
		let failed = 0;

		// This is a simplified implementation - in practice, you'd need
		// to implement proper filtering and pagination
		const messages = await this.service.getAllMessages(limit);

		for (const message of messages) {
			if (
				(!filter.aggregateType ||
					message.aggregateType === filter.aggregateType) &&
				(!filter.eventType || message.eventType === filter.eventType) &&
				(!filter.failureReason ||
					message.failureReason === filter.failureReason)
			) {
				const success = await this.reprocessMessage(message.id, reprocessor);
				if (success) {
					processed++;
				} else {
					failed++;
				}
			}
		}

		return { processed, failed };
	}
}
