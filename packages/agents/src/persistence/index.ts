export type { AgentState } from './agent-state';
export * from './agent-state';
export * from './checkpoint-store';
export * from './database';
export * from './migrations/001_initial';

import type Database from 'better-sqlite3';

type DbType = Database.Database;

import {
	type AgentState,
	type AgentStateListResult,
	type AgentStateQueryOptions,
	AgentStateStore,
	type CreateAgentState,
	type UpdateAgentState,
} from './agent-state';
import {
	type CheckpointListOptions,
	CheckpointStore,
	type CheckpointTuple,
	type PendingWrite,
} from './checkpoint-store';
import { type DatabaseConfig, DatabasePool, getDatabasePool } from './database';
import { MigrationRunner } from './migrations/001_initial';

/**
 * Main persistence interface that combines all storage operations
 */
export class Persistence {
	private readonly db: DbType;
	private readonly pool: DatabasePool;
	private readonly agentStateStore: AgentStateStore;
	private readonly checkpointStore: CheckpointStore;
	private readonly migrationRunner: MigrationRunner;

	/**
	 * Create a new persistence instance
	 */
	constructor(db: DbType) {
		this.db = db;
		this.pool = new DatabasePool({
			path: db.name,
			maxConnections: 10,
			timeout: 5000,
			walEnabled: true,
			foreignKeys: true,
			journalMode: 'wal',
			synchronous: 'normal',
		});
		this.agentStateStore = new AgentStateStore(db);
		this.checkpointStore = new CheckpointStore(db);
		this.migrationRunner = new MigrationRunner(db);
	}

	/**
	 * Initialize the persistence layer with migrations
	 */
	async initialize(): Promise<void> {
		await this.pool.initialize();
		await this.migrationRunner.run();
	}

	/**
	 * Close all database connections
	 */
	async close(): Promise<void> {
		await this.pool.close();
		this.db.close();
	}

	/**
	 * Get the underlying database instance
	 */
	getDatabase(): DbType {
		return this.db;
	}

	/**
	 * Get database pool statistics
	 */
	getPoolStats() {
		return this.pool.getStats();
	}

	// Agent State Operations

	/**
	 * Create a new agent state
	 */
	async createAgentState(data: CreateAgentState): Promise<AgentState> {
		return this.agentStateStore.create(data);
	}

	/**
	 * Find an agent state by ID
	 */
	async findAgentState(id: string): Promise<AgentState | null> {
		return this.agentStateStore.findById(id);
	}

	/**
	 * Find all agent states for a session
	 */
	async findAgentStatesBySession(sessionId: string): Promise<AgentState[]> {
		return this.agentStateStore.findBySessionId(sessionId);
	}

	/**
	 * Find all agent states for an agent
	 */
	async findAgentStatesByAgent(agentId: string): Promise<AgentState[]> {
		return this.agentStateStore.findByAgentId(agentId);
	}

	/**
	 * Update an agent state
	 */
	async updateAgentState(id: string, updates: UpdateAgentState): Promise<AgentState> {
		return this.agentStateStore.update(id, updates);
	}

	/**
	 * Delete an agent state
	 */
	async deleteAgentState(id: string): Promise<void> {
		return this.agentStateStore.delete(id);
	}

	/**
	 * List agent states with pagination and filtering
	 */
	async listAgentStates(options: AgentStateQueryOptions = {}): Promise<AgentStateListResult> {
		return this.agentStateStore.list(options);
	}

	/**
	 * Cleanup old agent states
	 */
	async cleanupAgentStates(olderThanDays: number): Promise<number> {
		return this.agentStateStore.cleanup(olderThanDays);
	}

	/**
	 * Get agent state statistics
	 */
	async getAgentStateStats() {
		return this.agentStateStore.getStats();
	}

	// Checkpoint Operations (LangGraph)

	/**
	 * Create a new checkpoint
	 */
	async createCheckpoint(threadId: string, checkpoint: any, metadata?: any): Promise<string> {
		return this.checkpointStore.createCheckpoint(threadId, checkpoint, metadata);
	}

	/**
	 * Get a checkpoint by ID
	 */
	async getCheckpoint(checkpointId: string): Promise<CheckpointTuple | null> {
		return this.checkpointStore.getCheckpoint(checkpointId);
	}

	/**
	 * List checkpoints for a thread
	 */
	async listCheckpoints(
		threadId: string,
		options?: CheckpointListOptions,
	): Promise<CheckpointTuple[]> {
		return this.checkpointStore.listCheckpoints(threadId, options);
	}

	/**
	 * Get the latest checkpoint for a thread
	 */
	async getLatestCheckpoint(threadId: string): Promise<CheckpointTuple | null> {
		return this.checkpointStore.getLatestCheckpoint(threadId);
	}

	/**
	 * Put pending writes for a thread
	 */
	async putPendingWrites(
		threadId: string,
		taskId: string,
		writes: PendingWrite[],
	): Promise<boolean> {
		return this.checkpointStore.putWrites(threadId, taskId, writes);
	}

	/**
	 * Get pending writes for a thread
	 */
	async getPendingWrites(threadId: string, taskId: string): Promise<PendingWrite[]> {
		return this.checkpointStore.getWrites(threadId, taskId);
	}

	/**
	 * Clear pending writes for a task
	 */
	async clearPendingWrites(threadId: string, taskId: string): Promise<void> {
		return this.checkpointStore.clearPendingWrites(threadId, taskId);
	}

	/**
	 * Delete checkpoints older than the specified date
	 */
	async deleteOldCheckpoints(olderThan: Date): Promise<number> {
		return this.checkpointStore.deleteCheckpoints(olderThan);
	}

	/**
	 * Get checkpoint statistics
	 */
	async getCheckpointStats(threadId?: string) {
		return this.checkpointStore.getStats(threadId);
	}

	// Transaction Support

	/**
	 * Execute a function within a database transaction
	 */
	async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
		return this.pool.withTransaction(fn);
	}

	/**
	 * Execute a function with a connection from the pool
	 */
	async withConnection<T>(fn: (db: DbType) => T): Promise<T> {
		return this.pool.withConnection(fn);
	}

	// Migration Operations

	/**
	 * Run pending migrations
	 */
	async runMigrations(): Promise<void> {
		return this.migrationRunner.run();
	}

	/**
	 * Rollback the last migration
	 */
	async rollbackMigration(): Promise<void> {
		return this.migrationRunner.rollback();
	}

	/**
	 * Get migration status
	 */
	getMigrationStatus() {
		return this.migrationRunner.getStatus();
	}

	// Health Check

	/**
	 * Check if the database is healthy
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const result = this.db.prepare('SELECT 1 as health').get() as { health: number };
			return result.health === 1;
		} catch (error) {
			console.error('Database health check failed:', error);
			return false;
		}
	}

	/**
	 * Get comprehensive persistence statistics
	 */
	async getStats() {
		const [agentStats, checkpointStats, poolStats, migrationStatus] = await Promise.all([
			this.getAgentStateStats(),
			this.getCheckpointStats(),
			this.getPoolStats(),
			Promise.resolve(this.getMigrationStatus()),
		]);

		return {
			agentStates: agentStats,
			checkpoints: checkpointStats,
			pool: poolStats,
			migrations: migrationStatus,
			database: {
				version: this.db.pragma('user_version') as number,
				encoding: this.db.pragma('encoding') as string,
				journalMode: this.db.pragma('journal_mode') as string,
			},
		};
	}
}

/**
 * Factory function to create a persistence instance
 */
export async function createPersistence(config: DatabaseConfig): Promise<Persistence> {
	const pool = await getDatabasePool(config);
	const db = await pool.getConnection();
	const persistence = new Persistence(db);
	await persistence.initialize();
	return persistence;
}

/**
 * Default persistence configuration
 */
export const defaultPersistenceConfig: DatabaseConfig = {
	path: './agents.db',
	maxConnections: 10,
	timeout: 5000,
	walEnabled: true,
	foreignKeys: true,
	journalMode: 'wal',
	synchronous: 'normal',
};
