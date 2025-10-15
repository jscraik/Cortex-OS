import { type Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { StoreError } from '../errors.js';
import { getIdentifierFactory } from '../utils/secure-random.js';
import type {
	Memory,
	MemorySearchOptions,
	MemoryStore,
	SearchResult,
} from '../ports/MemoryStore.js';
import { type ExternalStorageManager, getExternalStorageManager } from './external-storage.js';

export interface ExternalSqliteConfig {
	dbName?: string;
	enableWAL?: boolean;
	enableForeignKeys?: boolean;
	journalMode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL';
	synchronousMode?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
	tempStore?: 'DEFAULT' | 'FILE' | 'MEMORY';
	mmapSize?: number;
	cacheSize?: number;
	externalStorageManager?: ExternalStorageManager;
}

export class ExternalSqliteStore implements MemoryStore {
	private db: Database | null = null;
	private config: Required<ExternalSqliteConfig>;
	private externalStorageManager: ExternalStorageManager;
	private dbPath: string;

	constructor(config: ExternalSqliteConfig = {}) {
		this.config = {
			dbName: 'memories.db',
			enableWAL: true,
			enableForeignKeys: true,
			journalMode: 'WAL',
			synchronousMode: 'NORMAL',
			tempStore: 'MEMORY',
			mmapSize: 64 * 1024 * 1024, // 64MB
			cacheSize: -2000, // 2MB
			...config,
		};

		this.externalStorageManager = this.config.externalStorageManager || getExternalStorageManager();
		this.dbPath = this.getDatabasePath();
	}

	/**
	 * Get the database path using external storage
	 */
	private getDatabasePath(): string {
		try {
			if (this.externalStorageManager.isAvailable()) {
				const dataDir = this.externalStorageManager.ensureDataDirectory();
				return `${dataDir}/${this.config.dbName}`;
			}
		} catch (error) {
			console.warn('External storage not available, falling back to local:', error);
		}

		// Fallback to local storage
		return `./data/${this.config.dbName}`;
	}

	/**
	 * Initialize the database and create tables
	 */
	async initialize(): Promise<void> {
		try {
			// Ensure directory exists
			const dbDir = this.dbPath.substring(0, this.dbPath.lastIndexOf('/'));
			await import('node:fs').then((fs) => fs.promises.mkdir(dbDir, { recursive: true }));

			// Open database connection
			this.db = await open({
				filename: this.dbPath,
				driver: sqlite3.Database,
			});

			// Configure SQLite for performance
			await this.configureDatabase();

			// Create tables
			await this.createTables();

			// Create indexes
			await this.createIndexes();

			console.log(`External SQLite store initialized at: ${this.dbPath}`);
		} catch (error) {
			throw new StoreError('INIT_FAILED', `Failed to initialize external SQLite store: ${error}`);
		}
	}

	/**
	 * Configure database settings for optimal performance
	 */
	private async configureDatabase(): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		// Enable WAL mode for better concurrency
		if (this.config.enableWAL) {
			await this.db.run(`PRAGMA journal_mode = ${this.config.journalMode}`);
		}

		// Enable foreign key constraints
		if (this.config.enableForeignKeys) {
			await this.db.run('PRAGMA foreign_keys = ON');
		}

		// Configure synchronous mode
		await this.db.run(`PRAGMA synchronous = ${this.config.synchronousMode}`);

		// Configure temp store
		await this.db.run(`PRAGMA temp_store = ${this.config.tempStore}`);

		// Set memory mapping size
		await this.db.run(`PRAGMA mmap_size = ${this.config.mmapSize}`);

		// Set cache size
		await this.db.run(`PRAGMA cache_size = ${this.config.cacheSize}`);

		// Enable full mutex for multi-threaded access
		await this.db.run('PRAGMA fullfsync = ON');

		// Set busy timeout
		await this.db.run('PRAGMA busy_timeout = 5000');
	}

	/**
	 * Create database tables
	 */
	private async createTables(): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		// Memories table
		await this.db.run(`
			CREATE TABLE IF NOT EXISTS memories (
				id TEXT PRIMARY KEY,
				kind TEXT NOT NULL,
				text TEXT NOT NULL,
				tags TEXT, -- JSON array
				metadata TEXT, -- JSON object
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				embedding BLOB, -- Vector embedding
				search_vector TEXT, -- For full-text search
				size_bytes INTEGER NOT NULL DEFAULT 0,
				ttl TEXT, -- Expiration time
				provenance TEXT -- JSON object tracking source
			)
		`);

		// Create virtual table for full-text search
		await this.db.run(`
			CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts
			USING fts5(id, text, tags, metadata, content='memories')
		`);

		// Triggers to keep FTS table synchronized
		await this.db.run(`
			CREATE TRIGGER IF NOT EXISTS memories_fts_insert
			AFTER INSERT ON memories BEGIN
				INSERT INTO memories_fts(id, text, tags, metadata)
				VALUES (new.id, new.text, new.tags, new.metadata);
			END
		`);

		await this.db.run(`
			CREATE TRIGGER IF NOT EXISTS memories_fts_delete
			AFTER DELETE ON memories BEGIN
				DELETE FROM memories_fts WHERE id = old.id;
			END
		`);

		await this.db.run(`
			CREATE TRIGGER IF NOT EXISTS memories_fts_update
			AFTER UPDATE ON memories BEGIN
				DELETE FROM memories_fts WHERE id = old.id;
				INSERT INTO memories_fts(id, text, tags, metadata)
				VALUES (new.id, new.text, new.tags, new.metadata);
			END
		`);
	}

	/**
	 * Create database indexes for performance
	 */
	private async createIndexes(): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		// Index on kind for filtering
		await this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind)');

		// Index on created_at for time-based queries
		await this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at)');

		// Index on TTL for expiration cleanup
		await this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_ttl ON memories(ttl)');

		// Index on provenance for source tracking
		await this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_provenance ON memories(provenance)');

		// Composite index for common queries
		await this.db.run(
			'CREATE INDEX IF NOT EXISTS idx_memories_kind_created_at ON memories(kind, created_at)',
		);
	}

	async upsert(memory: Omit<Memory, 'id'> & { id?: string }): Promise<Memory> {
		if (!this.db) throw new Error('Database not initialized');

                const id = memory.id || getIdentifierFactory().generateMemoryId('mem');
		const now = new Date().toISOString();

		const fullMemory: Memory = {
			id,
			...memory,
			createdAt: memory.createdAt || now,
			updatedAt: now,
		};

		try {
			await this.db.run(
				`
					INSERT OR REPLACE INTO memories
					(id, kind, text, tags, metadata, created_at, updated_at, size_bytes, provenance)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				[
					id,
					fullMemory.kind,
					fullMemory.text,
					JSON.stringify(fullMemory.tags || []),
					JSON.stringify(fullMemory.metadata || {}),
					fullMemory.createdAt,
					fullMemory.updatedAt,
					Buffer.byteLength(JSON.stringify(fullMemory), 'utf8'),
					JSON.stringify(fullMemory.provenance || {}),
				],
			);

			return fullMemory;
		} catch (error) {
			throw new StoreError('UPSERT_FAILED', `Failed to upsert memory: ${error}`);
		}
	}

	async get(id: string, _namespace?: string): Promise<Memory | null> {
		if (!this.db) throw new Error('Database not initialized');

		try {
			const row = await this.db.get('SELECT * FROM memories WHERE id = ?', [id]);

			if (!row) return null;

			return this.rowToMemory(row);
		} catch (error) {
			throw new StoreError('GET_FAILED', `Failed to get memory: ${error}`);
		}
	}

	async search(options: MemorySearchOptions): Promise<SearchResult> {
		if (!this.db) throw new Error('Database not initialized');

		try {
			let query = `
				SELECT m.* FROM memories m
				LEFT JOIN memories_fts fts ON m.id = fts.id
				WHERE 1=1
			`;
			const params: any[] = [];

			// Add search conditions
			if (options.query) {
				query += ' AND fts.text MATCH ?';
				params.push(options.query);
			}

			if (options.kind) {
				query += ' AND m.kind = ?';
				params.push(options.kind);
			}

			if (options.tags && options.tags.length > 0) {
				const tagConditions = options.tags.map(() => 'm.tags LIKE ?').join(' OR ');
				query += ` AND (${tagConditions})`;
				options.tags.forEach((tag) => {
					params.push(`%"${tag}"%`);
				});
			}

			if (options.before) {
				query += ' AND m.created_at < ?';
				params.push(options.before);
			}

			if (options.after) {
				query += ' AND m.created_at > ?';
				params.push(options.after);
			}

			// Add order and limit
			query += ' ORDER BY m.created_at DESC';
			query += ` LIMIT ${Math.min(options.limit || 10, 100)}`;

			const rows = await this.db.all(query, params);
			const memories = rows.map((row) => this.rowToMemory(row));

			// Get total count
			const countQuery = `
				SELECT COUNT(*) as total FROM memories m
				LEFT JOIN memories_fts fts ON m.id = fts.id
				WHERE 1=1
			`;
			const countParams = params.slice(0, -1); // Exclude limit
			const countRow = await this.db.get(countQuery, countParams);

			return {
				memories,
				total: countRow.total,
				hasMore: memories.length === (options.limit || 10),
			};
		} catch (error) {
			throw new StoreError('SEARCH_FAILED', `Failed to search memories: ${error}`);
		}
	}

	async delete(id: string, _namespace?: string): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		try {
			await this.db.run('DELETE FROM memories WHERE id = ?', [id]);
		} catch (error) {
			throw new StoreError('DELETE_FAILED', `Failed to delete memory: ${error}`);
		}
	}

	async clear(): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		try {
			await this.db.run('DELETE FROM memories');
			await this.db.run('DELETE FROM memories_fts');
		} catch (error) {
			throw new StoreError('CLEAR_FAILED', `Failed to clear memories: ${error}`);
		}
	}

	async close(): Promise<void> {
		if (this.db) {
			await this.db.close();
			this.db = null;
		}
	}

	/**
	 * Convert database row to Memory object
	 */
	private rowToMemory(row: any): Memory {
		return {
			id: row.id,
			kind: row.kind,
			text: row.text,
			tags: row.tags ? JSON.parse(row.tags) : [],
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			provenance: row.provenance ? JSON.parse(row.provenance) : {},
		};
	}

	/**
	 * Get database path (for debugging)
	 */
	getDatabasePath(): string {
		return this.dbPath;
	}

	/**
	 * Get external storage status
	 */
	getStorageStatus() {
		return {
			dbPath: this.dbPath,
			externalStorageAvailable: this.externalStorageManager.isAvailable(),
			currentStorage: this.externalStorageManager.getCurrentStorage(),
			allStatus: this.externalStorageManager.getAllStatus(),
		};
	}

	async list(namespace?: string, limit?: number, offset?: number): Promise<Memory[]> {
		if (!this.db) throw new Error('Database not initialized');
		try {
			let query = 'SELECT * FROM memories';
			const params: unknown[] = [];
			if (namespace) {
				query += ' WHERE id LIKE ?';
				params.push(`${namespace}:%`);
			}
			query += ' ORDER BY created_at DESC';
			if (typeof limit === 'number') query += ' LIMIT ?';
			if (typeof offset === 'number') query += ' OFFSET ?';
			const rows = await this.db.all(query, params);
			return rows.map((r: any) => this.rowToMemory(r));
		} catch (error) {
			throw new StoreError('LIST_FAILED', `Failed to list memories: ${error}`);
		}
	}
}
