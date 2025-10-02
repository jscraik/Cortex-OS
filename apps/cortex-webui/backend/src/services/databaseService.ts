// Database Service for brAInwav Cortex WebUI
// High-performance database with connection pooling and query optimization

import { performance } from 'node:perf_hooks';
import type { Database } from 'sqlite3';
import sqlite3 from 'sqlite3';
import { MetricsService } from '../monitoring/services/metricsService.js';
import { cacheService } from './cacheService.js';

export interface DatabaseConfig {
	filename: string;
	mode?: number;
	maxConnections?: number;
	connectionTimeout?: number;
	queryTimeout?: number;
	walMode?: boolean;
	cacheSize?: number;
	journalMode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';
	synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
	tempStore?: 'DEFAULT' | 'FILE' | 'MEMORY';
	mmapSize?: number;
	secureDelete?: boolean;
	foreignKeys?: boolean;
}

export interface QueryOptions {
	timeout?: number;
	cacheable?: boolean;
	cacheTTL?: number;
	useCache?: boolean;
	parameters?: any[];
}

export interface QueryResult<T = any> {
	rows: T[];
	changes?: number;
	lastInsertRowid?: number;
	queryTime: number;
	cacheHit: boolean;
}

export interface DatabaseStats {
	totalQueries: number;
	cacheHits: number;
	cacheMisses: number;
	averageQueryTime: number;
	slowQueries: number;
	connectionPoolSize: number;
	activeConnections: number;
	peakConnections: number;
	totalRowsReturned: number;
	totalRowsAffected: number;
}

export interface BatchOperation {
	query: string;
	parameters?: any[];
}

export class DatabaseService {
	private static instance: DatabaseService;
	private pool: Database[] = [];
	private config: Required<DatabaseConfig>;
	private stats: DatabaseStats = {
		totalQueries: 0,
		cacheHits: 0,
		cacheMisses: 0,
		averageQueryTime: 0,
		slowQueries: 0,
		connectionPoolSize: 0,
		activeConnections: 0,
		peakConnections: 0,
		totalRowsReturned: 0,
		totalRowsAffected: 0,
	};
	private queryTimes: number[] = [];
	private connectionQueue: ((connection: Database) => void)[] = [];
	private metricsService: MetricsService;
	private initialized = false;

	private constructor(config: DatabaseConfig) {
		this.config = {
			filename: config.filename,
			mode: config.mode || sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
			maxConnections: config.maxConnections || 10,
			connectionTimeout: config.connectionTimeout || 30000,
			queryTimeout: config.queryTimeout || 10000,
			walMode: config.walMode !== false,
			cacheSize: config.cacheSize || -2000, // 2MB cache
			journalMode: config.journalMode || 'WAL',
			synchronous: config.synchronous || 'NORMAL',
			tempStore: config.tempStore || 'MEMORY',
			mmapSize: config.mmapSize || 268435456, // 256MB
			secureDelete: config.secureDelete !== false,
			foreignKeys: config.foreignKeys !== false,
		};

		this.metricsService = MetricsService.getInstance();
	}

	public static getInstance(config?: DatabaseConfig): DatabaseService {
		if (!DatabaseService.instance) {
			if (!config) {
				throw new Error('Database config required for first initialization');
			}
			DatabaseService.instance = new DatabaseService(config);
		}
		return DatabaseService.instance;
	}

	public static initializeFromEnv(): DatabaseService {
		const config: DatabaseConfig = {
			filename: process.env.DATABASE_PATH || './cortex-webui.db',
			mode: process.env.DATABASE_MODE ? parseInt(process.env.DATABASE_MODE, 10) : undefined,
			maxConnections: process.env.DB_MAX_CONNECTIONS
				? parseInt(process.env.DB_MAX_CONNECTIONS, 10)
				: undefined,
			connectionTimeout: process.env.DB_CONNECTION_TIMEOUT
				? parseInt(process.env.DB_CONNECTION_TIMEOUT, 10)
				: undefined,
			queryTimeout: process.env.DB_QUERY_TIMEOUT
				? parseInt(process.env.DB_QUERY_TIMEOUT, 10)
				: undefined,
			walMode: process.env.DB_WAL_MODE !== 'false',
			cacheSize: process.env.DB_CACHE_SIZE ? parseInt(process.env.DB_CACHE_SIZE, 10) : undefined,
			journalMode: process.env.DB_JOURNAL_MODE as any,
			synchronous: process.env.DB_SYNCHRONOUS as any,
			tempStore: process.env.DB_TEMP_STORE as any,
			mmapSize: process.env.DB_MMAP_SIZE ? parseInt(process.env.DB_MMAP_SIZE, 10) : undefined,
			secureDelete: process.env.DB_SECURE_DELETE !== 'false',
			foreignKeys: process.env.DB_FOREIGN_KEYS !== 'false',
		};

		return DatabaseService.getInstance(config);
	}

	public async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			// Create initial connections
			for (let i = 0; i < Math.min(3, this.config.maxConnections); i++) {
				await this.createConnection();
			}

			// Configure database settings
			await this.configureDatabase();

			// Create optimized indexes
			await this.createIndexes();

			// Start maintenance tasks
			this.startMaintenanceTasks();

			this.initialized = true;
			console.log('Database service initialized successfully');
		} catch (error) {
			console.error('Database initialization failed:', error);
			throw error;
		}
	}

	private async createConnection(): Promise<Database> {
		return new Promise((resolve, reject) => {
			const db = new sqlite3.Database(this.config.filename, this.config.mode, (error) => {
				if (error) {
					reject(error);
					return;
				}

				// Configure connection settings
				this.configureConnection(db);

				this.pool.push(db);
				this.stats.connectionPoolSize = this.pool.length;
				resolve(db);
			});
		});
	}

	private configureConnection(db: Database): void {
		// Set performance optimization settings
		const settings = [
			`PRAGMA cache_size = ${this.config.cacheSize}`,
			`PRAGMA journal_mode = ${this.config.journalMode}`,
			`PRAGMA synchronous = ${this.config.synchronous}`,
			`PRAGMA temp_store = ${this.config.tempStore}`,
			`PRAGMA mmap_size = ${this.config.mmapSize}`,
			`PRAGMA secure_delete = ${this.config.secureDelete ? 'ON' : 'OFF'}`,
			`PRAGMA foreign_keys = ${this.config.foreignKeys ? 'ON' : 'OFF'}`,
			'PRAGMA optimize',
		];

		settings.forEach((setting) => {
			db.run(setting);
		});
	}

	private async configureDatabase(): Promise<void> {
		const connection = await this.getConnection();
		const settings = [
			'PRAGMA busy_timeout = 30000', // 30 second timeout
			'PRAGMA wal_autocheckpoint = 1000',
			'PRAGMA wal_checkpoint(TRUNCATE)',
			'VACUUM', // Optimize database file
		];

		for (const setting of settings) {
			await this.runQuery(connection, setting);
		}

		this.releaseConnection(connection);
	}

	private async createIndexes(): Promise<void> {
		const connection = await this.getConnection();

		const indexes = [
			// Conversations indexes
			'CREATE INDEX IF NOT EXISTS idx_conversations_user_id_created_at ON conversations(user_id, created_at DESC)',
			'CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)',
			'CREATE INDEX IF NOT EXISTS idx_conversations_user_title ON conversations(user_id, title)',

			// Messages indexes
			'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at ON messages(conversation_id, created_at)',
			'CREATE INDEX IF NOT EXISTS idx_messages_conversation_role ON messages(conversation_id, role)',
			'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)',

			// Models indexes
			'CREATE INDEX IF NOT EXISTS idx_models_provider_active ON models(provider, is_active)',
			'CREATE INDEX IF NOT EXISTS idx_models_is_active ON models(is_active)',
			'CREATE INDEX IF NOT EXISTS idx_models_updated_at ON models(updated_at DESC)',

			// Approvals indexes
			'CREATE INDEX IF NOT EXISTS idx_approvals_session_status ON approvals(session_id, status)',
			'CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC)',
			'CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)',

			// Files indexes
			'CREATE INDEX IF NOT EXISTS idx_files_user_id_created_at ON files(user_id, created_at DESC)',
			'CREATE INDEX IF NOT EXISTS idx_files_mimetype ON files(mimetype)',
			'CREATE INDEX IF NOT EXISTS idx_files_size ON files(size)',

			// RAG documents indexes (enhanced)
			'CREATE INDEX IF NOT EXISTS idx_rag_documents_user_status_created ON rag_documents(user_id, processing_status, created_at DESC)',
			'CREATE INDEX IF NOT EXISTS idx_rag_documents_status_created ON rag_documents(processing_status, created_at DESC)',
			'CREATE INDEX IF NOT EXISTS idx_rag_documents_filename ON rag_documents(filename)',
			'CREATE INDEX IF NOT EXISTS idx_rag_documents_user_processed ON rag_documents(user_id, processed)',

			// RAG document chunks indexes (enhanced)
			'CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_index ON rag_document_chunks(document_id, chunk_index)',
			'CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_created ON rag_document_chunks(document_id, created_at)',
			'CREATE INDEX IF NOT EXISTS idx_rag_chunks_content_gin ON rag_document_chunks(content)', // For FTS
			'CREATE INDEX IF NOT EXISTS idx_rag_chunks_token_count ON rag_document_chunks(token_count)',

			// Full-text search indexes
			'CREATE VIRTUAL TABLE IF NOT EXISTS rag_document_chunks_fts USING fts5(content, document_id, chunk_index, content="rag_document_chunks")',
		];

		for (const indexSql of indexes) {
			await this.runQuery(connection, indexSql);
		}

		this.releaseConnection(connection);
		console.log('Database indexes created successfully');
	}

	private async getConnection(): Promise<Database> {
		// If we have available connections, return one
		if (this.pool.length > 0) {
			const connection = this.pool.pop()!;
			this.stats.activeConnections++;
			this.stats.peakConnections = Math.max(
				this.stats.peakConnections,
				this.stats.activeConnections,
			);
			return connection;
		}

		// If we can create more connections, do so
		if (this.stats.connectionPoolSize + this.stats.activeConnections < this.config.maxConnections) {
			this.stats.connectionPoolSize++;
			this.stats.activeConnections++;
			this.stats.peakConnections = Math.max(
				this.stats.peakConnections,
				this.stats.activeConnections,
			);
			return await this.createConnection();
		}

		// Otherwise, wait for a connection to become available
		return new Promise((resolve) => {
			this.connectionQueue.push(resolve);
		});
	}

	private releaseConnection(connection: Database): void {
		this.stats.activeConnections--;

		// If there are queued requests, give them the connection
		if (this.connectionQueue.length > 0) {
			const resolve = this.connectionQueue.shift()!;
			this.stats.activeConnections++;
			resolve(connection);
		} else {
			// Return to pool
			this.pool.push(connection);
		}
	}

	private async runQuery(
		connection: Database,
		query: string,
		parameters: any[] = [],
	): Promise<any> {
		return new Promise((resolve, reject) => {
			const stmt = connection.prepare(query);
			stmt.run(parameters, function (error) {
				if (error) {
					reject(error);
				} else {
					resolve({
						changes: this.changes,
						lastInsertRowid: this.lastID,
					});
				}
				stmt.finalize();
			});
		});
	}

	public async query<T = any>(query: string, options: QueryOptions = {}): Promise<QueryResult<T>> {
		const startTime = performance.now();
		let cacheHit = false;
		let rows: T[] = [];

		try {
			// Check cache if query is cacheable
			if (options.useCache !== false && options.cacheable !== false) {
				const cacheKey = this.generateCacheKey(query, options.parameters || []);
				const cached = await cacheService.get<T[]>(cacheKey, undefined, {
					namespace: 'database-cache',
					ttl: options.cacheTTL || 300,
				});

				if (cached) {
					cacheHit = true;
					rows = cached;
					this.stats.cacheHits++;
				}
			}

			// If not cached, execute query
			if (!cacheHit) {
				const connection = await this.getConnection();
				rows = await this.executeQuery<T>(connection, query, options.parameters || []);
				this.releaseConnection(connection);

				// Cache the result if cacheable
				if (options.cacheable !== false) {
					const cacheKey = this.generateCacheKey(query, options.parameters || []);
					await cacheService.set(cacheKey, rows, {
						namespace: 'database-cache',
						ttl: options.cacheTTL || 300,
					});
				}

				this.stats.cacheMisses++;
			}

			const queryTime = performance.now() - startTime;
			this.updateStats(queryTime, rows.length);

			// Record metrics
			this.metricsService.recordDatabaseQuery(
				this.extractQueryType(query),
				this.extractTable(query),
				queryTime,
				true,
			);

			return {
				rows,
				queryTime,
				cacheHit,
			};
		} catch (error) {
			const queryTime = performance.now() - startTime;
			this.metricsService.recordDatabaseQuery(
				this.extractQueryType(query),
				this.extractTable(query),
				queryTime,
				false,
			);
			throw error;
		}
	}

	private async executeQuery<T>(
		connection: Database,
		query: string,
		parameters: any[] = [],
	): Promise<T[]> {
		return new Promise((resolve, reject) => {
			const stmt = connection.prepare(query);
			stmt.all(parameters, (error, rows) => {
				if (error) {
					reject(error);
				} else {
					resolve(rows as T[]);
				}
				stmt.finalize();
			});
		});
	}

	public async execute(
		query: string,
		parameters: any[] = [],
	): Promise<{ changes: number; lastInsertRowid: number }> {
		const startTime = performance.now();

		try {
			const connection = await this.getConnection();
			const result = await this.runQuery(connection, query, parameters);
			this.releaseConnection(connection);

			const queryTime = performance.now() - startTime;
			this.updateStats(queryTime, 0, result.changes);

			// Invalidate relevant cache entries
			await this.invalidateCacheForQuery(query);

			return result;
		} catch (error) {
			const queryTime = performance.now() - startTime;
			this.updateStats(queryTime, 0);
			throw error;
		}
	}

	public async executeBatch(operations: BatchOperation[]): Promise<any[]> {
		const startTime = performance.now();
		const results: any[] = [];

		try {
			const connection = await this.getConnection();

			// Begin transaction
			await this.runQuery(connection, 'BEGIN TRANSACTION');

			for (const operation of operations) {
				try {
					const result = await this.runQuery(
						connection,
						operation.query,
						operation.parameters || [],
					);
					results.push(result);
				} catch (error) {
					// Rollback on error
					await this.runQuery(connection, 'ROLLBACK');
					this.releaseConnection(connection);
					throw error;
				}
			}

			// Commit transaction
			await this.runQuery(connection, 'COMMIT');
			this.releaseConnection(connection);

			// Invalidate cache
			await this.invalidateCacheForQueries(operations);

			const queryTime = performance.now() - startTime;
			this.updateStats(queryTime, 0, operations.length);

			return results;
		} catch (error) {
			const queryTime = performance.now() - startTime;
			this.updateStats(queryTime, 0);
			throw error;
		}
	}

	private generateCacheKey(query: string, parameters: any[]): string {
		const queryHash = require('node:crypto').createHash('sha256').update(query).digest('hex');
		const paramHash =
			parameters.length > 0
				? require('node:crypto')
					.createHash('sha256')
					.update(JSON.stringify(parameters))
					.digest('hex')
				: 'no-params';
		return `query:${queryHash}:${paramHash}`;
	}

	private extractQueryType(query: string): string {
		const upperQuery = query.trim().toUpperCase();
		if (upperQuery.startsWith('SELECT')) return 'SELECT';
		if (upperQuery.startsWith('INSERT')) return 'INSERT';
		if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
		if (upperQuery.startsWith('DELETE')) return 'DELETE';
		if (upperQuery.startsWith('CREATE')) return 'CREATE';
		if (upperQuery.startsWith('ALTER')) return 'ALTER';
		if (upperQuery.startsWith('DROP')) return 'DROP';
		if (upperQuery.startsWith('INDEX')) return 'INDEX';
		return 'UNKNOWN';
	}

	private extractTable(query: string): string {
		const tableMatch = query.match(/(?:FROM|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)/i);
		return tableMatch ? tableMatch[1].toLowerCase() : 'unknown';
	}

	private updateStats(queryTime: number, rowsReturned = 0, rowsAffected = 0): void {
		this.stats.totalQueries++;
		this.stats.totalRowsReturned += rowsReturned;
		this.stats.totalRowsAffected += rowsAffected;

		// Track query times for average calculation
		this.queryTimes.push(queryTime);
		if (this.queryTimes.length > 1000) {
			this.queryTimes = this.queryTimes.slice(-1000); // Keep last 1000 queries
		}

		this.stats.averageQueryTime =
			this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length;

		// Track slow queries ( > 1 second )
		if (queryTime > 1000) {
			this.stats.slowQueries++;
		}
	}

	private async invalidateCacheForQuery(query: string): Promise<void> {
		const table = this.extractTable(query);
		const queryType = this.extractQueryType(query);

		// Invalidate cache entries for the affected table
		if (queryType !== 'SELECT') {
			await cacheService.invalidatePattern(`query:*:*${table}*`, 'database-cache');
		}
	}

	private async invalidateCacheForQueries(operations: BatchOperation[]): Promise<void> {
		const tables = new Set<string>();

		for (const operation of operations) {
			const table = this.extractTable(operation.query);
			const queryType = this.extractQueryType(operation.query);

			if (queryType !== 'SELECT') {
				tables.add(table);
			}
		}

		// Invalidate cache for all affected tables
		for (const table of tables) {
			await cacheService.invalidatePattern(`query:*:*${table}*`, 'database-cache');
		}
	}

	private startMaintenanceTasks(): void {
		// Run maintenance every 5 minutes
		setInterval(async () => {
			try {
				await this.performMaintenance();
			} catch (error) {
				console.error('Database maintenance error:', error);
			}
		}, 300000);
	}

	private async performMaintenance(): Promise<void> {
		const connection = await this.getConnection();

		try {
			// Optimize database
			await this.runQuery(connection, 'PRAGMA optimize');
			await this.runQuery(connection, 'ANALYZE');

			// Clean up old cache entries periodically
			await cacheService.invalidatePattern('query:*:*', 'database-cache');

			console.log('Database maintenance completed');
		} finally {
			this.releaseConnection(connection);
		}
	}

	public getStats(): DatabaseStats {
		return { ...this.stats };
	}

	public async getDatabaseInfo(): Promise<Record<string, any>> {
		const connection = await this.getConnection();
		const info: Record<string, any> = {};

		try {
			const pragmas = [
				'page_size',
				'cache_size',
				'journal_mode',
				'synchronous',
				'temp_store',
				'mmap_size',
				'foreign_keys',
				'wal_autocheckpoint',
			];

			for (const pragma of pragmas) {
				const result = await this.executeQuery(connection, `PRAGMA ${pragma}`);
				info[pragma] = result[0];
			}

			// Get table statistics
			const tables = await this.executeQuery(
				connection,
				`
				SELECT name, sql FROM sqlite_master
				WHERE type='table' AND name NOT LIKE 'sqlite_%'
				ORDER BY name
			`,
			);

			info.tables = tables;

			// Get index statistics
			const indexes = await this.executeQuery(
				connection,
				`
				SELECT name, tbl_name, sql FROM sqlite_master
				WHERE type='index' AND name NOT LIKE 'sqlite_%'
				ORDER BY tbl_name, name
			`,
			);

			info.indexes = indexes;
		} finally {
			this.releaseConnection(connection);
		}

		return info;
	}

	public async close(): Promise<void> {
		// Close all connections
		const connections = [...this.pool];

		for (const connection of connections) {
			await new Promise<void>((resolve, reject) => {
				connection.close((error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});
		}

		this.pool = [];
		this.stats.connectionPoolSize = 0;
		this.stats.activeConnections = 0;
	}

	// Advanced query builder helpers
	public buildSelectQuery(
		table: string,
		columns: string[] = ['*'],
		where?: Record<string, any>,
		orderBy?: string,
		limit?: number,
		offset?: number,
	): string {
		let query = `SELECT ${columns.join(', ')} FROM ${table}`;

		if (where && Object.keys(where).length > 0) {
			const conditions = Object.entries(where).map(([key, value]) => {
				if (Array.isArray(value)) {
					return `${key} IN (${value.map(() => '?').join(', ')})`;
				}
				return `${key} = ?`;
			});
			query += ` WHERE ${conditions.join(' AND ')}`;
		}

		if (orderBy) {
			query += ` ORDER BY ${orderBy}`;
		}

		if (limit) {
			query += ` LIMIT ${limit}`;
		}

		if (offset) {
			query += ` OFFSET ${offset}`;
		}

		return query;
	}

	public buildInsertQuery(
		table: string,
		data: Record<string, any>,
	): { query: string; parameters: any[] } {
		const columns = Object.keys(data);
		const placeholders = columns.map(() => '?').join(', ');
		const parameters = Object.values(data);

		const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
		return { query, parameters };
	}

	public buildUpdateQuery(
		table: string,
		data: Record<string, any>,
		where: Record<string, any>,
	): { query: string; parameters: any[] } {
		const setColumns = Object.keys(data)
			.map((key) => `${key} = ?`)
			.join(', ');
		const whereConditions = Object.keys(where)
			.map((key) => `${key} = ?`)
			.join(' AND ');
		const parameters = [...Object.values(data), ...Object.values(where)];

		const query = `UPDATE ${table} SET ${setColumns} WHERE ${whereConditions}`;
		return { query, parameters };
	}
}

// Export singleton instance
export const databaseService = DatabaseService.initializeFromEnv();

// Export types and utilities
export type { BatchOperation, DatabaseConfig, DatabaseStats, QueryOptions, QueryResult };
export const createBatchOperation = (query: string, parameters?: any[]): BatchOperation => ({
	query,
	parameters,
});
