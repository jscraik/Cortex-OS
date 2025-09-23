import type { drizzleMemoryAdapter } from './drizzle-adapter';
import type { memoryAdapter } from './memory-adapter';

// Use memory adapter to avoid native dependency issues
let dbInstance: ReturnType<typeof memoryAdapter>;
let drizzleDbInstance: ReturnType<typeof drizzleMemoryAdapter>;

// Initialize database with tables
export const initializeDatabase = async () => {
	if (dbInitialized) {
		return;
	}

	console.log('Using in-memory database adapter');

	// Better Auth handles its own tables automatically

	// Create application tables if they don't exist
	await dbInstance.exec(
		"CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER DEFAULT (strftime('%s', 'now')), updated_at INTEGER DEFAULT (strftime('%s', 'now')))",
	);
	await dbInstance.exec(
		"CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')), content TEXT NOT NULL, metadata TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now')), FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE)",
	);
	await dbInstance.exec(
		"CREATE TABLE IF NOT EXISTS models (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, provider TEXT NOT NULL, model TEXT NOT NULL, api_base TEXT, api_key TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER DEFAULT (strftime('%s', 'now')), updated_at INTEGER DEFAULT (strftime('%s', 'now')))",
	);
	await dbInstance.exec(
		"CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, tool_name TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending', metadata TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now')), updated_at INTEGER DEFAULT (strftime('%s', 'now')))",
	);
	await dbInstance.exec(
		"CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, filename TEXT NOT NULL, original_name TEXT NOT NULL, mimetype TEXT NOT NULL, size INTEGER NOT NULL, path TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER DEFAULT (strftime('%s', 'now')), updated_at INTEGER DEFAULT (strftime('%s', 'now')))",
	);

	dbInitialized = true;
	console.log('Database initialized successfully');
};

// Initialize database (for server startup) - exported for compatibility
export const initializeDatabaseAsync = initializeDatabase;

// Export the memory adapter instance for better-auth
export const db = dbInstance;
export const drizzleDb = drizzleDbInstance;

// Export the database instance for direct access
export const sqlite = dbInstance;
