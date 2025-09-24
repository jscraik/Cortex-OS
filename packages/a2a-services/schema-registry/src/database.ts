import type { Schema } from './schemas.js';

export interface SchemaRepository {
	save(schema: Schema): Promise<void>;
	findByName(name: string): Promise<Schema[]>;
	findByNameAndVersion(name: string, version: string): Promise<Schema | null>;
	findAll(): Promise<Schema[]>;
	deleteByNameAndVersion(name: string, version: string): Promise<boolean>;
}

export class SqliteSchemaRepository implements SchemaRepository {
	private db: any;

	constructor(dbPath: string = ':memory:') {
		// Dynamically import better-sqlite3 to avoid hard dependency
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const sqlite3 = require('better-sqlite3');
			this.db = new sqlite3(dbPath);

			// Create tables if they don't exist
			this.db.exec(`
        CREATE TABLE IF NOT EXISTS schemas (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          schema TEXT NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          UNIQUE(name, version)
        )
      `);

			// Create indexes
			this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_schemas_name ON schemas(name);
        CREATE INDEX IF NOT EXISTS idx_schemas_name_version ON schemas(name, version);
      `);
		} catch (error) {
			console.error('Failed to initialize SQLite database:', error);
			throw new Error('Database initialization failed. Please ensure better-sqlite3 is installed.');
		}
	}

	async save(schema: Schema): Promise<void> {
		try {
			const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO schemas (id, name, version, schema)
        VALUES (?, ?, ?, ?)
      `);

			stmt.run(schema.id, schema.name, schema.version, JSON.stringify(schema.schema));
		} catch (error) {
			console.error('Failed to save schema:', error);
			throw new Error(`Failed to save schema: ${error}`);
		}
	}

	async findByName(name: string): Promise<Schema[]> {
		try {
			const stmt = this.db.prepare('SELECT * FROM schemas WHERE name = ? ORDER BY version DESC');
			const rows = stmt.all(name);

			return rows.map((row: any) => ({
				id: row.id,
				name: row.name,
				version: row.version,
				schema: JSON.parse(row.schema),
			}));
		} catch (error) {
			console.error('Failed to find schemas by name:', error);
			throw new Error(`Failed to find schemas by name: ${error}`);
		}
	}

	async findByNameAndVersion(name: string, version: string): Promise<Schema | null> {
		try {
			const stmt = this.db.prepare('SELECT * FROM schemas WHERE name = ? AND version = ?');
			const row = stmt.get(name, version);

			if (!row) {
				return null;
			}

			return {
				id: row.id,
				name: row.name,
				version: row.version,
				schema: JSON.parse(row.schema),
			};
		} catch (error) {
			console.error('Failed to find schema by name and version:', error);
			throw new Error(`Failed to find schema by name and version: ${error}`);
		}
	}

	async findAll(): Promise<Schema[]> {
		try {
			const stmt = this.db.prepare('SELECT * FROM schemas ORDER BY name, version DESC');
			const rows = stmt.all();

			return rows.map((row: any) => ({
				id: row.id,
				name: row.name,
				version: row.version,
				schema: JSON.parse(row.schema),
			}));
		} catch (error) {
			console.error('Failed to find all schemas:', error);
			throw new Error(`Failed to find all schemas: ${error}`);
		}
	}

	async deleteByNameAndVersion(name: string, version: string): Promise<boolean> {
		try {
			const stmt = this.db.prepare('DELETE FROM schemas WHERE name = ? AND version = ?');
			const result = stmt.run(name, version);

			return result.changes > 0;
		} catch (error) {
			console.error('Failed to delete schema by name and version:', error);
			throw new Error(`Failed to delete schema by name and version: ${error}`);
		}
	}
}
