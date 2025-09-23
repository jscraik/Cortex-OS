import {
	type OutboxMessage,
	OutboxMessageStatus,
	type OutboxRepository,
} from '@cortex-os/a2a-contracts/outbox-types';
import { v4 as uuidv4 } from 'uuid';

// Define proper SQLite types
interface SqliteRow {
	id: string;
	aggregate_type: string;
	aggregate_id: string;
	event_type: string;
	payload: string;
	metadata: string | null;
	status: string;
	created_at: string;
	processed_at: string | null;
	published_at: string | null;
	retry_count: number;
	max_retries: number;
	last_error: string | null;
	next_retry_at: string | null;
	idempotency_key: string | null;
	correlation_id: string | null;
	causation_id: string | null;
	traceparent: string | null;
	tracestate: string | null;
	baggage: string | null;
}

interface SqliteDatabase {
	exec(sql: string): void;
	prepare(sql: string): SqliteStatement;
	close(): void;
	transaction<T>(fn: () => T): () => T;
}

interface SqliteStatement {
	run(...params: unknown[]): { changes: number; lastInsertRowid: number };
	get(...params: unknown[]): SqliteRow | undefined;
	all(...params: unknown[]): SqliteRow[];
}

/**
 * SQLite Outbox Repository Implementation
 */
export class SqliteOutboxRepository implements OutboxRepository {
	private readonly db: SqliteDatabase;

	constructor(dbPath: string = ':memory:') {
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const sqlite3 = require('better-sqlite3');
			this.db = new sqlite3(dbPath);
			this.initializeSchema();
		} catch (error) {
			throw new Error(
				`Failed to initialize SQLite database: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	private initializeSchema(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS outbox_messages (
				id TEXT PRIMARY KEY,
				aggregate_type TEXT NOT NULL,
				aggregate_id TEXT NOT NULL,
				event_type TEXT NOT NULL,
				payload TEXT NOT NULL,
				metadata TEXT,
				status TEXT NOT NULL DEFAULT 'PENDING',
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				processed_at TEXT,
				published_at TEXT,
				retry_count INTEGER NOT NULL DEFAULT 0,
				max_retries INTEGER NOT NULL DEFAULT 3,
				last_error TEXT,
				next_retry_at TEXT,
				idempotency_key TEXT,
				correlation_id TEXT,
				causation_id TEXT,
				traceparent TEXT,
				tracestate TEXT,
				baggage TEXT
			)
		`);

		// Add indexes for performance
		const indexes = [
			'CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_messages(status)',
			'CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox_messages(aggregate_type, aggregate_id)',
			'CREATE INDEX IF NOT EXISTS idx_outbox_idempotency ON outbox_messages(idempotency_key)',
			'CREATE INDEX IF NOT EXISTS idx_outbox_retry ON outbox_messages(status, next_retry_at)',
		];

		for (const index of indexes) {
			this.db.exec(index);
		}
	}

	async save(message: Omit<OutboxMessage, 'id' | 'createdAt'>): Promise<OutboxMessage> {
		return this.saveInternal(message);
	}

	async saveBatch(
		messages: Array<Omit<OutboxMessage, 'id' | 'createdAt'>>,
	): Promise<OutboxMessage[]> {
		const results: OutboxMessage[] = [];

		const transaction = this.db.transaction(() => {
			for (const message of messages) {
				const saved = this.saveInternal(message);
				results.push(saved);
			}
		});

		transaction();
		return results;
	}

	private saveInternal(message: Omit<OutboxMessage, 'id' | 'createdAt'>): OutboxMessage {
		const id = uuidv4();
		const createdAt = new Date();

		const stmt = this.db.prepare(`
			INSERT INTO outbox_messages (
				id, aggregate_type, aggregate_id, event_type, payload, metadata,
				status, created_at, retry_count, max_retries, idempotency_key,
				correlation_id, causation_id, traceparent, tracestate, baggage
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			id,
			message.aggregateType,
			message.aggregateId,
			message.eventType,
			JSON.stringify(message.payload),
			message.metadata ? JSON.stringify(message.metadata) : null,
			message.status || OutboxMessageStatus.PENDING,
			createdAt.toISOString(),
			message.retryCount || 0,
			message.maxRetries || 3,
			message.idempotencyKey || null,
			message.correlationId || null,
			message.causationId || null,
			message.traceparent || null,
			message.tracestate || null,
			message.baggage || null,
		);

		return {
			...message,
			id,
			createdAt,
			status: message.status || OutboxMessageStatus.PENDING,
			retryCount: message.retryCount || 0,
			maxRetries: message.maxRetries || 3,
		};
	}

	async findByStatus(status: OutboxMessageStatus, limit = 100): Promise<OutboxMessage[]> {
		const stmt = this.db.prepare(`
			SELECT * FROM outbox_messages 
			WHERE status = ? 
			ORDER BY created_at ASC 
			LIMIT ?
		`);

		const rows = stmt.all(status, limit);
		return rows.map((row) => this.mapRowToMessage(row));
	}

	async findReadyForRetry(limit = 100): Promise<OutboxMessage[]> {
		const stmt = this.db.prepare(`
			SELECT * FROM outbox_messages 
			WHERE status = ? AND (next_retry_at IS NULL OR next_retry_at <= datetime('now'))
			ORDER BY created_at ASC 
			LIMIT ?
		`);

		const rows = stmt.all(OutboxMessageStatus.FAILED, limit);
		return rows.map((row) => this.mapRowToMessage(row));
	}

	async findByAggregate(aggregateType: string, aggregateId: string): Promise<OutboxMessage[]> {
		const stmt = this.db.prepare(`
			SELECT * FROM outbox_messages 
			WHERE aggregate_type = ? AND aggregate_id = ?
			ORDER BY created_at ASC
		`);

		const rows = stmt.all(aggregateType, aggregateId);
		return rows.map((row) => this.mapRowToMessage(row));
	}

	async updateStatus(id: string, status: OutboxMessageStatus, error?: string): Promise<void> {
		const stmt = this.db.prepare(`
			UPDATE outbox_messages 
			SET status = ?, last_error = ?
			WHERE id = ?
		`);

		stmt.run(status, error || null, id);
	}

	async markProcessed(id: string, publishedAt?: Date): Promise<void> {
		const stmt = this.db.prepare(`
			UPDATE outbox_messages 
			SET status = ?, published_at = ?
			WHERE id = ?
		`);

		stmt.run(OutboxMessageStatus.PUBLISHED, (publishedAt || new Date()).toISOString(), id);
	}

	async incrementRetry(id: string, error: string): Promise<void> {
		const stmt = this.db.prepare(`
			UPDATE outbox_messages 
			SET retry_count = retry_count + 1, last_error = ?, 
				next_retry_at = datetime('now', '+' || (retry_count * 2) || ' minutes')
			WHERE id = ?
		`);

		stmt.run(error, id);
	}

	async moveToDeadLetter(id: string, error: string): Promise<void> {
		const stmt = this.db.prepare(`
			UPDATE outbox_messages 
			SET status = ?, last_error = ?
			WHERE id = ?
		`);

		stmt.run(OutboxMessageStatus.DEAD_LETTER, error, id);
	}

	async cleanup(olderThan: Date): Promise<number> {
		const stmt = this.db.prepare(`
			DELETE FROM outbox_messages 
			WHERE status IN (?, ?) AND created_at < ?
		`);

		const result = stmt.run(
			OutboxMessageStatus.PUBLISHED,
			OutboxMessageStatus.DEAD_LETTER,
			olderThan.toISOString(),
		);

		return result.changes;
	}

	async existsByIdempotencyKey(idempotencyKey: string): Promise<boolean> {
		const stmt = this.db.prepare('SELECT 1 FROM outbox_messages WHERE idempotency_key = ? LIMIT 1');
		const result = stmt.get(idempotencyKey);
		return Boolean(result);
	}

	private mapRowToMessage(row: SqliteRow): OutboxMessage {
		return {
			id: row.id,
			aggregateType: row.aggregate_type,
			aggregateId: row.aggregate_id,
			eventType: row.event_type,
			payload: JSON.parse(row.payload) as unknown,
			metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
			status: row.status as OutboxMessageStatus,
			createdAt: new Date(row.created_at),
			processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
			publishedAt: row.published_at ? new Date(row.published_at) : undefined,
			retryCount: row.retry_count,
			maxRetries: row.max_retries,
			lastError: row.last_error || undefined,
			nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : undefined,
			idempotencyKey: row.idempotency_key || undefined,
			correlationId: row.correlation_id || undefined,
			causationId: row.causation_id || undefined,
			traceparent: row.traceparent || undefined,
			tracestate: row.tracestate || undefined,
			baggage: row.baggage || undefined,
		};
	}
}

export const createSqliteOutboxRepository = (dbPath?: string): SqliteOutboxRepository => {
	return new SqliteOutboxRepository(dbPath);
};
