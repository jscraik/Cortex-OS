import { betterAuth } from 'better-auth';
// Better Auth plugins for testing
import { bearer, magicLink, oauth2, organization, passkey, twoFactor } from 'better-auth/plugins';
import type { Database } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';
import { createTestDatabase } from './database.js';

// OAuth providers configuration
const oauthProviders = {
	github: {
		clientId: process.env.GITHUB_CLIENT_ID || 'test-github-client',
		clientSecret: process.env.GITHUB_CLIENT_SECRET || 'test-github-secret',
		redirectURI: `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/github/callback`,
	},
	google: {
		clientId: process.env.GOOGLE_CLIENT_ID || 'test-google-client',
		clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-google-secret',
		redirectURI: `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`,
	},
	discord: {
		clientId: process.env.DISCORD_CLIENT_ID || 'test-discord-client',
		clientSecret: process.env.DISCORD_CLIENT_SECRET || 'test-discord-secret',
		redirectURI: `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/discord/callback`,
	},
};

// Create test Better Auth instance
export const createBetterAuthForTests = (db?: Database) => {
	let testDb: Database;
	let drizzleDb: ReturnType<typeof drizzle>;

	if (db) {
		testDb = db;
		drizzleDb = drizzle(testDb, { schema });
	} else {
		const testDatabase = createTestDatabase();
		testDb = testDatabase.db;
		drizzleDb = testDatabase.drizzleDb;
	}

	return betterAuth({
		database: drizzleDb,
		secret: process.env.BETTER_AUTH_SECRET || 'test-secret-key-for-development-only',
		baseURL: process.env.BASE_URL || 'http://localhost:3000',

		// Email and password authentication
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false, // Set to false for tests
			minPasswordLength: 8,
			maxPasswordLength: 64,
		},

		// Session configuration
		session: {
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			updateAge: 60 * 60 * 24, // 1 day
			cookieCache: {
				enabled: true,
				name: 'session-cache',
			},
		},

		// Rate limiting
		rateLimit: {
			enabled: true,
			window: 60, // 1 minute
			max: 100, // 100 requests per minute
		},

		// Advanced configuration
		advanced: {
			cookiePrefix: 'test-auth',
			crossSubDomainCookies: {
				enabled: false,
			},
			useSecureCookies: false, // Disable for HTTP in tests
		},

		// Database configuration
		databaseHooks: {
			user: {
				create: {
					before: async (user) => {
						console.log('Creating user:', user.email);
						return user;
					},
					after: async (user) => {
						console.log('User created:', user.id);
					},
				},
			},
		},

		// Social providers
		socialProviders: {
			github: {
				clientId: oauthProviders.github.clientId,
				clientSecret: oauthProviders.github.clientSecret,
			},
			google: {
				clientId: oauthProviders.google.clientId,
				clientSecret: oauthProviders.google.clientSecret,
			},
			discord: {
				clientId: oauthProviders.discord.clientId,
				clientSecret: oauthProviders.discord.clientSecret,
			},
		},

		// Plugins
		plugins: [
			// Bearer token authentication
			bearer(),

			// Organization support
			organization({
				ac: {
					enabled: true,
					model: 'rbac',
				},
			}),

			// Passkey/WebAuthn support
			passkey({
				rpName: 'Cortex-OS Test',
				rpID: 'localhost',
				origin: 'http://localhost:3000',
			}),

			// Two-factor authentication
			twoFactor({
				issuer: 'Cortex-OS Test',
			}),

			// Magic link authentication
			magicLink({
				sendMagicLink: async ({ email, url }) => {
					console.log('Magic link sent to:', email);
					console.log('Magic link URL:', url);
					// In tests, we'll just log instead of actually sending
					return { success: true };
				},
			}),

			// OAuth2 plugin for custom providers
			oauth2(),
		],
	});
};

// Create test instance without database for unit tests
export const betterAuthInstance = createBetterAuthForTests();

// Auth handler for Express
export const authHandler = betterAuthInstance.handler;

// Export types
export type Auth = typeof betterAuthInstance;

// Helper functions for tests
export const authHelpers = {
	// Get authentication URL for a provider
	getAuthURL: (provider: string) => {
		return `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/${provider}`;
	},

	// Get callback URL for a provider
	getCallbackURL: (provider: string) => {
		return `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/${provider}/callback`;
	},

	// Mock OAuth flow for testing
	mockOAuthFlow: async (provider: string, userId: string) => {
		// This would be used in E2E tests with actual OAuth mocking
		return {
			success: true,
			url: `/api/auth/${provider}`,
			callbackUrl: `/api/auth/${provider}/callback`,
			userId,
		};
	},

	// Create test session manually
	createTestSession: async (userId: string) => {
		const session = await betterAuthInstance.api.createSession({
			userId,
			expiresIn: 60 * 60 * 24 * 7, // 7 days
		});

		return session;
	},

	// Validate test session
	validateTestSession: async (sessionToken: string) => {
		const session = await betterAuthInstance.api.getSession({
			sessionToken,
		});

		return session;
	},

	// Invalidate test session
	invalidateTestSession: async (sessionToken: string) => {
		await betterAuthInstance.api.revokeSession({
			sessionToken,
		});
	},
};

export { betterAuthInstance as auth };
