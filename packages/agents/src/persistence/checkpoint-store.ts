import { createId } from '@paralleldrive/cuid2';
import type Database from 'better-sqlite3';

type DbType = Database.Database;

import { z } from 'zod';

/**
 * LangGraph checkpoint structure
 */
export const CheckpointSchema = z.object({
	v: z.number(),
	id: z.string(),
	ts: z.string(), // ISO timestamp
	channel_values: z.record(z.unknown()),
	channel_versions: z.record(z.number()),
	versions_seen: z.record(z.record(z.number())),
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;

/**
 * Checkpoint metadata
 */
export const CheckpointMetadataSchema = z.object({
	source: z.string().optional(),
	step: z.number().optional(),
	parentCheckpointId: z.string().nullable().optional(),
	threadId: z.string().optional(),
	tags: z.array(z.string()).optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export type CheckpointMetadata = z.infer<typeof CheckpointMetadataSchema>;

/**
 * Pending write operation
 */
export const PendingWriteSchema = z.object({
	channel: z.string(),
	value: z.unknown(),
});

export type PendingWrite = z.infer<typeof PendingWriteSchema>;

/**
 * Options for listing checkpoints
 */
export interface CheckpointListOptions {
	limit?: number;
	before?: string; // checkpoint ID
	after?: string; // checkpoint ID
}

/**
 * Checkpoint with metadata
 */
export interface CheckpointTuple {
	config: { configurable: { thread_id: string } };
	checkpoint: Checkpoint;
	metadata: CheckpointMetadata;
}

/**
 * Checkpoint store for LangGraph integration
 */
export class CheckpointStore {
	private readonly db: DbType;

	constructor(db: DbType) {
		this.db = db;
		this.initializeStatements();
	}

	private statements: {
		createCheckpoint: any;
		getCheckpoint: any;
		listCheckpoints: any;
		getLatestCheckpoint: any;
		putWrites: any;
		getWrites: any;
		deleteCheckpoints: any;
		deletePendingWrites: any;
	} = {} as any;

	/**
	 * Initialize prepared statements
	 */
	private initializeStatements(): void {
		this.statements.createCheckpoint = this.db.prepare(`
      INSERT INTO checkpoints (
        id, thread_id, checkpoint_data, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

		this.statements.getCheckpoint = this.db.prepare(`
      SELECT * FROM checkpoints WHERE id = ?
    `);

		this.statements.listCheckpoints = this.db.prepare(`
      SELECT * FROM checkpoints
      WHERE thread_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

		this.statements.getLatestCheckpoint = this.db.prepare(`
      SELECT * FROM checkpoints
      WHERE thread_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

		this.statements.putWrites = this.db.prepare(`
      INSERT OR REPLACE INTO pending_writes (
        id, thread_id, task_id, writes, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

		this.statements.getWrites = this.db.prepare(`
      SELECT writes FROM pending_writes
      WHERE thread_id = ? AND task_id = ?
    `);

		this.statements.deleteCheckpoints = this.db.prepare(`
      DELETE FROM checkpoints
      WHERE created_at < ?
    `);

		this.statements.deletePendingWrites = this.db.prepare(`
      DELETE FROM pending_writes
      WHERE thread_id = ? AND task_id = ?
    `);
	}

	/**
	 * Create a new checkpoint
	 */
	async createCheckpoint(
		threadId: string,
		checkpoint: Checkpoint,
		metadata?: Partial<CheckpointMetadata>,
	): Promise<string> {
		const validatedCheckpoint = CheckpointSchema.parse(checkpoint);
		const validatedMetadata = CheckpointMetadataSchema.parse(metadata || {});

		const id = createId();
		const now = new Date().toISOString();

		this.statements.createCheckpoint.run(
			id,
			threadId,
			JSON.stringify(validatedCheckpoint),
			JSON.stringify({ ...validatedMetadata, threadId, createdAt: now, updatedAt: now }),
			now,
		);

		return id;
	}

	/**
	 * Get a checkpoint by ID
	 */
	async getCheckpoint(checkpointId: string): Promise<CheckpointTuple | null> {
		const row = this.statements.getCheckpoint.get(checkpointId) as any;

		if (!row) {
			return null;
		}

		return {
			config: { configurable: { thread_id: row.thread_id } },
			checkpoint: JSON.parse(row.checkpoint_data),
			metadata: JSON.parse(row.metadata),
		};
	}

	/**
	 * List checkpoints for a thread
	 */
	async listCheckpoints(
		threadId: string,
		options: CheckpointListOptions = {},
	): Promise<CheckpointTuple[]> {
		const { limit = 10 } = options;

		const rows = this.statements.listCheckpoints.all(threadId, limit) as any[];

		return rows.map((row) => ({
			config: { configurable: { thread_id: row.thread_id } },
			checkpoint: JSON.parse(row.checkpoint_data),
			metadata: JSON.parse(row.metadata),
		}));
	}

	/**
	 * Get the latest checkpoint for a thread
	 */
	async getLatestCheckpoint(threadId: string): Promise<CheckpointTuple | null> {
		const row = this.statements.getLatestCheckpoint.get(threadId) as any;

		if (!row) {
			return null;
		}

		return {
			config: { configurable: { thread_id: row.thread_id } },
			checkpoint: JSON.parse(row.checkpoint_data),
			metadata: JSON.parse(row.metadata),
		};
	}

	/**
	 * Put pending writes for a thread
	 */
	async putWrites(threadId: string, taskId: string, writes: PendingWrite[]): Promise<boolean> {
		const validatedWrites = PendingWriteSchema.array().parse(writes);
		const id = `${threadId}:${taskId}`;
		const now = new Date().toISOString();

		this.statements.putWrites.run(id, threadId, taskId, JSON.stringify(validatedWrites), now);

		return true;
	}

	/**
	 * Get pending writes for a thread
	 */
	async getWrites(threadId: string, taskId: string): Promise<PendingWrite[]> {
		const row = this.statements.getWrites.get(threadId, taskId) as any;

		if (!row) {
			return [];
		}

		return JSON.parse(row.writes);
	}

	/**
	 * Delete checkpoints older than the specified date
	 */
	async deleteCheckpoints(olderThan: Date): Promise<number> {
		const result = this.statements.deleteCheckpoints.run(olderThan.toISOString());
		return result.changes || 0;
	}

	/**
	 * Clear pending writes for a task
	 */
	async clearPendingWrites(threadId: string, taskId: string): Promise<void> {
		this.statements.deletePendingWrites.run(threadId, taskId);
	}

	/**
	 * Create checkpoint tuple (for LangGraph compatibility)
	 */
	async put(
		config: { configurable: { thread_id: string } },
		checkpoint: Checkpoint,
		metadata?: CheckpointMetadata,
	): Promise<{ config: typeof config; checkpoint: Checkpoint }> {
		const checkpointId = await this.createCheckpoint(
			config.configurable.thread_id,
			checkpoint,
			metadata,
		);

		const stored = await this.getCheckpoint(checkpointId);
		if (!stored) {
			throw new Error('Failed to store checkpoint');
		}

		return {
			config: stored.config,
			checkpoint: stored.checkpoint,
		};
	}

	/**
	 * Get checkpoint tuple (for LangGraph compatibility)
	 */
	async get(config: { configurable: { thread_id: string } }): Promise<CheckpointTuple | null> {
		return this.getLatestCheckpoint(config.configurable.thread_id);
	}

	/**
	 * List checkpoint tuples (for LangGraph compatibility)
	 */
	async list(
		config: { configurable: { thread_id: string } },
		limit?: number,
		before?: string,
	): Promise<CheckpointTuple[]> {
		const options: CheckpointListOptions = { limit };
		if (before) {
			options.before = before;
		}
		return this.listCheckpoints(config.configurable.thread_id, options);
	}

	/**
	 * Get writes for a thread (for LangGraph compatibility)
	 */
	async getTupleWrites(
		config: { configurable: { thread_id: string } },
		taskId: string,
	): Promise<PendingWrite[]> {
		return this.getWrites(config.configurable.thread_id, taskId);
	}

	/**
	 * Execute a function within a transaction
	 */
	async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
		// better-sqlite3 doesn't support async functions directly in transactions
		// We'll use a simpler approach for now
		try {
			this.db.exec('BEGIN TRANSACTION');
			const result = await fn();
			this.db.exec('COMMIT');
			return result;
		} catch (error) {
			this.db.exec('ROLLBACK');
			throw error;
		}
	}

	/**
	 * Get statistics about checkpoints
	 */
	async getStats(threadId?: string): Promise<{
		totalCheckpoints: number;
		totalPendingWrites: number;
		oldestCheckpoint: Date | null;
		newestCheckpoint: Date | null;
	}> {
		let checkpointCount: number;
		let oldestCheckpoint: Date | null = null;
		let newestCheckpoint: Date | null = null;

		if (threadId) {
			const countStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM checkpoints WHERE thread_id = ?
      `);
			checkpointCount = (countStmt.get(threadId) as { count: number }).count;

			const oldestStmt = this.db.prepare(`
        SELECT MIN(created_at) as oldest FROM checkpoints WHERE thread_id = ?
      `);
			const oldest = oldestStmt.get(threadId) as { oldest: string | null };
			oldestCheckpoint = oldest?.oldest ? new Date(oldest.oldest) : null;

			const newestStmt = this.db.prepare(`
        SELECT MAX(created_at) as newest FROM checkpoints WHERE thread_id = ?
      `);
			const newest = newestStmt.get(threadId) as { newest: string | null };
			newestCheckpoint = newest?.newest ? new Date(newest.newest) : null;
		} else {
			const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM checkpoints');
			checkpointCount = (countStmt.get() as { count: number }).count;

			const oldestStmt = this.db.prepare('SELECT MIN(created_at) as oldest FROM checkpoints');
			const oldest = oldestStmt.get() as { oldest: string | null };
			oldestCheckpoint = oldest?.oldest ? new Date(oldest.oldest) : null;

			const newestStmt = this.db.prepare('SELECT MAX(created_at) as newest FROM checkpoints');
			const newest = newestStmt.get() as { newest: string | null };
			newestCheckpoint = newest?.newest ? new Date(newest.newest) : null;
		}

		const writeCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM pending_writes');
		const writeCount = (writeCountStmt.get() as { count: number }).count;

		return {
			totalCheckpoints: checkpointCount,
			totalPendingWrites: writeCount,
			oldestCheckpoint,
			newestCheckpoint,
		};
	}

	/**
	 * Vacuum the database to reclaim space
	 */
	async vacuum(): Promise<void> {
		this.db.exec('VACUUM');
	}

	/**
	 * Analyze the database for query optimization
	 */
	async analyze(): Promise<void> {
		this.db.exec('ANALYZE');
	}
}
