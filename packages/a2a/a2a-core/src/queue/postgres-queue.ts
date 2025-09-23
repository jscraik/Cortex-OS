import { randomUUID } from 'node:crypto';
import type { Envelope } from '../../../a2a-contracts/src/envelope.js';
import type { DurableQueue, QueueConfig, QueueMessage } from './types.js';

// Mock Pool class since we don't have pg installed
interface PoolClient {
	query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
	release(): void;
}

interface Pool {
	query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
	connect(): Promise<PoolClient>;
	end(): Promise<void>;
}

// Mock pool for now - in real implementation would use 'pg' package
class MockPool implements Pool {
	private readonly messages: Map<string, QueueMessage> = new Map();

	async query(text: string, params: unknown[] = []): Promise<{ rows: unknown[] }> {
		// Simple mock implementation
		if (text.includes('INSERT INTO')) {
			const id = randomUUID();
			const envelope = params[0];
			const message: QueueMessage = {
				id,
				envelope,
				status: 'pending',
				createdAt: new Date().toISOString(),
				lockedUntil: null,
				retryCount: 0,
				lastError: null,
				maxRetries: 3,
			};
			this.messages.set(id, message);
			return { rows: [{ id }] };
		}

		if (text.includes('SELECT COUNT(*)')) {
			return { rows: [{ count: this.messages.size.toString() }] };
		}

		return { rows: [] };
	}

	async connect(): Promise<PoolClient> {
		return {
			query: this.query.bind(this),
			release: () => {},
		};
	}

	async end(): Promise<void> {
		this.messages.clear();
	}
}

export class PostgresQueue implements DurableQueue {
	private readonly pool: Pool;
	private readonly tableName: string;

	constructor(config: QueueConfig) {
		// In real implementation: this.pool = new Pool({ connectionString: config.connectionString });
		this.pool = new MockPool();
		this.tableName = config.tableName;
	}

	async initialize(): Promise<void> {
		await this.createTables();
		await this.setupIndexes();
	}

	private async createTables(): Promise<void> {
		const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        envelope JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        locked_until TIMESTAMPTZ,
        retry_count INT DEFAULT 0,
        last_error TEXT,
        max_retries INT DEFAULT 3
      )
    `;
		await this.pool.query(sql);
	}

	private async setupIndexes(): Promise<void> {
		const indexes = [
			`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status_locked 
       ON ${this.tableName} (status, locked_until)`,
			`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at 
       ON ${this.tableName} (created_at)`,
		];

		for (const index of indexes) {
			await this.pool.query(index);
		}
	}

	async enqueue(envelope: Envelope): Promise<string> {
		const result = await this.pool.query(
			`INSERT INTO ${this.tableName} (envelope) VALUES ($1) RETURNING id`,
			[JSON.stringify(envelope)],
		);

		return (result.rows[0] as { id: string }).id;
	}

	async dequeue(lockDuration = 30000): Promise<QueueMessage | null> {
		const result = await this.pool.query(`
      UPDATE ${this.tableName}
      SET status = 'processing',
          locked_until = NOW() + INTERVAL '${lockDuration} milliseconds'
      WHERE id = (
        SELECT id FROM ${this.tableName}
        WHERE status = 'pending'
          AND (locked_until IS NULL OR locked_until < NOW())
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);

		if (result.rows.length === 0) {
			return null;
		}

		return this.mapRowToMessage(result.rows[0] as Record<string, unknown>);
	}

	async acknowledge(messageId: string): Promise<void> {
		await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [messageId]);
	}

	async reject(messageId: string, error: Error): Promise<void> {
		await this.pool.query(
			`
      UPDATE ${this.tableName}
      SET status = CASE 
          WHEN retry_count >= max_retries THEN 'failed'
          ELSE 'pending'
        END,
        last_error = $2,
        retry_count = retry_count + 1,
        locked_until = NULL
      WHERE id = $1
    `,
			[messageId, error.message],
		);
	}

	async getDepth(): Promise<number> {
		const result = await this.pool.query(
			`SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'pending'`,
		);
		return parseInt((result.rows[0] as { count: string }).count, 10);
	}

	async getMaxDepth(): Promise<number> {
		// For simplicity, return a fixed max depth
		return 1000000;
	}

	async shutdown(): Promise<void> {
		await this.pool.end();
	}

	private mapRowToMessage(row: Record<string, unknown>): QueueMessage {
		return {
			id: row.id as string,
			envelope: JSON.parse(row.envelope as string) as Envelope,
			status: row.status as QueueMessage['status'],
			createdAt: (row.created_at as Date).toISOString(),
			lockedUntil: row.locked_until ? (row.locked_until as Date).toISOString() : null,
			retryCount: row.retry_count as number,
			lastError: row.last_error as string | null,
			maxRetries: row.max_retries as number,
		};
	}
}

export const createPostgresQueue = (config: QueueConfig): PostgresQueue => {
	return new PostgresQueue(config);
};
