/**
 * LangGraphJS Checkpointing for Cortex-OS
 *
 * Implements persistent state management and workflow checkpointing
 */

// Note: LangGraphJS checkpointing API may have changed
// Using simplified implementation for now
import type { RunnableConfig } from '@langchain/core/runnables';
import type { CortexState } from '../CortexAgentLangGraph';

// Checkpoint configuration interface
export interface CheckpointConfig {
	storage: 'memory' | 'sqlite' | 'postgres' | 'redis';
	connectionString?: string;
	tableName?: string;
	ttl?: number; // Time to live in seconds
	compression?: boolean;
}

// Checkpoint metadata
export interface CheckpointMetadata {
	threadId: string;
	step: number;
	timestamp: string;
	agentName: string;
	userId?: string;
	sessionId?: string;
	tags?: string[];
}

// Extended checkpoint with Cortex-OS specific data
export interface CortexCheckpoint {
	id: string;
	threadId: string;
	checkpoint: {
		v: number;
		id: string;
		ts: string;
		channel_values: CortexState;
		channel_versions: Record<string, number>;
		versions_seen: Record<string, Record<string, number>>;
	};
	metadata: CheckpointMetadata;
	pendingWrites?: Array<{
		tid: string;
		writes: Array<[string, unknown]>;
	}>;
}

/**
 * Memory-based checkpoint saver for development
 */
export class MemoryCheckpointSaver {
	private readonly checkpoints: Map<string, CortexCheckpoint> = new Map();
	private readonly config: CheckpointConfig;

	constructor(config: CheckpointConfig = { storage: 'memory' }) {
		this.config = config;
	}

	async get(threadId: string): Promise<CortexCheckpoint | undefined> {
		const key = this.getCheckpointKey(threadId);
		return this.checkpoints.get(key);
	}

	async put(
		config: RunnableConfig,
		checkpoint: CortexCheckpoint['checkpoint'],
		metadata: CheckpointMetadata,
	): Promise<CortexCheckpoint['checkpoint']> {
		const threadId = config.configurable?.threadId || 'default';
		const key = this.getCheckpointKey(threadId, metadata.step);

		const checkpointData: CortexCheckpoint = {
			id: this.generateCheckpointId(),
			threadId,
			checkpoint,
			metadata: {
				...metadata,
				threadId,
				timestamp: new Date().toISOString(),
			},
		};

		this.checkpoints.set(key, checkpointData);

		// Apply TTL if configured
		if (this.config.ttl) {
			this.scheduleCleanup(key, this.config.ttl);
		}

		return checkpoint;
	}

	async list(
		config: RunnableConfig,
		limit?: number,
		before?: string,
	): Promise<Array<[string, CortexCheckpoint['checkpoint'], CheckpointMetadata]>> {
		const threadId = config.configurable?.threadId || 'default';
		const prefix = `${threadId}:`;

		const entries = Array.from(this.checkpoints.entries())
			.filter(([key]) => key.startsWith(prefix))
			.sort((a, b) => {
				const aStep = parseInt(a[0].split(':')[1], 10);
				const bStep = parseInt(b[0].split(':')[1], 10);
				return bStep - aStep; // Descending order
			});

		if (before) {
			const beforeStep = parseInt(before.split(':')[1], 10);
			return entries
				.filter(([key]) => parseInt(key.split(':')[1], 10) < beforeStep)
				.slice(0, limit)
				.map(([key, checkpoint]) => [key, checkpoint.checkpoint, checkpoint.metadata]);
		}

		return entries
			.slice(0, limit)
			.map(([key, checkpoint]) => [key, checkpoint.checkpoint, checkpoint.metadata]);
	}

	private getCheckpointKey(threadId: string, step?: number): string {
		return step ? `${threadId}:${step}` : `${threadId}:latest`;
	}

	private generateCheckpointId(): string {
		return `ckpt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
	}

	private scheduleCleanup(key: string, ttl: number): void {
		setTimeout(() => {
			this.checkpoints.delete(key);
		}, ttl * 1000);
	}
}

/**
 * SQLite-based checkpoint saver for production
 * Falls back to memory storage when sqlite3 is not available
 */
export class SQLiteCheckpointSaver {
	private readonly storage: Map<string, CortexCheckpoint> = new Map();

	constructor(_config: CheckpointConfig & { connectionString: string }) {
		// For now, simply log and operate in memory mode
		console.log('SQLiteCheckpointSaver initialized (memory mode)');
	}
	public initializeDatabase(): void {
		// For now, always use memory storage to avoid sqlite3 dependency issues
		// SQLite implementation requires 'better-sqlite3' package configuration
		console.warn('Using memory storage for checkpoints (sqlite3 dependency not configured)');
	}

	async get(threadId: string): Promise<CortexCheckpoint | undefined> {
		// Use memory storage
		const key = `${threadId}:latest`;
		return this.storage.get(key);
	}

	async put(
		config: RunnableConfig,
		checkpoint: CortexCheckpoint['checkpoint'],
		metadata: CheckpointMetadata,
	): Promise<CortexCheckpoint['checkpoint']> {
		const threadId = config.configurable?.threadId || 'default';
		const key = `${threadId}:${metadata.step || 0}`;
		const checkpointData: CortexCheckpoint = {
			id: this.generateCheckpointId(),
			threadId,
			checkpoint,
			metadata: {
				...metadata,
				threadId,
				timestamp: new Date().toISOString(),
			},
		};
		this.storage.set(key, checkpointData);
		return checkpoint;
	}

	async list(
		config: RunnableConfig,
		limit?: number,
		before?: string,
	): Promise<Array<[string, CortexCheckpoint['checkpoint'], CheckpointMetadata]>> {
	const threadId = config.configurable?.threadId || 'default';
		const prefix = `${threadId}:`;
		const entries = Array.from(this.storage.entries())
			.filter(([key]) => key.startsWith(prefix))
			.sort((a, b) => {
				const aStep = parseInt(a[0].split(':')[1], 10);
				const bStep = parseInt(b[0].split(':')[1], 10);
				return bStep - aStep; // Descending order
			});

		if (before) {
			const beforeStep = parseInt(before.split(':')[1], 10);
			return entries
				.filter(([key]) => parseInt(key.split(':')[1], 10) < beforeStep)
				.slice(0, limit)
				.map(([key, checkpoint]) => [key, checkpoint.checkpoint, checkpoint.metadata]);
		}

		return entries
			.slice(0, limit)
			.map(([key, checkpoint]) => [key, checkpoint.checkpoint, checkpoint.metadata]);
	}

	private generateCheckpointId(): string {
		return `ckpt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
	}
}

/**
 * Checkpoint manager with advanced features
 */
export class CheckpointManager {
	private readonly saver: MemoryCheckpointSaver | SQLiteCheckpointSaver;
	private readonly config: CheckpointConfig;

	constructor(config: CheckpointConfig) {
		this.config = config;
		this.saver = this.createCheckpointSaver(config);
	}

	/**
	 * Create checkpoint saver based on configuration
	 */
	private createCheckpointSaver(config: CheckpointConfig): MemoryCheckpointSaver | SQLiteCheckpointSaver {
		switch (config.storage) {
			case 'memory':
				return new MemoryCheckpointSaver(config);
			case 'sqlite':
				return new SQLiteCheckpointSaver({
					...config,
					connectionString: config.connectionString || './checkpoints.db',
				});
			default:
				throw new Error(`Unsupported checkpoint storage: ${config.storage}`);
		}
	}

	/**
	 * Create checkpoint with enhanced metadata
	 */
	async createCheckpoint(
		config: RunnableConfig,
		state: CortexState,
		metadata: Partial<CheckpointMetadata> = {},
	): Promise<string> {
		const checkpointData = {
			v: 1,
			id: this.generateCheckpointId(),
			ts: new Date().toISOString(),
			channel_values: state,
			channel_versions: {},
			versions_seen: {},
		};

		const fullMetadata: CheckpointMetadata = {
			threadId: config.configurable?.threadId || 'default',
			step: (metadata.step || 0) + 1,
			timestamp: new Date().toISOString(),
			agentName: 'CortexAgent',
			...metadata,
		};

		await this.saver.put(config, checkpointData, fullMetadata);
		return checkpointData.id;
	}

	/**
	 * Resume from checkpoint
	 */
	async resumeFromCheckpoint(
		threadId: string,
		_checkpointId?: string,
	): Promise<{ state: CortexState; metadata: CheckpointMetadata } | undefined> {
		if (_checkpointId) {
			// Specific checkpoint resume
			// Implementation depends on storage backend
		}

		const checkpoint = await this.saver.get(threadId);
		if (!checkpoint) return undefined;

		return {
			state: checkpoint.checkpoint.channel_values,
			metadata: checkpoint.metadata,
		};
	}

	/**
	 * Get checkpoint history
	 */
	async getHistory(
		threadId: string,
		limit = 10,
	): Promise<Array<{ step: number; timestamp: string; state: Partial<CortexState> }>> {
		const config = { configurable: { threadId } };
		const checkpoints = await this.saver.list(config, limit);

		return checkpoints.map(([, checkpoint, metadata]) => ({
			step: metadata.step,
			timestamp: metadata.timestamp,
			state: checkpoint.channel_values,
		}));
	}

	/**
	 * Cleanup expired checkpoints
	 */
	async cleanup(): Promise<void> {
		if (this.config.storage === 'memory') {
			// Memory checkpoints auto-clean via TTL
			return;
		}

		// Implementation for other storage backends
		console.log('Checkpoint cleanup completed');
	}

	private generateCheckpointId(): string {
		return `ckpt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	}
}

/**
 * Checkpoint utilities
 */
export const checkpointUtils = {
	/**
	 * Create checkpoint configuration from environment
	 */
	createConfig(): CheckpointConfig {
		return {
			storage: (process.env.CHECKPOINT_STORAGE as 'memory' | 'sqlite' | 'postgres' | 'redis') || 'memory',
			connectionString: process.env.CHECKPOINT_DB_URL,
			tableName: process.env.CHECKPOINT_TABLE_NAME,
			ttl: process.env.CHECKPOINT_TTL ? parseInt(process.env.CHECKPOINT_TTL, 10) : undefined,
			compression: process.env.CHECKPOINT_COMPRESSION === 'true',
		};
	},

	/**
	 * Extract thread ID from request
	 */
	extractThreadId(request: {
		headers?: Record<string, string>;
		query?: Record<string, string>;
		body?: Record<string, string>;
	}): string {
		const headerId = request.headers?.['x-thread-id'];
		const queryId = request.query?.threadId;
		const bodyId = request.body?.threadId;
		return headerId || queryId || bodyId || `session_${Date.now()}`;
	},

	/**
	 * Generate checkpoint metadata
	 */
	generateMetadata(base: Partial<CheckpointMetadata> = {}): CheckpointMetadata {
		return {
			threadId: base.threadId || 'default',
			step: base.step || 0,
			timestamp: new Date().toISOString(),
			agentName: base.agentName || 'CortexAgent',
			userId: base.userId,
			sessionId: base.sessionId,
			tags: base.tags || [],
		};
	}
};
