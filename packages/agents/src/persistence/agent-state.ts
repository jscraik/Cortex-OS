import { createId } from '@paralleldrive/cuid2';
import type Database from 'better-sqlite3';

type DbType = Database.Database;

import { z } from 'zod';

// Define missing types
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled';

export interface AgentState {
	id: string;
	agentId: string;
	sessionId: string;
	status: AgentStatus;
	currentStep?: string;
	data?: any;
	error?: string | null;
	config?: any;
	createdAt: string;
	updatedAt: string;
}

/**
 * Schema for agent state data
 */
export const AgentStateDataSchema = z.object({
	input: z.string().optional(),
	context: z.record(z.unknown()).optional(),
	result: z.unknown().optional(),
	metadata: z.record(z.unknown()).optional(),
	error: z.string().nullable().optional(),
});

/**
 * Schema for agent configuration
 */
export const AgentConfigSchema = z.object({
	model: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().positive().optional(),
	topP: z.number().min(0).max(1).optional(),
	frequencyPenalty: z.number().min(-2).max(2).optional(),
	presencePenalty: z.number().min(-2).max(2).optional(),
	stop: z.array(z.string()).optional(),
	tools: z.array(z.string()).optional(),
	systemPrompt: z.string().optional(),
});

/**
 * Schema for creating a new agent state
 */
export const CreateAgentStateSchema = z.object({
	agentId: z.string(),
	sessionId: z.string(),
	status: z.enum(['created', 'running', 'paused', 'completed', 'failed', 'cancelled']),
	currentStep: z.string().optional(),
	data: AgentStateDataSchema.optional(),
	error: z.string().nullable().optional(),
	config: AgentConfigSchema.optional(),
});

export type CreateAgentState = z.infer<typeof CreateAgentStateSchema>;

/**
 * Schema for updating an agent state
 */
export const UpdateAgentStateSchema = z.object({
	status: z.enum(['created', 'running', 'paused', 'completed', 'failed', 'cancelled']).optional(),
	currentStep: z.string().optional(),
	data: AgentStateDataSchema.optional(),
	error: z.string().nullable().optional(),
	config: AgentConfigSchema.partial().optional(),
});

export type UpdateAgentState = z.infer<typeof UpdateAgentStateSchema>;

/**
 * Query options for listing agent states
 */
export interface AgentStateQueryOptions {
	limit?: number;
	offset?: number;
	status?: AgentStatus;
	agentId?: string;
	sessionId?: string;
	orderBy?: 'createdAt' | 'updatedAt';
	order?: 'asc' | 'desc';
}

/**
 * Result for paginated agent state listing
 */
export interface AgentStateListResult {
	items: AgentState[];
	total: number;
	hasMore: boolean;
}

/**
 * Agent state store for CRUD operations
 */
export class AgentStateStore {
	private readonly db: DbType;

	constructor(db: DbType) {
		this.db = db;
		this.initializeStatements();
	}

	private statements: {
		create: any;
		findById: any;
		findBySessionId: any;
		findByAgentId: any;
		update: any;
		delete: any;
		list: any;
		count: any;
		cleanup: any;
		createSession: any;
	} = {} as any;

	/**
	 * Initialize prepared statements
	 */
	private initializeStatements(): void {
		this.statements.create = this.db.prepare(`
      INSERT INTO agent_states (
        id, agent_id, session_id, status, current_step,
        data, error, config, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		this.statements.findById = this.db.prepare(`
      SELECT * FROM agent_states WHERE id = ?
    `);

		this.statements.findBySessionId = this.db.prepare(`
      SELECT * FROM agent_states
      WHERE session_id = ?
      ORDER BY updated_at DESC
    `);

		this.statements.findByAgentId = this.db.prepare(`
      SELECT * FROM agent_states
      WHERE agent_id = ?
      ORDER BY updated_at DESC
    `);

		this.statements.update = this.db.prepare(`
      UPDATE agent_states
      SET status = ?, current_step = ?, data = ?, error = ?, config = ?, updated_at = ?
      WHERE id = ?
    `);

		this.statements.delete = this.db.prepare(`
      DELETE FROM agent_states WHERE id = ?
    `);

		this.statements.count = this.db.prepare(`
      SELECT COUNT(*) as count FROM agent_states
    `);

		this.statements.cleanup = this.db.prepare(`
      DELETE FROM agent_states
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);

		this.statements.createSession = this.db.prepare(`
      INSERT OR IGNORE INTO sessions (id, created_at, updated_at, status)
      VALUES (?, ?, ?, ?)
    `);
	}

	/**
	 * Create a new agent state
	 */
	async create(data: CreateAgentState): Promise<AgentState> {
		const validated = CreateAgentStateSchema.parse(data);
		const id = createId();
		const now = new Date().toISOString();

		// Create session if it doesn't exist
		this.statements.createSession.run(validated.sessionId, now, now, 'active');

		this.statements.create.run(
			id,
			validated.agentId,
			validated.sessionId,
			validated.status,
			validated.currentStep || null,
			JSON.stringify(validated.data || {}),
			validated.error || null,
			JSON.stringify(validated.config || {}),
			now,
			now,
		);

		const state = await this.findById(id);
		if (!state) {
			throw new Error(`Agent state with id ${id} not found`);
		}
		return state;
	}

	/**
	 * Find an agent state by ID
	 */
	async findById(id: string): Promise<AgentState | null> {
		const row = this.statements.findById.get(id) as any;
		return row ? this.mapRowToAgentState(row) : null;
	}

	/**
	 * Find all agent states for a session
	 */
	async findBySessionId(sessionId: string): Promise<AgentState[]> {
		const rows = this.statements.findBySessionId.all(sessionId) as any[];
		return rows.map((row) => this.mapRowToAgentState(row));
	}

	/**
	 * Find all agent states for an agent
	 */
	async findByAgentId(agentId: string): Promise<AgentState[]> {
		const rows = this.statements.findByAgentId.all(agentId) as any[];
		return rows.map((row) => this.mapRowToAgentState(row));
	}

	/**
	 * Update an agent state
	 */
	async update(id: string, updates: UpdateAgentState): Promise<AgentState> {
		const validated = UpdateAgentStateSchema.parse(updates);
		const now = new Date().toISOString();

		const result = this.statements.update.run(
			validated.status || null,
			validated.currentStep || null,
			JSON.stringify(validated.data || {}),
			validated.error !== undefined ? validated.error : null,
			JSON.stringify(validated.config || {}),
			now,
			id,
		);

		if (result.changes === 0) {
			throw new Error('Agent state not found');
		}

		const state = await this.findById(id);
		if (!state) {
			throw new Error('Agent state not found after update');
		}
		return state;
	}

	/**
	 * Delete an agent state
	 */
	async delete(id: string): Promise<void> {
		this.statements.delete.run(id);
	}

	/**
	 * List agent states with pagination and filtering
	 */
	async list(options: AgentStateQueryOptions = {}): Promise<AgentStateListResult> {
		const {
			limit = 50,
			offset = 0,
			status,
			agentId,
			sessionId,
			orderBy = 'updatedAt',
			order = 'desc',
		} = options;

		// Build WHERE clause
		const whereConditions: string[] = [];
		const whereParams: any[] = [];

		if (status) {
			whereConditions.push('status = ?');
			whereParams.push(status);
		}

		if (agentId) {
			whereConditions.push('agent_id = ?');
			whereParams.push(agentId);
		}

		if (sessionId) {
			whereConditions.push('session_id = ?');
			whereParams.push(sessionId);
		}

		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

		// Build ORDER BY clause
		const columnMap = {
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		};
		const orderByColumn = columnMap[orderBy] || orderBy;
		const orderByClause = `ORDER BY ${orderByColumn} ${order.toUpperCase()}`;

		// Build LIMIT and OFFSET
		const limitClause = `LIMIT ${limit} OFFSET ${offset}`;

		// Execute query
		const listQuery = `
      SELECT * FROM agent_states
      ${whereClause}
      ${orderByClause}
      ${limitClause}
    `;

		const countQuery = `
      SELECT COUNT(*) as count FROM agent_states
      ${whereClause}
    `;

		const rows = this.db.prepare(listQuery).all(...whereParams) as any[];
		const countResult = this.db.prepare(countQuery).get(...whereParams) as { count: number };

		return {
			items: rows.map((row) => this.mapRowToAgentState(row)),
			total: countResult.count,
			hasMore: offset + limit < countResult.count,
		};
	}

	/**
	 * Cleanup old agent states
	 */
	async cleanup(olderThanDays: number): Promise<number> {
		const result = this.statements.cleanup.run(olderThanDays);
		return result.changes || 0;
	}

	/**
	 * Map database row to AgentState object
	 */
	private mapRowToAgentState(row: any): AgentState {
		return {
			id: row.id,
			agentId: row.agent_id,
			sessionId: row.session_id,
			status: row.status,
			currentStep: row.current_step,
			data: JSON.parse(row.data || '{}'),
			error: row.error,
			config: JSON.parse(row.config || '{}'),
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}

	/**
	 * Execute a function within a transaction
	 */
	async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
		return this.db.transaction(async () => {
			return await fn();
		}) as unknown as Promise<T>;
	}

	/**
	 * Get statistics about agent states
	 */
	async getStats(): Promise<{
		total: number;
		byStatus: Record<AgentStatus, number>;
		oldestRecord: Date | null;
		newestRecord: Date | null;
	}> {
		const total = this.statements.count.get() as { count: number };

		const statusCounts = this.db
			.prepare(`
      SELECT status, COUNT(*) as count
      FROM agent_states
      GROUP BY status
    `)
			.all() as Array<{ status: AgentStatus; count: number }>;

		const byStatus = statusCounts.reduce(
			(acc, { status, count }) => {
				acc[status] = count;
				return acc;
			},
			{} as Record<AgentStatus, number>,
		);

		const oldest = this.db
			.prepare(`
      SELECT MIN(created_at) as oldest FROM agent_states
    `)
			.get() as { oldest: string | null };

		const newest = this.db
			.prepare(`
      SELECT MAX(updated_at) as newest FROM agent_states
    `)
			.get() as { newest: string | null };

		return {
			total: total.count,
			byStatus,
			oldestRecord: oldest?.oldest ? new Date(oldest.oldest) : null,
			newestRecord: newest?.newest ? new Date(newest.newest) : null,
		};
	}
}
