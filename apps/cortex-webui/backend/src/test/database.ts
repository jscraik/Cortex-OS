import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';

// Test database setup
export const createTestDatabase = () => {
	// Create in-memory database for tests
	const db = new Database(':memory:');

	// Enable foreign keys
	db.pragma('foreign_keys = ON');

	// Create drizzle instance
	const drizzleDb = drizzle(db, { schema });

	// Run migrations
	const migrate = async () => {
		// Create tables
		await drizzleDb.run(sql`
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        type TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        user_id TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
      )
    `);

		await drizzleDb.run(sql`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        session_token TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        expires INTEGER NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
      )
    `);

		await drizzleDb.run(sql`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        email_verified INTEGER DEFAULT 0,
        name TEXT,
        image TEXT,
        password_hash TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

		await drizzleDb.run(sql`
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
	};

	return {
		db,
		drizzleDb,
		migrate,
		schema,
		cleanup: () => {
			db.close();
		},
	};
};

// Create test database instance
export const testDb = createTestDatabase();

// Helper function to clear all tables
export const clearDatabase = async (drizzleDb: ReturnType<typeof drizzle>) => {
	await drizzleDb.run(sql`DELETE FROM verification`);
	await drizzleDb.run(sql`DELETE FROM session`);
	await drizzleDb.run(sql`DELETE FROM account`);
	await drizzleDb.run(sql`DELETE FROM user`);
};

// Helper function to seed test data
export const seedTestData = async (drizzleDb: ReturnType<typeof drizzle>) => {
	// Create test user
	const userId = 'test-user-id';
	await drizzleDb.insert(schema.user).values({
		id: userId,
		email: 'test@example.com',
		emailVerified: 1,
		name: 'Test User',
		passwordHash: '$2a$10$testhash',
		createdAt: Date.now(),
		updatedAt: Date.now(),
	});

	// Create test session
	await drizzleDb.insert(schema.session).values({
		id: 'test-session-id',
		sessionToken: 'test-session-token',
		userId,
		expires: Date.now() + 3600000, // 1 hour
		userAgent: 'test-agent',
		ipAddress: '127.0.0.1',
		createdAt: Date.now(),
		updatedAt: Date.now(),
	});

	return { userId };
};
