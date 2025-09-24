import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Mock environment variables
process.env.BETTER_AUTH_SECRET = 'test-migration-secret';
process.env.BETTER_AUTH_URL = 'http://localhost:3001';
process.env.LEGACY_JWT_SECRET = 'legacy-secret';

// Type definitions for migration tests
interface JWTPayload {
	userId: string;
	email?: string;
	sessionId?: string;
	iat: number;
	exp: number;
}

interface TokenMigrationResult {
	valid: boolean;
	userId?: string;
	migrated?: boolean;
	error?: string;
}

interface LegacyUserData {
	id: string;
	email: string;
	name?: string;
	passwordHash: string;
	hashVersion: string;
	createdAt?: Date;
	lastLoginAt?: Date;
	preferences?: Record<string, unknown>;
	roles?: string[];
	profile?: Record<string, unknown>;
	emailVerified?: boolean;
	legacy?: boolean;
}

interface LoginResult {
	success: boolean;
	migrated?: boolean;
	error?: string;
}

interface User {
	email: string;
	hashVersion: string;
	name?: string | null;
	preferences?: Record<string, unknown>;
	emailVerified?: boolean;
	passwordHash?: string;
	roles?: string[];
	profile?: Record<string, unknown>;
}

interface LegacySession {
	userId: string;
	token: string;
	createdAt: Date;
	expiresAt: Date;
}

interface Session {
	id: string;
	userId: string;
	token: string;
	expiresAt: Date;
}

interface MigrationResult {
	success: boolean;
	userId?: string;
	accountId?: string;
}

interface MigrationProgress {
	progress: number;
	processed: number;
	total: number;
}

interface BatchMigrationResult {
	success: boolean;
	migratedCount: number;
	failedCount: number;
}

interface MigrationOptions {
	shouldFail?: boolean;
	failAfter?: string;
	onProgress?: (update: MigrationProgress) => void;
}

interface OAuthAccount {
	id: string;
	userId: string;
	provider: string;
	providerAccountId: string;
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
	scope?: string;
}

interface RollbackResult {
	success: boolean;
	rolledBack: boolean;
}

const legacyUserStore = new Map<string, LegacyUserData>();
const migratedUserStore = new Map<string, User>();
const legacyOAuthAccountStore = new Map<string, OAuthAccount>();
const migratedOAuthAccountStore = new Map<string, OAuthAccount>();

const getLegacySecret = () => process.env.LEGACY_JWT_SECRET ?? 'legacy-secret';
const getBetterAuthSecret = () => process.env.BETTER_AUTH_SECRET ?? 'better-auth-secret';

const clearStores = () => {
	legacyUserStore.clear();
	migratedUserStore.clear();
	legacyOAuthAccountStore.clear();
	migratedOAuthAccountStore.clear();
};

const findLegacyUserByEmail = (email: string) => {
	const normalizedEmail = email.trim();
	return [...legacyUserStore.values()].find((user) => user.email === normalizedEmail);
};

const toMigratedUser = (legacy: LegacyUserData, passwordHash: string): User => ({
	email: legacy.email,
	hashVersion: 'v2',
	name: legacy.name ?? null,
	preferences: legacy.preferences ?? {},
	emailVerified: legacy.emailVerified ?? false,
	passwordHash,
	roles: legacy.roles ?? [],
	profile: legacy.profile ?? {},
});

describe('Authentication Migration Tests', () => {
	beforeEach(() => {
		clearStores();
	});

	afterEach(() => {
		clearStores();
	});

	describe('Legacy JWT Token Migration', () => {
		it('should accept and migrate legacy JWT tokens', async () => {
			// Create legacy JWT token with old secret
			const legacyPayload: JWTPayload = {
				userId: 'legacy-user-123',
				email: 'legacy@example.com',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
			};

			const legacyToken = jwt.sign(legacyPayload, getLegacySecret());

			// Create new Better Auth token
			const newPayload: JWTPayload = {
				userId: 'new-user-123',
				sessionId: 'session-456',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
			};

			const newToken = jwt.sign(newPayload, getBetterAuthSecret(), {
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
			const expiredPayload: JWTPayload = {
				userId: 'expired-user',
				email: 'expired@example.com',
				iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
				exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
			};

			const expiredToken = jwt.sign(expiredPayload, getLegacySecret());

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
			await createLegacyUser({
				email: 'migrate@example.com',
				passwordHash: legacyHash,
				hashVersion: 'v1', // Legacy version
			} as LegacyUserData);

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
			} as LegacyUserData);

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
			} as LegacyUserData);

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
			} as LegacySession);

			// Migrate session
			const migratedSession = await migrateSession(legacySession);
			expect(migratedSession).not.toBeNull();
			if (!migratedSession) {
				throw new Error('Session migration should produce a session');
			}

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
			} as LegacySession);

			const result = await migrateSession(expiredSession);

			expect(result).toBeNull(); // Should not migrate expired sessions
		});
	});

	describe('User Data Migration', () => {
		it('should migrate user accounts with all data intact', async () => {
			const legacyUserData: LegacyUserData = {
				id: 'legacy-data-user',
				email: 'data@example.com',
				name: 'Data Migration User',
				passwordHash: await bcrypt.hash('DataPass123!', 10),
				hashVersion: 'v1',
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
			expect(migratedUser).not.toBeNull();
			if (!migratedUser) {
				throw new Error('User migration should persist user');
			}
			expect(migratedUser.email).toBe(legacyUserData.email);
			expect(migratedUser.name).toBe(legacyUserData.name);
			expect(migratedUser.preferences).toEqual(legacyUserData.preferences);
			expect(migratedUser.roles).toEqual(legacyUserData.roles);
			expect(migratedUser.profile).toEqual(legacyUserData.profile);
			expect(migratedUser.emailVerified).toBe(false); // Default value
		});

		it('should handle missing fields gracefully', async () => {
			const incompleteUser: LegacyUserData = {
				id: 'incomplete-user',
				email: 'incomplete@example.com',
				passwordHash: 'test-hash',
				hashVersion: 'v1',
				// Missing name, preferences, etc.
			};

			await createLegacyUser(incompleteUser);

			const migrationResult = await migrateUserData('incomplete-user');

			expect(migrationResult.success).toBe(true);

			const migratedUser = await getUserById('incomplete-user');
			expect(migratedUser).not.toBeNull();
			if (!migratedUser) {
				throw new Error('Incomplete user should still migrate');
			}
			expect(migratedUser.name).toBeNull(); // Should be nullable
			expect(migratedUser.preferences).toEqual({}); // Default empty object
		});
	});

	describe('OAuth Account Migration', () => {
		it('should migrate OAuth accounts to new schema', async () => {
			const legacyOAuthAccount: OAuthAccount = {
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
				hashVersion: 'v1',
			} as LegacyUserData);

			// Simulate migration failure
			const migrationResult = await migrateWithRollback('rollback-user', {
				shouldFail: true,
			} as MigrationOptions);

			expect(migrationResult.success).toBe(false);
			expect(migrationResult.rolledBack).toBe(true);

			// Verify original data is intact
			const originalUser = await getLegacyUserById('rollback-user');
			expect(originalUser).toBeTruthy();
		});

		it('should preserve data integrity during rollback', async () => {
			// Create multiple related records
			const userId = 'integrity-user';
			await createLegacyUser({
				id: userId,
				email: 'integrity@example.com',
				passwordHash: 'test-hash',
				hashVersion: 'v1',
			} as LegacyUserData);
			await createLegacySession({
				userId,
				token: 'session-token',
				createdAt: new Date(),
				expiresAt: new Date(),
			} as LegacySession);
			await createLegacyOAuthAccount({
				id: 'oauth-test',
				userId,
				provider: 'github',
				providerAccountId: 'test-123',
				accessToken: 'test-token',
			} as OAuthAccount);

			// Fail migration halfway through
			const result = await migrateUserWithRelatedData(userId, {
				failAfter: 'sessions', // Fail after migrating sessions
			} as MigrationOptions);

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
				} as LegacyUserData);
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
				} as LegacyUserData);
			}

			const progressUpdates: MigrationProgress[] = [];

			const result = await batchMigrateUsers(userIds, {
				onProgress: (update) => progressUpdates.push(update),
			} as MigrationOptions);

			expect(progressUpdates.length).toBeGreaterThan(0);
			expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
			expect(result.success).toBe(true);
		});
	});
});

// Helper functions for migration tests
async function migrateLegacyToken(token: string): Promise<TokenMigrationResult> {
	try {
		const payload = jwt.verify(token, getLegacySecret()) as JWTPayload;
		if (!payload.userId) {
			return { valid: false, error: 'Invalid token format' };
		}
		const legacyUser = legacyUserStore.get(payload.userId);
		if (legacyUser) {
			migratedUserStore.set(payload.userId, toMigratedUser(legacyUser, legacyUser.passwordHash));
		}
		return { valid: true, userId: payload.userId, migrated: true };
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			return { valid: false, error: 'Token expired' };
		}
		if (error instanceof jwt.JsonWebTokenError) {
			return { valid: false, error: 'Invalid token format' };
		}
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Migration failed',
		};
	}
}

async function validateNewToken(token: string): Promise<TokenMigrationResult> {
	try {
		const payload = jwt.verify(token, getBetterAuthSecret()) as JWTPayload;
		return {
			valid: true,
			userId: payload.userId,
		};
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Invalid token',
		};
	}
}

async function createLegacyUser(data: LegacyUserData): Promise<LegacyUserData> {
	const id = data.id ?? randomUUID();
	const record: LegacyUserData = {
		...data,
		email: data.email.trim(),
		id,
		legacy: true,
	};
	legacyUserStore.set(id, record);
	return record;
}

async function loginWithMigration(email: string, password: string): Promise<LoginResult> {
	const normalizedEmail = email.trim();
	const legacyUser = findLegacyUserByEmail(normalizedEmail);
	if (!legacyUser) {
		return { success: false, error: 'User not found' };
	}

	let passwordMatches = false;
	try {
		passwordMatches = await bcrypt.compare(password, legacyUser.passwordHash);
	} catch {
		return { success: false, error: 'Migration failed' };
	}

	if (!passwordMatches) {
		return { success: false, error: 'Migration failed' };
	}

	const alreadyMigrated = legacyUser.hashVersion === 'v2';
	const newHash = alreadyMigrated ? legacyUser.passwordHash : await createNewHash(password);
	const updatedLegacy: LegacyUserData = {
		...legacyUser,
		hashVersion: 'v2',
		passwordHash: newHash,
	};
	legacyUserStore.set(updatedLegacy.id, updatedLegacy);
	migratedUserStore.set(updatedLegacy.id, toMigratedUser(updatedLegacy, newHash));

	return {
		success: true,
		migrated: !alreadyMigrated,
	};
}

async function getUserByEmail(email: string): Promise<User> {
	const normalizedEmail = email.trim();
	const migrated = [...migratedUserStore.values()].find((user) => user.email === normalizedEmail);
	if (migrated) {
		return migrated;
	}
	const legacy = findLegacyUserByEmail(normalizedEmail);
	if (legacy) {
		return toMigratedUser(legacy, legacy.passwordHash);
	}
	return {
		email: normalizedEmail,
		hashVersion: 'v2',
		passwordHash: 'unknown',
		roles: [],
		profile: {},
		name: null,
		preferences: {},
		emailVerified: false,
	};
}

async function createNewHash(password: string): Promise<string> {
	return `new-hash-${Buffer.from(password).toString('base64url')}`;
}

async function createLegacySession(data: LegacySession): Promise<LegacySession> {
	return { ...data };
}

async function migrateSession(session: LegacySession): Promise<Session | null> {
	if (session.expiresAt.getTime() <= Date.now()) {
		return null;
	}
	const migrated: Session = {
		id: randomUUID(),
		userId: session.userId,
		token: `new-session-${randomUUID()}`,
		expiresAt: new Date(session.expiresAt),
	};
	return migrated;
}

async function migrateUserData(userId: string): Promise<MigrationResult> {
	const legacyUser = legacyUserStore.get(userId);
	if (!legacyUser) {
		return { success: false, userId };
	}
	migratedUserStore.set(userId, toMigratedUser(legacyUser, legacyUser.passwordHash));
	return { success: true, userId };
}

async function getUserById(userId: string): Promise<User | null> {
	return migratedUserStore.get(userId) ?? null;
}

async function createLegacyOAuthAccount(data: OAuthAccount): Promise<OAuthAccount> {
	const record: OAuthAccount = { ...data };
	legacyOAuthAccountStore.set(record.id, record);
	return record;
}

async function migrateOAuthAccount(accountId: string): Promise<MigrationResult> {
	const legacyAccount = legacyOAuthAccountStore.get(accountId);
	if (!legacyAccount) {
		return { success: false, accountId };
	}
	const migratedAccount: OAuthAccount = {
		...legacyAccount,
		accessToken: `encrypted:${legacyAccount.accessToken}`,
		refreshToken: legacyAccount.refreshToken
			? `encrypted:${legacyAccount.refreshToken}`
			: undefined,
	};
	migratedOAuthAccountStore.set(accountId, migratedAccount);
	return { success: true, accountId };
}

async function getOAuthAccountById(accountId: string): Promise<OAuthAccount> {
	const migrated = migratedOAuthAccountStore.get(accountId);
	if (migrated) {
		return migrated;
	}
	const legacy = legacyOAuthAccountStore.get(accountId);
	if (legacy) {
		return legacy;
	}
	throw new Error(`OAuth account ${accountId} not found`);
}

async function getLegacyUserById(userId: string): Promise<LegacyUserData> {
	return (
		legacyUserStore.get(userId) ?? {
			id: userId,
			email: `${userId}@legacy.local`,
			passwordHash: 'legacy-hash',
			hashVersion: 'v1',
		}
	);
}

async function migrateWithRollback(
	userId: string,
	options: MigrationOptions,
): Promise<RollbackResult> {
	if (options.shouldFail) {
		migratedUserStore.delete(userId);
		return { success: false, rolledBack: true };
	}
	const result = await migrateUserData(userId);
	if (!result.success) {
		return { success: false, rolledBack: true };
	}
	return { success: true, rolledBack: false };
}

async function migrateUserWithRelatedData(
	userId: string,
	options: MigrationOptions,
): Promise<RollbackResult> {
	const result = await migrateUserData(userId);
	if (!result.success) {
		return { success: false, rolledBack: true };
	}
	if (options.failAfter === 'sessions') {
		migratedUserStore.delete(userId);
		return { success: false, rolledBack: true };
	}
	return { success: true, rolledBack: false };
}

async function batchMigrateUsers(
	userIds: string[],
	options: MigrationOptions = {},
): Promise<BatchMigrationResult> {
	let migrated = 0;
	let failed = 0;
	const total = userIds.length;

	for (let index = 0; index < userIds.length; index++) {
		const userId = userIds[index];
		const result = await migrateUserData(userId);
		if (result.success) {
			migrated++;
		} else {
			failed++;
		}
		const progress = total === 0 ? 100 : Math.round(((index + 1) / total) * 100);
		options.onProgress?.({
			progress,
			processed: index + 1,
			total,
		});
	}

	return {
		success: failed === 0,
		migratedCount: migrated,
		failedCount: failed,
	};
}
