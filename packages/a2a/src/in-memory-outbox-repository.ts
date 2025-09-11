import {
	type OutboxMessage,
	OutboxMessageStatus,
	type OutboxRepository,
} from '../a2a-contracts/src/outbox-types.js';

import { v4 as uuidv4 } from 'uuid';

/**
 * In-Memory Outbox Repository Implementation
 *
 * This is a simple in-memory implementation of the OutboxRepository interface
 * for testing and development purposes.
 */

export class InMemoryOutboxRepository implements OutboxRepository {
	private messages: Map<string, OutboxMessage> = new Map();
	private idempotencyKeys: Set<string> = new Set();

	async save(
		message: Omit<OutboxMessage, 'id' | 'createdAt'>,
	): Promise<OutboxMessage> {
		const id = uuidv4();
		const createdAt = new Date();

		const outboxMessage: OutboxMessage = {
			id,
			createdAt,
			...message,
		};

		this.messages.set(id, outboxMessage);

		// Track idempotency key
		if (message.idempotencyKey) {
			this.idempotencyKeys.add(message.idempotencyKey);
		}

		return outboxMessage;
	}

	async saveBatch(
		messages: Array<Omit<OutboxMessage, 'id' | 'createdAt'>>,
	): Promise<OutboxMessage[]> {
		const savedMessages: OutboxMessage[] = [];

		for (const message of messages) {
			const saved = await this.save(message);
			savedMessages.push(saved);
		}

		return savedMessages;
	}

	async findByStatus(
		status: OutboxMessageStatus,
		limit?: number,
	): Promise<OutboxMessage[]> {
		const messages = Array.from(this.messages.values())
			.filter((msg) => msg.status === status)
			.slice(0, limit);

		return messages;
	}

	async findReadyForRetry(limit?: number): Promise<OutboxMessage[]> {
		const now = new Date();
		const messages = Array.from(this.messages.values())
			.filter(
				(msg) =>
					msg.status === OutboxMessageStatus.FAILED &&
					msg.retryCount < (msg.maxRetries || 3) &&
					(!msg.nextRetryAt || new Date(msg.nextRetryAt) <= now),
			)
			.slice(0, limit);

		return messages;
	}

	async findByAggregate(
		aggregateType: string,
		aggregateId: string,
	): Promise<OutboxMessage[]> {
		const messages = Array.from(this.messages.values()).filter(
			(msg) =>
				msg.aggregateType === aggregateType && msg.aggregateId === aggregateId,
		);

		return messages;
	}

	async updateStatus(
		id: string,
		status: OutboxMessageStatus,
		error?: string,
	): Promise<void> {
		const message = this.messages.get(id);
		if (message) {
			message.status = status;
			if (error) {
				message.lastError = error;
			}
			this.messages.set(id, message);
		}
	}

	async markProcessed(id: string, publishedAt?: Date): Promise<void> {
		const message = this.messages.get(id);
		if (message) {
			message.status = OutboxMessageStatus.PUBLISHED;
			message.publishedAt = publishedAt || new Date();
			message.processedAt = new Date();
			this.messages.set(id, message);
		}
	}

	async incrementRetry(id: string, error: string): Promise<void> {
		const message = this.messages.get(id);
		if (message) {
			message.retryCount = (message.retryCount || 0) + 1;
			message.lastError = error;
			message.status = OutboxMessageStatus.FAILED;

			// Calculate next retry time with exponential backoff
			const delay = Math.min(
				1000 * 2 ** message.retryCount,
				30000, // Max 30 seconds
			);

			const nextRetryAt = new Date();
			nextRetryAt.setTime(nextRetryAt.getTime() + delay);
			message.nextRetryAt = nextRetryAt;

			this.messages.set(id, message);
		}
	}

	async moveToDeadLetter(id: string, error: string): Promise<void> {
		const message = this.messages.get(id);
		if (message) {
			message.status = OutboxMessageStatus.DEAD_LETTER;
			message.lastError = error;
			message.processedAt = new Date();
			this.messages.set(id, message);
		}
	}

	async cleanup(olderThan: Date): Promise<number> {
		let count = 0;
		for (const [id, message] of this.messages.entries()) {
			if (
				(message.status === OutboxMessageStatus.PUBLISHED ||
					message.status === OutboxMessageStatus.DEAD_LETTER) &&
				message.processedAt &&
				message.processedAt < olderThan
			) {
				this.messages.delete(id);
				count++;

				// Remove idempotency key if it exists
				if (message.idempotencyKey) {
					this.idempotencyKeys.delete(message.idempotencyKey);
				}
			}
		}
		return count;
	}

	async existsByIdempotencyKey(idempotencyKey: string): Promise<boolean> {
		return this.idempotencyKeys.has(idempotencyKey);
	}
}
