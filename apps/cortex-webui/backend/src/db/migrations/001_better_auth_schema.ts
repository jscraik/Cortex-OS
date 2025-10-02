import type { Database } from 'better-sqlite3';

// Migration to create Better Auth compatible schema
export const up = async (db: Database.Database) => {
	// Enable foreign keys
	db.pragma('foreign_keys = ON');

	// Create user table
	await db.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER DEFAULT 0 CHECK(email_verified IN (0, 1)),
      name TEXT,
      image TEXT,
      password_hash TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

	// Create session table
	await db.exec(`
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
    );
  `);

	// Create account table for OAuth providers
	await db.exec(`
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
    );
  `);

	// Create verification table for email verification and password reset
	await db.exec(`
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

	// Create organization table (for multi-tenancy)
	await db.exec(`
    CREATE TABLE IF NOT EXISTS organization (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo TEXT,
      metadata TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

	// Create organization membership table
	await db.exec(`
    CREATE TABLE IF NOT EXISTS organization_member (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
      UNIQUE(organization_id, user_id)
    );
  `);

	// Create API key table
	await db.exec(`
    CREATE TABLE IF NOT EXISTS api_key (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      user_id TEXT NOT NULL,
      organization_id TEXT,
      expires_at INTEGER,
      last_used INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE CASCADE
    );
  `);

	// Create passkey table for WebAuthn
	await db.exec(`
    CREATE TABLE IF NOT EXISTS passkey (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      public_key TEXT NOT NULL,
      credential_id TEXT NOT NULL UNIQUE,
      counter INTEGER NOT NULL DEFAULT 0,
      device_type TEXT,
      backed_up INTEGER DEFAULT 0 CHECK(backed_up IN (0, 1)),
      transports TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
  `);

	// Create two-factor table
	await db.exec(`
    CREATE TABLE IF NOT EXISTS two_factor (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      secret TEXT NOT NULL,
      backup_codes TEXT,
      enabled INTEGER DEFAULT 0 CHECK(enabled IN (0, 1)),
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
      UNIQUE(user_id)
    );
  `);

	// Create indexes for better performance
	await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);
    CREATE INDEX IF NOT EXISTS idx_session_token ON session(session_token);
    CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
    CREATE INDEX IF NOT EXISTS idx_account_provider ON account(provider_id, provider_account_id);
    CREATE INDEX IF NOT EXISTS idx_account_user_id ON account(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
    CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification(expires);
    CREATE INDEX IF NOT EXISTS idx_org_member_user_id ON organization_member(user_id);
    CREATE INDEX IF NOT EXISTS idx_org_member_org_id ON organization_member(organization_id);
    CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_key(key_hash);
    CREATE INDEX IF NOT EXISTS idx_api_key_user_id ON api_key(user_id);
    CREATE INDEX IF NOT EXISTS idx_passkey_user_id ON passkey(user_id);
    CREATE INDEX IF NOT EXISTS idx_passkey_credential_id ON passkey(credential_id);
    CREATE INDEX IF NOT EXISTS idx_2fa_user_id ON two_factor(user_id);
  `);

	console.log('Better Auth schema migration completed');
};

export const down = async (db: Database.Database) => {
	// Drop tables in reverse order to respect foreign keys
	await db.exec(`DROP TABLE IF EXISTS two_factor;`);
	await db.exec(`DROP TABLE IF EXISTS passkey;`);
	await db.exec(`DROP TABLE IF EXISTS api_key;`);
	await db.exec(`DROP TABLE IF EXISTS organization_member;`);
	await db.exec(`DROP TABLE IF EXISTS organization;`);
	await db.exec(`DROP TABLE IF EXISTS verification;`);
	await db.exec(`DROP TABLE IF EXISTS account;`);
	await db.exec(`DROP TABLE IF EXISTS session;`);
	await db.exec(`DROP TABLE IF EXISTS user;`);

	console.log('Better Auth schema migration rolled back');
};

// Helper function to run migration
export const runMigration = async (db: Database.Database) => {
	try {
		await up(db);
		console.log('Better Auth migration completed successfully');
	} catch (error) {
		console.error('Migration failed:', error);
		throw error;
	}
};
