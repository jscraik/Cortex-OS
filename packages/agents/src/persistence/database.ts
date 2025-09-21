import Database from 'better-sqlite3';

type DbType = Database.Database;

import { z } from 'zod';

/**
 * Configuration for database connection
 */
export const DatabaseConfigSchema = z.object({
	/** Path to the SQLite database file */
	path: z.string(),
	/** Maximum number of connections in the pool */
	maxConnections: z.number().min(1).default(10),
	/** Connection timeout in milliseconds */
	timeout: z.number().min(1000).default(5000),
	/** Enable WAL mode for better concurrency */
	walEnabled: z.boolean().default(true),
	/** Enable foreign key constraints */
	foreignKeys: z.boolean().default(true),
	/** Journal mode */
	journalMode: z.enum(['delete', 'truncate', 'persist', 'memory', 'wal', 'off']).default('wal'),
	/** Synchronous mode */
	synchronous: z.enum(['off', 'normal', 'full', 'extra']).default('normal'),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

/**
 * Database connection pool management
 */
export class DatabasePool {
	private connections: DbType[] = [];
	private available: DbType[] = [];
	private readonly config: DatabaseConfig;
	private initialized = false;

	constructor(config: DatabaseConfig) {
		this.config = DatabaseConfigSchema.parse(config);
	}

	/**
	 * Initialize the connection pool
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			// Create initial connections
			for (let i = 0; i < this.config.maxConnections; i++) {
				const db = this.createConnection();
				this.connections.push(db);
				this.available.push(db);
			}

			this.initialized = true;
		} catch (error) {
			throw new Error(`Failed to initialize database pool: ${error}`);
		}
	}

	/**
	 * Get a connection from the pool
	 */
	async getConnection(): Promise<DbType> {
		if (!this.initialized) {
			await this.initialize();
		}

		if (this.available.length === 0) {
			// All connections are in use, create a new one temporarily
			return this.createConnection();
		}

		const connection = this.available.pop()!;
		return connection;
	}

	/**
	 * Release a connection back to the pool
	 */
	releaseConnection(connection: DbType): void {
		if (this.connections.includes(connection) && !this.available.includes(connection)) {
			this.available.push(connection);
		} else {
			// Temporary connection, close it
			connection.close();
		}
	}

	/**
	 * Close all connections in the pool
	 */
	async close(): Promise<void> {
		for (const connection of this.connections) {
			connection.close();
		}
		this.connections = [];
		this.available = [];
		this.initialized = false;
	}

	/**
	 * Create a new database connection with configured pragmas
	 */
	private createConnection(): DbType {
		const db = new Database(this.config.path);

		// Configure pragmas
		if (this.config.walEnabled) {
			db.pragma('journal_mode = WAL');
		}

		if (this.config.foreignKeys) {
			db.pragma('foreign_keys = ON');
		}

		db.pragma(`synchronous = ${this.config.synchronous.toUpperCase()}`);
		db.pragma('cache_size = -10000'); // 10MB cache
		db.pragma('temp_store = memory');
		db.pragma('mmap_size = 268435456'); // 256MB mmap

		// Set busy timeout
		db.pragma(`busy_timeout = ${this.config.timeout}`);

		return db;
	}

	/**
	 * Execute a function with a connection from the pool
	 */
	async withConnection<T>(fn: (db: DbType) => T): Promise<T> {
		const connection = await this.getConnection();
		try {
			const result = fn(connection);
			return result;
		} finally {
			this.releaseConnection(connection);
		}
	}

	/**
	 * Execute a function within a transaction
	 */
	async withTransaction<T>(fn: (db: DbType) => T): Promise<T> {
		return this.withConnection((db) => {
			const transaction = db.transaction(() => fn(db));
			return transaction();
		});
	}

	/**
	 * Get pool statistics
	 */
	getStats() {
		return {
			totalConnections: this.connections.length,
			availableConnections: this.available.length,
			inUseConnections: this.connections.length - this.available.length,
			initialized: this.initialized,
		};
	}
}

/**
 * Global database pool instance
 */
let globalPool: DatabasePool | null = null;

/**
 * Create or get the global database connection pool
 */
export async function getDatabasePool(config?: DatabaseConfig): Promise<DatabasePool> {
	if (!globalPool) {
		if (!config) {
			throw new Error('Database configuration required for initial pool creation');
		}
		globalPool = new DatabasePool(config);
		await globalPool.initialize();
	}
	return globalPool;
}

/**
 * Create a database connection (deprecated in favor of pool)
 * @deprecated Use getDatabasePool().getConnection() instead
 */
export async function createDatabase(config: DatabaseConfig): Promise<DbType> {
	const validatedConfig = DatabaseConfigSchema.parse(config);
	const db = new Database(validatedConfig.path);

	// Configure pragmas
	if (validatedConfig.walEnabled) {
		db.pragma('journal_mode = WAL');
	}

	if (validatedConfig.foreignKeys) {
		db.pragma('foreign_keys = ON');
	}

	db.pragma(`synchronous = ${validatedConfig.synchronous.toUpperCase()}`);
	db.pragma('cache_size = -10000');
	db.pragma('temp_store = memory');
	db.pragma('mmap_size = 268435456');
	db.pragma(`busy_timeout = ${validatedConfig.timeout}`);

	return db;
}

/**
 * Close the global database pool
 */
export async function closeDatabasePool(): Promise<void> {
	if (globalPool) {
		await globalPool.close();
		globalPool = null;
	}
}

/**
 * Health check for database connection
 */
export async function healthCheck(db: DbType): Promise<boolean> {
	try {
		const result = db.prepare('SELECT 1 as health').get() as { health: number };
		return result.health === 1;
	} catch (error) {
		console.error('Database health check failed:', error);
		return false;
	}
}

/**
 * Get database information
 */
export async function getDatabaseInfo(db: DbType) {
	return {
		version: db.pragma('user_version') as number,
		encoding: db.pragma('encoding') as string,
		journalMode: db.pragma('journal_mode') as string,
		pageSize: db.pragma('page_size') as number,
		cacheSize: db.pragma('cache_size') as number,
	};
}
