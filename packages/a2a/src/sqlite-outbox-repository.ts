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

interface BetterSqliteLike {
	exec: (sql: string) => unknown;
	prepare: (sql: string) => {
		run: (...params: unknown[]) => { changes?: number };
		all: (...params: unknown[]) => unknown[];
		get: (...params: unknown[]) => unknown;
	};
	transaction: (fn: () => void | Promise<void>) => () => void;
}

type FallbackRow = {
	id: string;
	aggregate_type: string;
	aggregate_id: string;
	event_type: string;
	payload: string;
	metadata: string | null;
	status: string;
	created_at: number;
	processed_at: number | null;
	published_at: number | null;
	retry_count: number;
	max_retries: number;
	last_error: string | null;
	next_retry_at: number | null;
	idempotency_key: string | null;
	correlation_id: string | null;
	causation_id: string | null;
	traceparent: string | null;
	tracestate: string | null;
	baggage: string | null;
};

const createIndexes = () => ({
	byStatus: new Map<string, FallbackRow[]>(),
	byAggregate: new Map<string, FallbackRow[]>(),
	byId: new Map<string, FallbackRow>(),
	byIdempotency: new Map<string, FallbackRow>(),
});

const rebuildIndexes = (store: FallbackRow[], indexes: ReturnType<typeof createIndexes>) => {
	indexes.byStatus.clear();
	indexes.byAggregate.clear();
	indexes.byId.clear();
	indexes.byIdempotency.clear();
	for (const row of store) {
		indexes.byId.set(row.id, row);
		if (row.idempotency_key) indexes.byIdempotency.set(row.idempotency_key, row);
		const statusList = indexes.byStatus.get(row.status) || [];
		statusList.push(row);
		indexes.byStatus.set(row.status, statusList);
		const aggKey = `${row.aggregate_type}|${row.aggregate_id}`;
		const aggList = indexes.byAggregate.get(aggKey) || [];
		aggList.push(row);
		indexes.byAggregate.set(aggKey, aggList);
	}
};

const insertRow = (
	params: unknown[],
	store: FallbackRow[],
	indexes: ReturnType<typeof createIndexes>,
) => {
	const [
		id,
		aggregate_type,
		aggregate_id,
		event_type,
		payload,
		metadata,
		status,
		created_at,
		processed_at,
		published_at,
		retry_count,
		max_retries,
		last_error,
		next_retry_at,
		idempotency_key,
		correlation_id,
		causation_id,
		traceparent,
		tracestate,
		baggage,
	] = params as [
		string,
		string,
		string,
		string,
		string,
		string | null,
		string,
		number,
		number | null,
		number | null,
		number,
		number,
		string | null,
		number | null,
		string | null,
		string | null,
		string | null,
		string | null,
		string | null,
		string | null,
	];
	const row: FallbackRow = {
		id,
		aggregate_type,
		aggregate_id,
		event_type,
		payload,
		metadata,
		status,
		created_at,
		processed_at,
		published_at,
		retry_count,
		max_retries,
		last_error,
		next_retry_at,
		idempotency_key,
		correlation_id,
		causation_id,
		traceparent,
		tracestate,
		baggage,
	};
	store.push(row);
	rebuildIndexes(store, indexes);
	return { changes: 1 } as const;
};

const updateNextRetry = (params: unknown[], indexes: ReturnType<typeof createIndexes>) => {
	const [next_retry_at, id] = params as [number, string];
	const row = indexes.byId.get(id);
	if (!row) return { changes: 0 } as const;
	row.next_retry_at = next_retry_at;
	return { changes: 1 } as const;
};

const updateStatusAndError = (params: unknown[], indexes: ReturnType<typeof createIndexes>) => {
	const [status, last_error, id] = params as [string, string | null, string];
	const row = indexes.byId.get(id);
	if (!row) return { changes: 0 } as const;
	row.status = status;
	row.last_error = last_error;
	return { changes: 1 } as const;
};

const updateProcessed = (params: unknown[], indexes: ReturnType<typeof createIndexes>) => {
	const [status, published_at, processed_at, id] = params as [string, number, number, string];
	const row = indexes.byId.get(id);
	if (!row) return { changes: 0 } as const;
	row.status = status;
	row.published_at = published_at;
	row.processed_at = processed_at;
	return { changes: 1 } as const;
};

const updateRetry = (params: unknown[], indexes: ReturnType<typeof createIndexes>) => {
	const [retry_count, last_error, status, next_retry_at, id] = params as [
		number,
		string,
		string,
		number,
		string,
	];
	const row = indexes.byId.get(id);
	if (!row) return { changes: 0 } as const;
	row.retry_count = retry_count;
	row.last_error = last_error;
	row.status = status;
	row.next_retry_at = next_retry_at;
	return { changes: 1 } as const;
};

const deleteOldProcessed = (
	params: unknown[],
	store: FallbackRow[],
	indexes: ReturnType<typeof createIndexes>,
) => {
	const [status1, status2, cutoff] = params as [string, string, number];
	const before = store.length;
	for (let i = store.length - 1; i >= 0; i--) {
		const r = store[i];
		if ((r.status === status1 || r.status === status2) && (r.processed_at ?? Infinity) < cutoff) {
			store.splice(i, 1);
		}
	}
	rebuildIndexes(store, indexes);
	return { changes: before - store.length } as const;
};

const selectByStatus = (params: unknown[], indexes: ReturnType<typeof createIndexes>) => {
	const [status, limit] = params as [string, number | undefined];
	const rows = (indexes.byStatus.get(status) || [])
		.slice()
		.sort((a, b) => a.created_at - b.created_at);
	return typeof limit === 'number' ? rows.slice(0, limit) : rows;
};

const selectByAggregate = (params: unknown[], indexes: ReturnType<typeof createIndexes>) => {
	const [aggregate_type, aggregate_id] = params as [string, string];
	const key = `${aggregate_type}|${aggregate_id}`;
	return (indexes.byAggregate.get(key) || []).slice().sort((a, b) => a.created_at - b.created_at);
};

const selectReadyForRetry = (params: unknown[], indexes: ReturnType<typeof createIndexes>) => {
	const [status, now, limit] = params as [string, number, number | undefined];
	let rows = (indexes.byStatus.get(status) || []).filter(
		(r) =>
			(r.retry_count ?? 0) < (r.max_retries ?? 3) &&
			(r.next_retry_at == null || r.next_retry_at <= now),
	);
	rows = rows.slice().sort((a, b) => a.created_at - b.created_at);
	return typeof limit === 'number' ? rows.slice(0, limit) : rows;
};

const selectRetryMeta = (params: unknown[], indexes: ReturnType<typeof createIndexes>) => {
	const [id] = params as [string];
	const row = indexes.byId.get(id);
	return row ? { retry_count: row.retry_count ?? 0, max_retries: row.max_retries ?? 3 } : undefined;
};

const selectIdempotency = (params: unknown[], indexes: ReturnType<typeof createIndexes>) => {
	const [idempotency_key] = params as [string];
	const row = indexes.byIdempotency.get(idempotency_key);
	return row ? 1 : undefined;
};

const createFallbackDb = (): BetterSqliteLike => {
	const store: FallbackRow[] = [];
	const indexes = createIndexes();

	return {
		exec: (_sql: string) => {
			// ignore schema/index creation in fallback
		},
		prepare: (sql: string) => {
			const isInsert = /INSERT\s+INTO\s+outbox_messages/i.test(sql);
			return {
				run: (...params: unknown[]) => {
					if (isInsert) return insertRow(params, store, indexes);
					if (sql.includes('SET status = ?, last_error = ?'))
						return updateStatusAndError(params, indexes);
					if (sql.includes('SET status = ?, published_at = ?, processed_at = ?'))
						return updateProcessed(params, indexes);
					if (sql.includes('SET retry_count = ?, last_error = ?, status = ?, next_retry_at = ?'))
						return updateRetry(params, indexes);
					if (sql.includes('DELETE FROM outbox_messages'))
						return deleteOldProcessed(params, store, indexes);
					if (sql.includes('UPDATE outbox_messages SET next_retry_at = ? WHERE id = ?'))
						return updateNextRetry(params, indexes);
					return { changes: 0 } as const;
				},
				all: (...params: unknown[]) => {
					if (sql.includes('WHERE status = ? ORDER BY created_at ASC'))
						return selectByStatus(params, indexes);
					if (sql.includes('WHERE aggregate_type = ? AND aggregate_id = ?'))
						return selectByAggregate(params, indexes);
					if (
						sql.includes('WHERE status = ?') &&
						sql.includes('retry_count < max_retries') &&
						sql.includes('(next_retry_at IS NULL OR next_retry_at <= ?)')
					)
						return selectReadyForRetry(params, indexes);
					return [];
				},
				get: (...params: unknown[]) => {
					if (sql.includes('SELECT retry_count, max_retries FROM outbox_messages WHERE id = ?'))
						return selectRetryMeta(params, indexes);
					if (sql.includes('SELECT 1 FROM outbox_messages') && sql.includes('idempotency_key = ?'))
						return selectIdempotency(params, indexes);
					return undefined;
				},
			};
		},
		transaction: (fn: () => void | Promise<void>) => () => fn(),
	};
};

export class SqliteOutboxRepository implements OutboxRepository {
	private db: BetterSqliteLike;

	constructor(dbPath: string = ':memory:') {
		// Dynamically import better-sqlite3 to avoid hard dependency
		try {
			// Using dynamic import with workaround for synchronous constructor
			let SqliteConstructor;
			try {
				// Try to load better-sqlite3 synchronously for CommonJS compatibility
				// biome-ignore lint: Dynamic require needed for optional dependency
				SqliteConstructor = require('better-sqlite3');
			} catch {
				throw new Error('better-sqlite3 not available');
			}
			this.db = new SqliteConstructor(dbPath) as unknown as BetterSqliteLike;

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
		} catch (err) {
			console.warn('better-sqlite3 unavailable; using in-memory fallback for tests.', err);
			this.db = createFallbackDb();
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
			const params: (string | number)[] = [status];

			if (limit) {
				query += ' LIMIT ?';
				params.push(limit);
			}

			const stmt = this.db.prepare(query);
			const rows = stmt.all(...params) as FallbackRow[];

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
			const params: (string | number)[] = [OutboxMessageStatus.FAILED, now];

			if (limit) {
				query += ' LIMIT ?';
				params.push(limit);
			}

			const stmt = this.db.prepare(query);
			const rows = stmt.all(...params) as FallbackRow[];

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
			const rows = stmt.all(aggregateType, aggregateId) as FallbackRow[];

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
			const row = selectStmt.get(id) as { retry_count: number; max_retries: number } | undefined;

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

			const changes = result && typeof result.changes === 'number' ? result.changes : 0;
			return changes;
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
