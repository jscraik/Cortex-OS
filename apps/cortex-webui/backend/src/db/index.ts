import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

// Initialize SQLite database with better-sqlite3
const sqlite = new Database(process.env.DATABASE_PATH || './data/cortex.db');

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Export database instance for direct access when needed
export { sqlite };

// Helper function to initialize database tables
export const initializeDatabase = () => {
  // Better Auth handles its own tables automatically

  // Create application tables if they don't exist
  const createAppTables = `
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      api_base TEXT,
      api_key TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      metadata TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      path TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider);
    CREATE INDEX IF NOT EXISTS idx_approvals_session_id ON approvals(session_id);
    CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
  `;

  sqlite.exec(createAppTables);
  console.log('Application database tables initialized');
};

// Migration function to update legacy users table to Better Auth format
export const migrateLegacyUsers = async () => {
  // Check if legacy users table exists
  const legacyTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='users'
  `).get();

  if (!legacyTableExists) {
    console.log('No legacy users table found, skipping migration');
    return;
  }

  // Get all legacy users
  const legacyUsers = sqlite.prepare(`
    SELECT * FROM users
  `).all() as any[];

  console.log(`Found ${legacyUsers.length} legacy users to migrate`);

  // Insert users into Better Auth format
  const insertUser = sqlite.prepare(`
    INSERT OR IGNORE INTO user (
      id, email, email_verified, name, password_hash, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const user of legacyUsers) {
    insertUser.run(
      user.id,
      user.email,
      0, // email_verified
      user.name,
      user.password,
      Math.floor(new Date(user.created_at).getTime() / 1000),
      Math.floor(new Date(user.updated_at).getTime() / 1000)
    );
  }

  console.log('Legacy user migration completed');

  // Optionally rename the legacy table
  // sqlite.exec(`ALTER TABLE users RENAME TO users_legacy`);
};

// Initialize database on module load
initializeDatabase();