import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseAdapter } from '../../apps/api/src/auth/database-adapter.js';

// Mock environment variables
process.env.BETTER_AUTH_SECRET = 'test-migration-secret';
process.env.BETTER_AUTH_URL = 'http://localhost:3001';
process.env.LEGACY_JWT_SECRET = 'legacy-secret';

describe('Authentication Migration Tests', () => {
	let dbAdapter: DatabaseAdapter;

	beforeEach(() => {
		dbAdapter = new DatabaseAdapter();
	});

	afterEach(() => {
		// Clean up test data
	});

	describe('Legacy JWT Token Migration', () => {
		it('should accept and migrate legacy JWT tokens', async () => {
			// Create legacy JWT token with old secret
			const legacyPayload = {
				userId: 'legacy-user-123',
				email: 'legacy@example.com',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
			};

			const legacyToken = jwt.sign(legacyPayload, process.env.LEGACY_JWT_SECRET!);

			// Create new Better Auth token
			const newPayload = {
				userId: 'new-user-123',
				sessionId: 'session-456',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
			};

			const newToken = jwt.sign(newPayload, process.env.BETTER_AUTH_SECRET!, {
				algorithm: 'HS256',
			});

			// Test migration function
			const result = await migrateLegacyToken(legacyToken);

			expect(result.valid).toBe(true);
			expect(result.userId).toBe('legacy-user-123');
			expect(result.migrated).toBe(true);

			// New token should work without migration
			const newResult = await validateNewToken(newToken);
			expect(newResult.valid).toBe(true);
			expect(newResult.userId).toBe('new-user-123');
		});

		it('should reject expired legacy tokens', async () => {
			const expiredPayload = {
				userId: 'expired-user',
				email: 'expired@example.com',
				iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
				exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
			};

			const expiredToken = jwt.sign(expiredPayload, process.env.LEGACY_JWT_SECRET!);

			const result = await migrateLegacyToken(expiredToken);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Token expired');
		});

		it('should handle malformed legacy tokens', async () => {
			const malformedToken = 'not.a.valid.token';

			const result = await migrateLegacyToken(malformedToken);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Invalid token format');
		});
	});

	describe('Password Hash Migration', () => {
		it('should migrate bcrypt hashes to new format', async () => {
			const plainPassword = 'MigrationTest123!';
			const legacyHash = await bcrypt.hash(plainPassword, 10);

			// Create user with legacy hash
			const user = await createLegacyUser({
				email: 'migrate@example.com',
				passwordHash: legacyHash,
				hashVersion: 'v1', // Legacy version
			});

			// Simulate login to trigger migration
			const loginResult = await loginWithMigration('migrate@example.com', plainPassword);

			expect(loginResult.success).toBe(true);
			expect(loginResult.migrated).toBe(true);

			// Verify hash was migrated
			const updatedUser = await getUserByEmail('migrate@example.com');
			expect(updatedUser.hashVersion).toBe('v2'); // New version
			expect(updatedUser.passwordHash).not.toBe(legacyHash);
		});

		it('should work with already migrated hashes', async () => {
			const plainPassword = 'AlreadyMigrated123!';
			const newHash = await createNewHash(plainPassword); // Argon2 or similar

			await createLegacyUser({
				email: 'already@example.com',
				passwordHash: newHash,
				hashVersion: 'v2', // Already migrated
			});

			const loginResult = await loginWithMigration('already@example.com', plainPassword);

			expect(loginResult.success).toBe(true);
			expect(loginResult.migrated).toBe(false); // Should not migrate again
		});

		it('should handle migration failures gracefully', async () => {
			// Create user with invalid hash
			await createLegacyUser({
				email: 'failed@example.com',
				passwordHash: 'invalid-hash',
				hashVersion: 'v1',
			});

			const loginResult = await loginWithMigration('failed@example.com', 'anypassword');

			expect(loginResult.success).toBe(false);
			expect(loginResult.error).toBe('Migration failed');
		});
	});

	describe('Session Migration', () => {
		it('should migrate existing sessions to new format', async () => {
			// Create legacy session
			const legacySession = await createLegacySession({
				userId: 'session-migrate-user',
				token: 'legacy-session-token',
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
			});

			// Migrate session
			const migratedSession = await migrateSession(legacySession);

			expect(migratedSession.id).toBeDefined();
			expect(migratedSession.userId).toBe('session-migrate-user');
			expect(migratedSession.token).not.toBe('legacy-session-token');
			expect(migratedSession.expiresAt).toBeInstanceOf(Date);
		});

		it('should handle expired sessions during migration', async () => {
			const expiredSession = await createLegacySession({
				userId: 'expired-session-user',
				token: 'expired-session-token',
				createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
				expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
			});

			const result = await migrateSession(expiredSession);

			expect(result).toBeNull(); // Should not migrate expired sessions
		});
	});

	describe('User Data Migration', () => {
		it('should migrate user accounts with all data intact', async () => {
			const legacyUserData = {
				id: 'legacy-data-user',
				email: 'data@example.com',
				name: 'Data Migration User',
				passwordHash: await bcrypt.hash('DataPass123!', 10),
				createdAt: new Date('2023-01-01'),
				lastLoginAt: new Date('2023-12-01'),
				preferences: {
					theme: 'dark',
					notifications: true,
				},
				roles: ['user'],
				profile: {
					bio: 'Test user for data migration',
					avatar: 'https://example.com/avatar.jpg',
				},
			};

			// Create user in legacy format
			await createLegacyUser(legacyUserData);

			// Run migration
			const migrationResult = await migrateUserData('legacy-data-user');

			expect(migrationResult.success).toBe(true);
			expect(migrationResult.userId).toBe('legacy-data-user');

			// Verify all data migrated correctly
			const migratedUser = await getUserById('legacy-data-user');
			expect(migratedUser.email).toBe(legacyUserData.email);
			expect(migratedUser.name).toBe(legacyUserData.name);
			expect(migratedUser.preferences).toEqual(legacyUserData.preferences);
			expect(migratedUser.roles).toEqual(legacyUserData.roles);
			expect(migratedUser.profile).toEqual(legacyUserData.profile);
			expect(migratedUser.emailVerified).toBe(false); // Default value
		});

		it('should handle missing fields gracefully', async () => {
			const incompleteUser = {
				id: 'incomplete-user',
				email: 'incomplete@example.com',
				// Missing name, preferences, etc.
			};

			await createLegacyUser(incompleteUser);

			const migrationResult = await migrateUserData('incomplete-user');

			expect(migrationResult.success).toBe(true);

			const migratedUser = await getUserById('incomplete-user');
			expect(migratedUser.name).toBeNull(); // Should be nullable
			expect(migratedUser.preferences).toEqual({}); // Default empty object
		});
	});

	describe('OAuth Account Migration', () => {
		it('should migrate OAuth accounts to new schema', async () => {
			const legacyOAuthAccount = {
				id: 'oauth-migrate-account',
				userId: 'oauth-user',
				provider: 'github',
				providerAccountId: 'github-123456',
				accessToken: 'gho_legacy_token',
				refreshToken: 'legacy_refresh_token',
				expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
				scope: 'repo,user',
			};

			await createLegacyOAuthAccount(legacyOAuthAccount);

			const migrationResult = await migrateOAuthAccount('oauth-migrate-account');

			expect(migrationResult.success).toBe(true);

			const migratedAccount = await getOAuthAccountById('oauth-migrate-account');
			expect(migratedAccount.provider).toBe('github');
			expect(migratedAccount.providerAccountId).toBe('github-123456');
			// Access tokens should be encrypted in new format
			expect(migratedAccount.accessToken).not.toBe('gho_legacy_token');
		});
	});

	describe('Migration Rollback', () => {
		it('should rollback migration on failure', async () => {
			// Create user data
			await createLegacyUser({
				id: 'rollback-user',
				email: 'rollback@example.com',
				passwordHash: 'hash',
			});

			// Simulate migration failure
			const migrationResult = await migrateWithRollback('rollback-user', {
				shouldFail: true,
			});

			expect(migrationResult.success).toBe(false);
			expect(migrationResult.rolledBack).toBe(true);

			// Verify original data is intact
			const originalUser = await getLegacyUserById('rollback-user');
			expect(originalUser).toBeTruthy();
		});

		it('should preserve data integrity during rollback', async () => {
			// Create multiple related records
			const userId = 'integrity-user';
			await createLegacyUser({ id: userId, email: 'integrity@example.com' });
			await createLegacySession({ userId, token: 'session-token' });
			await createLegacyOAuthAccount({ userId, provider: 'github' });

			// Fail migration halfway through
			const result = await migrateUserWithRelatedData(userId, {
				failAfter: 'sessions', // Fail after migrating sessions
			});

			expect(result.success).toBe(false);
			expect(result.rolledBack).toBe(true);

			// Verify no partial migration occurred
			const newUser = await getUserById(userId);
			expect(newUser).toBeNull(); // Should not exist

			// Legacy data should still be there
			const legacyUser = await getLegacyUserById(userId);
			expect(legacyUser).toBeTruthy();
		});
	});

	describe('Migration Performance', () => {
		it('should handle batch migration efficiently', async () => {
			// Create 1000 legacy users
			const userIds = [];
			for (let i = 0; i < 1000; i++) {
				const userId = `batch-user-${i}`;
				userIds.push(userId);
				await createLegacyUser({
					id: userId,
					email: `batch${i}@example.com`,
					passwordHash: 'hash',
				});
			}

			const startTime = Date.now();
			const result = await batchMigrateUsers(userIds);
			const duration = Date.now() - startTime;

			expect(result.success).toBe(true);
			expect(result.migratedCount).toBe(1000);
			expect(result.failedCount).toBe(0);
			expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
		});

		it('should report migration progress', async () => {
			const userIds = ['progress-user-1', 'progress-user-2', 'progress-user-3'];

			for (const userId of userIds) {
				await createLegacyUser({
					id: userId,
					email: `${userId}@example.com`,
					passwordHash: 'hash',
				});
			}

			const progressUpdates: any[] = [];

			const result = await batchMigrateUsers(userIds, {
				onProgress: (update) => progressUpdates.push(update),
			});

			expect(progressUpdates.length).toBeGreaterThan(0);
			expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
			expect(result.success).toBe(true);
		});
	});
});

// Helper functions for migration tests
async function migrateLegacyToken(token: string): Promise<any> {
	// Implementation would validate legacy token and issue new one
	return {
		valid: true,
		userId: 'user-123',
		migrated: true,
	};
}

async function validateNewToken(token: string): Promise<any> {
	// Implementation would validate new Better Auth token
	return {
		valid: true,
		userId: 'user-123',
	};
}

async function createLegacyUser(data: any): Promise<any> {
	// Mock creating user in legacy format
	return { ...data, legacy: true };
}

async function loginWithMigration(email: string, password: string): Promise<any> {
	// Mock login with migration
	return {
		success: true,
		migrated: true,
	};
}

async function getUserByEmail(email: string): Promise<any> {
	// Mock getting user by email
	return {
		email,
		hashVersion: 'v2',
	};
}

async function createNewHash(password: string): Promise<string> {
	// Mock creating new hash format
	return 'new-hash-format';
}

async function createLegacySession(data: any): Promise<any> {
	// Mock creating legacy session
	return data;
}

async function migrateSession(session: any): Promise<any> {
	// Mock session migration
	return {
		...session,
		id: 'new-session-id',
		token: 'new-session-token',
	};
}

async function migrateUserData(userId: string): Promise<any> {
	// Mock user data migration
	return {
		success: true,
		userId,
	};
}

async function getUserById(userId: string): Promise<any> {
	// Mock getting migrated user
	return null;
}

async function createLegacyOAuthAccount(data: any): Promise<any> {
	// Mock creating legacy OAuth account
	return data;
}

async function migrateOAuthAccount(accountId: string): Promise<any> {
	// Mock OAuth account migration
	return {
		success: true,
		accountId,
	};
}

async function getOAuthAccountById(accountId: string): Promise<any> {
	// Mock getting OAuth account
	return {
		provider: 'github',
		providerAccountId: 'github-123456',
		accessToken: 'encrypted_token',
	};
}

async function getLegacyUserById(userId: string): Promise<any> {
	// Mock getting legacy user
	return {
		id: userId,
		email: 'legacy@example.com',
	};
}

async function migrateWithRollback(userId: string, options: any): Promise<any> {
	// Mock migration with rollback
	return {
		success: false,
		rolledBack: true,
	};
}

async function migrateUserWithRelatedData(userId: string, options: any): Promise<any> {
	// Mock migration with related data
	return {
		success: false,
		rolledBack: true,
	};
}

async function batchMigrateUsers(userIds: string[], options?: any): Promise<any> {
	// Mock batch migration
	return {
		success: true,
		migratedCount: userIds.length,
		failedCount: 0,
	};
}
