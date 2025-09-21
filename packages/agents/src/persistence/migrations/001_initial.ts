import type Database from 'better-sqlite3';

type DbType = Database.Database;

/**
 * Migration interface
 */
export interface Migration {
	name: string;
	up: (db: DbType) => void;
	down: (db: DbType) => void;
}

/**
 * Initial database schema migration
 */
export const migration001: Migration = {
	name: '001_initial',

	up: (db: DbType) => {
		// Create sessions table
		db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT DEFAULT '{}',

        -- Indexes
        INDEX idx_sessions_created_at (created_at),
        INDEX idx_sessions_status (status)
      );
    `);

		// Create agent_states table
		db.exec(`
      CREATE TABLE IF NOT EXISTS agent_states (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL,
        current_step TEXT,
        data TEXT NOT NULL DEFAULT '{}',
        error TEXT,
        config TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        -- Foreign key
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,

        -- Indexes
        INDEX idx_agent_states_agent_id (agent_id),
        INDEX idx_agent_states_session_id (session_id),
        INDEX idx_agent_states_status (status),
        INDEX idx_agent_states_created_at (created_at),
        INDEX idx_agent_states_updated_at (updated_at)
      );
    `);

		// Create checkpoints table for LangGraph
		db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        checkpoint_data TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,

        -- Indexes
        INDEX idx_checkpoints_thread_id (thread_id),
        INDEX idx_checkpoints_created_at (created_at)
      );
    `);

		// Create pending_writes table for LangGraph
		db.exec(`
      CREATE TABLE IF NOT EXISTS pending_writes (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        writes TEXT NOT NULL,
        created_at TEXT NOT NULL,

        -- Composite unique index
        UNIQUE (thread_id, task_id),

        -- Indexes
        INDEX idx_pending_writes_thread_task (thread_id, task_id),
        INDEX idx_pending_writes_created_at (created_at)
      );
    `);

		// Create migrations table to track applied migrations
		db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL,

        -- Index
        INDEX idx_migrations_name (name)
      );
    `);

		// Record this migration as applied
		const insertStmt = db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)');
		insertStmt.run(migration001.name, new Date().toISOString());

		// Set pragmas for better performance
		db.pragma('journal_mode = WAL');
		db.pragma('foreign_keys = ON');
		db.pragma('synchronous = NORMAL');
		db.pragma('cache_size = -10000');
		db.pragma('temp_store = memory');
		db.pragma('mmap_size = 268435456');
	},

	down: (db: DbType) => {
		// Drop tables in reverse order to handle foreign key constraints
		db.exec('DROP TABLE IF EXISTS migrations');
		db.exec('DROP TABLE IF EXISTS pending_writes');
		db.exec('DROP TABLE IF EXISTS checkpoints');
		db.exec('DROP TABLE IF EXISTS agent_states');
		db.exec('DROP TABLE IF EXISTS sessions');
	},
};

/**
 * Migration runner
 */
export class MigrationRunner {
	private readonly migrations: Migration[] = [migration001];
	private readonly db: DbType;

	constructor(db: DbType) {
		this.db = db;
	}

	/**
	 * Run all pending migrations
	 */
	async run(): Promise<void> {
		// Ensure migrations table exists
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      );
    `);

		// Get applied migrations
		const appliedMigrations = this.db
			.prepare('SELECT name FROM migrations ORDER BY id')
			.all() as Array<{ name: string }>;

		const appliedNames = new Set(appliedMigrations.map((m) => m.name));

		// Run pending migrations in order
		for (const migration of this.migrations) {
			if (!appliedNames.has(migration.name)) {
				console.log(`Running migration: ${migration.name}`);

				// Run migration in transaction
				const transaction = this.db.transaction(() => {
					migration.up(this.db);

					// Record migration
					const insertStmt = this.db.prepare(
						'INSERT INTO migrations (name, applied_at) VALUES (?, ?)',
					);
					insertStmt.run(migration.name, new Date().toISOString());
				});

				transaction();

				console.log(`Completed migration: ${migration.name}`);
			}
		}
	}

	/**
	 * Rollback the last migration
	 */
	async rollback(): Promise<void> {
		const lastMigration = this.db
			.prepare('SELECT name FROM migrations ORDER BY id DESC LIMIT 1')
			.get() as { name: string } | undefined;

		if (!lastMigration) {
			console.log('No migrations to rollback');
			return;
		}

		const migration = this.migrations.find((m) => m.name === lastMigration.name);
		if (!migration) {
			throw new Error(`Cannot find migration: ${lastMigration.name}`);
		}

		console.log(`Rolling back migration: ${migration.name}`);

		const transaction = this.db.transaction(() => {
			migration.down(this.db);

			// Remove migration record
			const deleteStmt = this.db.prepare('DELETE FROM migrations WHERE name = ?');
			deleteStmt.run(migration.name);
		});

		transaction();

		console.log(`Rolled back migration: ${migration.name}`);
	}

	/**
	 * Get current migration status
	 */
	getStatus(): {
		applied: string[];
		pending: string[];
		total: number;
	} {
		const appliedMigrations = this.db
			.prepare('SELECT name FROM migrations ORDER BY id')
			.all() as Array<{ name: string }>;

		const appliedNames = appliedMigrations.map((m) => m.name);
		const allNames = this.migrations.map((m) => m.name);
		const pendingNames = allNames.filter((name) => !appliedNames.includes(name));

		return {
			applied: appliedNames,
			pending: pendingNames,
			total: this.migrations.length,
		};
	}

	/**
	 * Create a new migration file (utility method)
	 */
	static createMigrationFile(name: string): void {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `${timestamp}_${name}.ts`;
		const content = `import Database from 'better-sqlite3';
import { Migration } from './001_initial';

export const migration: Migration = {
  name: '${filename.replace('.ts', '')}',

  up: (db: Database) => {
    // Add your migration SQL here
    db.exec(\`
      -- Add your CREATE TABLE, ALTER TABLE, etc. statements here
    \`);
  },

  down: (db: DbType) => {
    // Add rollback statements here
    db.exec(\`
      -- Add your DROP TABLE, etc. statements here
    \`);
  },
};
`;

		console.log(`Migration file created: ${filename}`);
		console.log('Content:');
		console.log(content);
	}
}
