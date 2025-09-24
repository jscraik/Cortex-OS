/**
 * Migration test utilities for Better Auth integration.
 *
 * This file provides utilities for testing backward compatibility
 * and data migration from legacy authentication systems.
 */

import { createId } from '@cortex-os/a2a-core';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Error messages
const UNKNOWN_ERROR = 'Unknown error';

export interface LegacyUser {
	id: string;
	email: string;
	name?: string;
	passwordHash: string;
	hashVersion: 'v1' | 'v2';
	emailVerified?: boolean;
	createdAt: Date;
	lastLoginAt?: Date;
	preferences?: Record<string, unknown>;
	roles?: string[];
	profile?: {
		bio?: string;
		avatar?: string;
	};
}

export interface LegacySession {
	id?: string;
	userId: string;
	token: string;
	createdAt: Date;
	expiresAt: Date;
	userAgent?: string;
	ipAddress?: string;
}

export interface LegacyOAuthAccount {
	id?: string;
	userId: string;
	provider: 'github' | 'google' | 'discord';
	providerAccountId: string;
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
	scope?: string;
}

export interface MigrationResult {
	success: boolean;
	migrated?: boolean;
	error?: string;
	userId?: string;
	rolledBack?: boolean;
}

export interface BatchMigrationResult {
	success: boolean;
	migratedCount: number;
	failedCount: number;
	errors?: string[];
	duration: number;
}

/**
 * Create a legacy JWT token for testing migration
 */
export function createLegacyToken(payload: Record<string, unknown>): string {
	return jwt.sign(payload, process.env.LEGACY_JWT_SECRET || 'legacy-secret', {
		algorithm: 'HS256',
	});
}

/**
 * Create a bcrypt password hash (legacy format)
 */
export async function createLegacyPasswordHash(password: string): Promise<string> {
	return bcrypt.hash(password, 10);
}

/**
 * Create a new Argon2 password hash (new format)
 */
export async function createNewPasswordHash(password: string): Promise<string> {
	// In a real implementation, this would use Argon2
	// For testing, we'll use a simple hash
	return `argon2:${Buffer.from(password).toString('base64')}`;
}

/**
 * Verify legacy password hash
 */
export async function verifyLegacyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/**
 * Verify new password hash
 */
export async function verifyNewPassword(password: string, hash: string): Promise<boolean> {
	// Mock Argon2 verification
	if (hash.startsWith('argon2:')) {
		const storedPassword = Buffer.from(hash.substring('argon2:'.length), 'base64').toString();
		return password === storedPassword;
	}
	return false;
}

/**
 * Migration helper for JWT tokens
 */
export class JWTTokenMigrator {
	private legacySecret: string;
	private newSecret: string;

	constructor(legacySecret: string, newSecret: string) {
		this.legacySecret = legacySecret;
		this.newSecret = newSecret;
	}

	/**
	 * Migrate legacy token to new format
	 */
	async migrate(legacyToken: string): Promise<MigrationResult> {
		try {
			// Verify legacy token
			const legacyPayload = jwt.verify(legacyToken, this.legacySecret) as Record<string, unknown>;

			// Create new token
			const newPayload = {
				userId: legacyPayload.userId,
				sessionId: legacyPayload.sessionId || createId(),
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
			};

			// Create token but don't use it (migration only validates)
			jwt.sign(newPayload, this.newSecret, {
				algorithm: 'HS256',
				issuer: 'cortex-os-mcp',
				audience: 'cortex-os-clients',
			});

			return {
				success: true,
				migrated: true,
				userId: legacyPayload.userId,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : UNKNOWN_ERROR,
			};
		}
	}

	/**
	 * Validate new token
	 */
	validate(newToken: string): unknown {
		return jwt.verify(newToken, this.newSecret, {
			algorithms: ['HS256'],
			issuer: 'cortex-os-mcp',
			audience: 'cortex-os-clients',
		});
	}
}

/**
 * Migration helper for password hashes
 */
export class PasswordHashMigrator {
	/**
	 * Migrate password hash from bcrypt to Argon2
	 */
	async migrate(email: string, password: string, legacyHash: string): Promise<MigrationResult> {
		try {
			// Verify with legacy hash
			const isValid = await verifyLegacyPassword(password, legacyHash);
			if (!isValid) {
				return {
					success: false,
					error: 'Invalid password',
				};
			}

			// Create new hash but don't use it (migration only validates)
			await createNewPasswordHash(password);

			return {
				success: true,
				migrated: true,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : UNKNOWN_ERROR,
			};
		}
	}
}

/**
 * Migration helper for user data
 */
export class UserDataMigrator {
	/**
	 * Migrate user from legacy format to new format
	 */
	async migrateUser(legacyUser: LegacyUser): Promise<MigrationResult> {
		try {
			// Validate required fields
			if (!legacyUser.email || !legacyUser.passwordHash) {
				return {
					success: false,
					error: 'Missing required fields',
				};
			}

			// Migrate password hash if needed
			let passwordHash = legacyUser.passwordHash;
			let migrated = false;

			if (legacyUser.hashVersion === 'v1') {
				// In a real implementation, you'd need the plain password
				// For testing, we'll just mark it as migrated
				passwordHash = await createNewPasswordHash('dummy-password');
				migrated = true;
			}

			// Create new user format
			const newUser = {
				id: legacyUser.id,
				email: legacyUser.email,
				name: legacyUser.name,
				emailVerified: legacyUser.emailVerified ?? false,
				passwordHash,
				hashVersion: 'v2' as const,
				createdAt: legacyUser.createdAt,
				updatedAt: new Date(),
				lastLoginAt: legacyUser.lastLoginAt,
				preferences: legacyUser.preferences || {},
				roles: legacyUser.roles || ['user'],
				profile: legacyUser.profile || {},
			};

			// In a real implementation, save to database
			console.log('Migrated user:', newUser);

			return {
				success: true,
				migrated,
				userId: legacyUser.id,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : UNKNOWN_ERROR,
			};
		}
	}
}

/**
 * Migration helper for OAuth accounts
 */
export class OAuthAccountMigrator {
	/**
	 * Migrate OAuth account
	 */
	async migrateAccount(legacyAccount: LegacyOAuthAccount): Promise<MigrationResult> {
		try {
			// Encrypt sensitive data in new format
			const encryptedAccessToken = `encrypted:${legacyAccount.accessToken}`;
			const encryptedRefreshToken = legacyAccount.refreshToken
				? `encrypted:${legacyAccount.refreshToken}`
				: null;

			const newAccount = {
				id: legacyAccount.id || createId(),
				userId: legacyAccount.userId,
				provider: legacyAccount.provider,
				providerAccountId: legacyAccount.providerAccountId,
				accessToken: encryptedAccessToken,
				refreshToken: encryptedRefreshToken,
				expiresAt: legacyAccount.expiresAt,
				scope: legacyAccount.scope || '',
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// In a real implementation, save to database
			console.log('Migrated OAuth account:', newAccount);

			return {
				success: true,
				migrated: true,
				userId: legacyAccount.userId,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : UNKNOWN_ERROR,
			};
		}
	}
}

/**
 * Batch migration utilities
 */
export class BatchMigrator {
	private tokenMigrator: JWTTokenMigrator;
	private passwordMigrator: PasswordHashMigrator;
	private userMigrator: UserDataMigrator;
	private oauthMigrator: OAuthAccountMigrator;

	constructor() {
		this.tokenMigrator = new JWTTokenMigrator(
			process.env.LEGACY_JWT_SECRET || 'legacy-secret',
			process.env.BETTER_AUTH_SECRET || 'better-auth-secret',
		);
		this.passwordMigrator = new PasswordHashMigrator();
		this.userMigrator = new UserDataMigrator();
		this.oauthMigrator = new OAuthAccountMigrator();
	}

	/**
	 * Migrate a single user
	 */
	private async migrateSingleUser(
		userId: string,
		options: { dryRun?: boolean },
	): Promise<{ success: boolean; error?: string }> {
		try {
			if (options.dryRun) {
				return { success: true };
			}

			const legacyUser = await this.getLegacyUser(userId);
			if (!legacyUser) {
				return { success: false, error: `User ${userId} not found` };
			}

			const result = await this.userMigrator.migrateUser(legacyUser);
			return {
				success: result.success,
				error: result.success ? undefined : `Failed to migrate user ${userId}: ${result.error}`,
			};
		} catch (error) {
			return {
				success: false,
				error: `Error migrating user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}
	}

	/**
	 * Migrate all users in batch
	 */
	async migrateUsers(
		userIds: string[],
		options: {
			batchSize?: number;
			onProgress?: (progress: number) => void;
			dryRun?: boolean;
		} = {},
	): Promise<BatchMigrationResult> {
		const startTime = Date.now();
		const batchSize = options.batchSize || 100;
		const total = userIds.length;
		let migrated = 0;
		let failed = 0;
		const errors: string[] = [];

		for (let i = 0; i < userIds.length; i += batchSize) {
			const batch = userIds.slice(i, i + batchSize);

			// Process batch in parallel
			const results = await Promise.all(
				batch.map(userId => this.migrateSingleUser(userId, options))
			);

			// Update counters
			results.forEach(result => {
				if (result.success) {
					migrated++;
				} else {
					failed++;
					if (result.error) {
						errors.push(result.error);
					}
				}
			});

			// Report progress
			if (options.onProgress) {
				const progress = Math.min(100, Math.round(((i + batchSize) / total) * 100));
				options.onProgress(progress);
			}
		}

		const duration = Date.now() - startTime;

		return {
			success: failed === 0,
			migratedCount: migrated,
			failedCount: failed,
			errors: errors.length > 0 ? errors : undefined,
			duration,
		};
	}

	/**
	 * Get legacy user (mock implementation)
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private async getLegacyUser(_userId: string): Promise<LegacyUser | null> {
		// In a real implementation, fetch from legacy database
		return null;
	}
}

/**
 * Test data generators
 */
export const TestDataGenerator = {
	/**
	 * Generate test legacy user
	 */
	generateLegacyUser(overrides: Partial<LegacyUser> = {}): LegacyUser {
		const user: LegacyUser = {
			id: overrides.id || createId(),
			email: overrides.email || `test-${Date.now()}@example.com`,
			name: overrides.name || 'Test User',
			passwordHash: overrides.passwordHash || 'legacy-hash',
			hashVersion: overrides.hashVersion || 'v1',
			emailVerified: overrides.emailVerified ?? false,
			createdAt: overrides.createdAt || new Date(),
			lastLoginAt: overrides.lastLoginAt,
			preferences: overrides.preferences || { theme: 'light' },
			roles: overrides.roles || ['user'],
			profile: overrides.profile || { bio: 'Test user' },
		};
		return user;
	},

	/**
	 * Generate test legacy session
	 */
	generateLegacySession(overrides: Partial<LegacySession> = {}): LegacySession {
		const now = new Date();
		return {
			userId: overrides.userId || createId(),
			token: overrides.token || `legacy-token-${Date.now()}`,
			createdAt: overrides.createdAt || now,
			expiresAt: overrides.expiresAt || new Date(now.getTime() + 24 * 60 * 60 * 1000),
			userAgent: overrides.userAgent || 'Test Browser',
			ipAddress: overrides.ipAddress || '127.0.0.1',
		};
	},

	/**
	 * Generate test legacy OAuth account
	 */
	generateLegacyOAuthAccount(overrides: Partial<LegacyOAuthAccount> = {}): LegacyOAuthAccount {
		return {
			userId: overrides.userId || createId(),
			provider: overrides.provider || 'github',
			providerAccountId: overrides.providerAccountId || 'github-123456',
			accessToken: overrides.accessToken || 'github-access-token',
			refreshToken: overrides.refreshToken,
			expiresAt: overrides.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			scope: overrides.scope || 'repo,user',
		};
	},
};

/**
 * Export all utilities
 */
export {
	JWTTokenMigrator,
	PasswordHashMigrator,
	UserDataMigrator,
	OAuthAccountMigrator,
	BatchMigrator,
};
