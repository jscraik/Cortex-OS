import {
	type OutboxMessage,
	OutboxMessageStatus,
	type OutboxRepository,
} from '@cortex-os/a2a-contracts/outbox-types';
import { v4 as uuidv4 } from 'uuid';

/**
 * SQLite Outbox Repository Implementation
 *
 * This is a durable implementation of the OutboxRepository interface
 * using SQLite for persistent storage.
 */

export class SqliteOutboxRepository implements OutboxRepository {
	private db: any;

	constructor(dbPath: string = ':memory:') {
		// Dynamically import better-sqlite3 to avoid hard dependency
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const sqlite3 = require('better-sqlite3');
			this.db = new sqlite3(dbPath);

			// Create tables if they don't exist
			this.db.exec(`
				CREATE TABLE IF NOT EXISTS outbox_messages (
					id TEXT PRIMARY KEY,
					aggregate_type TEXT NOT NULL,
					aggregate_id TEXT NOT NULL,
					event_type TEXT NOT NULL,
					payload TEXT NOT NULL,
					metadata TEXT,
					status TEXT NOT NULL DEFAULT 'PENDING',
					created_at INTEGER NOT NULL,
					processed_at INTEGER,
					published_at INTEGER,
					retry_count INTEGER DEFAULT 0,
					max_retries INTEGER DEFAULT 3,
					last_error TEXT,
					next_retry_at INTEGER,
					idempotency_key TEXT,
					correlation_id TEXT,
					causation_id TEXT,
					traceparent TEXT,
					tracestate TEXT,
					baggage TEXT
				)
			`);

			// Create indexes
			this.db.exec(`
				CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_messages(status);
				CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox_messages(aggregate_type, aggregate_id);
				CREATE INDEX IF NOT EXISTS idx_outbox_retry ON outbox_messages(status, next_retry_at);
				CREATE INDEX IF NOT EXISTS idx_outbox_idempotency ON outbox_messages(idempotency_key);
				CREATE INDEX IF NOT EXISTS idx_outbox_cleanup ON outbox_messages(status, processed_at);
			`);
		} catch (error) {
			console.error('Failed to initialize SQLite database:', error);
			throw new Error('Database initialization failed. Please ensure better-sqlite3 is installed.');
		}
	}

	async save(message: Omit<OutboxMessage, 'id' | 'createdAt'>): Promise<OutboxMessage> {
		const id = uuidv4();
		const createdAt = new Date();

		const outboxMessage: OutboxMessage = {
			id,
			createdAt,
			...message,
		};

		try {
			const stmt = this.db.prepare(`
				INSERT INTO outbox_messages (
					id, aggregate_type, aggregate_id, event_type, payload, metadata,
					status, created_at, processed_at, published_at, retry_count,
					max_retries, last_error, next_retry_at, idempotency_key,
					correlation_id, causation_id, traceparent, tracestate, baggage
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			stmt.run(
				outboxMessage.id,
				outboxMessage.aggregateType,
				outboxMessage.aggregateId,
				outboxMessage.eventType,
				JSON.stringify(outboxMessage.payload),
				outboxMessage.metadata ? JSON.stringify(outboxMessage.metadata) : null,
				outboxMessage.status,
				outboxMessage.createdAt.getTime(),
				outboxMessage.processedAt ? outboxMessage.processedAt.getTime() : null,
				outboxMessage.publishedAt ? outboxMessage.publishedAt.getTime() : null,
				outboxMessage.retryCount,
				outboxMessage.maxRetries,
				outboxMessage.lastError,
				outboxMessage.nextRetryAt ? outboxMessage.nextRetryAt.getTime() : null,
				outboxMessage.idempotencyKey,
				outboxMessage.correlationId,
				outboxMessage.causationId,
				outboxMessage.traceparent,
				outboxMessage.tracestate,
				outboxMessage.baggage,
			);

			return outboxMessage;
		} catch (error) {
			console.error('Failed to save outbox message:', error);
			throw new Error(`Failed to save outbox message: ${error}`);
		}
	}

	async saveBatch(
		messages: Array<Omit<OutboxMessage, 'id' | 'createdAt'>>,
	): Promise<OutboxMessage[]> {
		const savedMessages: OutboxMessage[] = [];

		// Start transaction
		const transaction = this.db.transaction(async () => {
			for (const message of messages) {
				const saved = await this.save(message);
				savedMessages.push(saved);
			}
		});

		try {
			transaction();
			return savedMessages;
		} catch (error) {
			console.error('Failed to save batch of outbox messages:', error);
			throw new Error(`Failed to save batch of outbox messages: ${error}`);
		}
	}

	async findByStatus(status: OutboxMessageStatus, limit?: number): Promise<OutboxMessage[]> {
		try {
			let query = 'SELECT * FROM outbox_messages WHERE status = ? ORDER BY created_at ASC';
			const params: any[] = [status];

			if (limit) {
				query += ' LIMIT ?';
				params.push(limit);
			}

			const stmt = this.db.prepare(query);
			const rows = stmt.all(...params);

			return rows.map(this.mapRowToMessage);
		} catch (error) {
			console.error('Failed to find outbox messages by status:', error);
			throw new Error(`Failed to find outbox messages by status: ${error}`);
		}
	}

	async findReadyForRetry(limit?: number): Promise<OutboxMessage[]> {
		const now = Date.now();

		try {
			let query = `
				SELECT * FROM outbox_messages 
				WHERE status = ? 
				AND retry_count < max_retries 
				AND (next_retry_at IS NULL OR next_retry_at <= ?)
				ORDER BY created_at ASC
			`;
			const params: any[] = [OutboxMessageStatus.FAILED, now];

			if (limit) {
				query += ' LIMIT ?';
				params.push(limit);
			}

			const stmt = this.db.prepare(query);
			const rows = stmt.all(...params);

			return rows.map(this.mapRowToMessage);
		} catch (error) {
			console.error('Failed to find outbox messages ready for retry:', error);
			throw new Error(`Failed to find outbox messages ready for retry: ${error}`);
		}
	}

	async findByAggregate(aggregateType: string, aggregateId: string): Promise<OutboxMessage[]> {
		try {
			const stmt = this.db.prepare(`
				SELECT * FROM outbox_messages 
				WHERE aggregate_type = ? AND aggregate_id = ?
				ORDER BY created_at ASC
			`);
			const rows = stmt.all(aggregateType, aggregateId);

			return rows.map(this.mapRowToMessage);
		} catch (error) {
			console.error('Failed to find outbox messages by aggregate:', error);
			throw new Error(`Failed to find outbox messages by aggregate: ${error}`);
		}
	}

	async updateStatus(id: string, status: OutboxMessageStatus, error?: string): Promise<void> {
		try {
			const stmt = this.db.prepare(`
				UPDATE outbox_messages 
				SET status = ?, last_error = ?
				WHERE id = ?
			`);
			stmt.run(status, error || null, id);
		} catch (error) {
			console.error('Failed to update outbox message status:', error);
			throw new Error(`Failed to update outbox message status: ${error}`);
		}
	}

	async markProcessed(id: string, publishedAt?: Date): Promise<void> {
		try {
			const processedAt = new Date();
			const stmt = this.db.prepare(`
				UPDATE outbox_messages 
				SET status = ?, published_at = ?, processed_at = ?
				WHERE id = ?
			`);
			stmt.run(
				OutboxMessageStatus.PUBLISHED,
				(publishedAt || processedAt).getTime(),
				processedAt.getTime(),
				id,
			);
		} catch (error) {
			console.error('Failed to mark outbox message as processed:', error);
			throw new Error(`Failed to mark outbox message as processed: ${error}`);
		}
	}

	async incrementRetry(id: string, error: string): Promise<void> {
		try {
			// First get the current message to calculate next retry time
			const selectStmt = this.db.prepare(
				'SELECT retry_count, max_retries FROM outbox_messages WHERE id = ?',
			);
			const row = selectStmt.get(id);

			if (!row) {
				throw new Error(`Outbox message with id ${id} not found`);
			}

			const retryCount = (row.retry_count || 0) + 1;

			// Calculate next retry time with exponential backoff
			const delay = Math.min(
				1000 * 2 ** retryCount,
				30000, // Max 30 seconds
			);

			const nextRetryAt = Date.now() + delay;

			const stmt = this.db.prepare(`
				UPDATE outbox_messages 
				SET retry_count = ?, last_error = ?, status = ?, next_retry_at = ?
				WHERE id = ?
			`);
			stmt.run(retryCount, error, OutboxMessageStatus.FAILED, nextRetryAt, id);
		} catch (error) {
			console.error('Failed to increment outbox message retry count:', error);
			throw new Error(`Failed to increment outbox message retry count: ${error}`);
		}
	}

	async moveToDeadLetter(id: string, error: string): Promise<void> {
		try {
			const processedAt = new Date();
			const stmt = this.db.prepare(`
				UPDATE outbox_messages 
				SET status = ?, last_error = ?, processed_at = ?
				WHERE id = ?
			`);
			stmt.run(OutboxMessageStatus.DEAD_LETTER, error, processedAt.getTime(), id);
		} catch (error) {
			console.error('Failed to move outbox message to dead letter queue:', error);
			throw new Error(`Failed to move outbox message to dead letter queue: ${error}`);
		}
	}

	async cleanup(olderThan: Date): Promise<number> {
		try {
			const stmt = this.db.prepare(`
				DELETE FROM outbox_messages 
				WHERE status IN (?, ?) 
				AND processed_at < ?
			`);
			const result = stmt.run(
				OutboxMessageStatus.PUBLISHED,
				OutboxMessageStatus.DEAD_LETTER,
				olderThan.getTime(),
			);

			return result.changes;
		} catch (error) {
			console.error('Failed to cleanup outbox messages:', error);
			throw new Error(`Failed to cleanup outbox messages: ${error}`);
		}
	}

	async existsByIdempotencyKey(idempotencyKey: string): Promise<boolean> {
		if (!idempotencyKey) {
			return false;
		}

		try {
			const stmt = this.db.prepare(`
				SELECT 1 FROM outbox_messages 
				WHERE idempotency_key = ? 
				LIMIT 1
			`);
			const row = stmt.get(idempotencyKey);

			return !!row;
		} catch (error) {
			console.error('Failed to check idempotency key existence:', error);
			throw new Error(`Failed to check idempotency key existence: ${error}`);
		}
	}

	private mapRowToMessage(row: any): OutboxMessage {
		return {
			id: row.id,
			aggregateType: row.aggregate_type,
			aggregateId: row.aggregate_id,
			eventType: row.event_type,
			payload: JSON.parse(row.payload),
			metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
			status: row.status as OutboxMessageStatus,
			createdAt: new Date(row.created_at),
			processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
			publishedAt: row.published_at ? new Date(row.published_at) : undefined,
			retryCount: row.retry_count,
			maxRetries: row.max_retries,
			lastError: row.last_error,
			nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : undefined,
			idempotencyKey: row.idempotency_key,
			correlationId: row.correlation_id,
			causationId: row.causation_id,
			traceparent: row.traceparent,
			tracestate: row.tracestate,
			baggage: row.baggage,
		};
	}
}
