import { betterAuth } from 'better-auth';
import { bearer, magicLink, organization, twoFactor } from 'better-auth/plugins';
import { createBetterAuthAdapter } from '../db/better-auth-adapter';
import { env } from '../lib/env';
import { authMonitoringService } from '../services/authMonitoringService';
import { emailService } from '../services/emailService';

// Better Auth configuration
export const auth = betterAuth({
	database: createBetterAuthAdapter(),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BASE_URL,

	// Email and password authentication
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: env.NODE_ENV === 'production',
		minPasswordLength: 8,
		maxPasswordLength: 64,
		passwordReset: {
			enabled: true,
			expiresIn: 3600, // 1 hour
		},
	},

	// Session configuration
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
		cookieCache: {
			enabled: true,
			name: 'session-cache',
		},
		cookieAttributes: {
			secure: env.NODE_ENV === 'production',
			sameSite: 'lax',
			domain: env.COOKIE_DOMAIN,
		},
	},

	// Rate limiting
	rateLimit: {
		enabled: true,
		window: 60, // 1 minute
		max: 100, // 100 requests per minute
		storage: 'memory', // Use Redis for production
	},

	// Advanced configuration
	advanced: {
		cookiePrefix: 'cortex-auth',
		crossSubDomainCookies: {
			enabled: false, // Enable if using subdomains
		},
		useSecureCookies: env.NODE_ENV === 'production',
		disableCSRF: false,
	},

	// Database hooks
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					console.log('Creating user:', user.email);
					// Add any preprocessing here
					return user;
				},
				after: async (user) => {
					console.log('User created:', user.id);
					// Log registration event
					await authMonitoringService.logEvent({
						userId: user.id,
						eventType: 'register',
					});
					// TODO: Emit A2A event for user creation
				},
			},
		},
		session: {
			create: {
				after: async (session) => {
					console.log('Session created for user:', session.userId);
					// Track active sessions
					await authMonitoringService.logEvent({
						userId: session.userId,
						eventType: 'login',
					});
				},
			},
		},
	},

	// Social providers
	socialProviders: {
		github: {
			clientId: env.GITHUB_CLIENT_ID || '',
			clientSecret: env.GITHUB_CLIENT_SECRET || '',
		},
		google: {
			clientId: env.GOOGLE_CLIENT_ID || '',
			clientSecret: env.GOOGLE_CLIENT_SECRET || '',
		},
		discord: {
			clientId: env.DISCORD_CLIENT_ID || '',
			clientSecret: env.DISCORD_CLIENT_SECRET || '',
		},
		// Add more providers as needed
	},

	// Email configuration (for verification and password reset)
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			try {
				await emailService.sendVerificationEmail(user, url);
			} catch (error) {
				console.error('Failed to send verification email:', error);
				// Fallback to console logging in development
				if (env.NODE_ENV === 'development') {
					console.log('\n=== EMAIL VERIFICATION (Fallback) ===');
					console.log('To:', user.email);
					console.log('URL:', url);
					console.log('===================================\n');
				}
			}
		},
	},

	// Password reset email
	passwordReset: {
		sendResetPasswordEmail: async ({ user, url }) => {
			try {
				await emailService.sendPasswordResetEmail(user, url);
			} catch (error) {
				console.error('Failed to send password reset email:', error);
				// Fallback to console logging in development
				if (env.NODE_ENV === 'development') {
					console.log('\n=== PASSWORD RESET (Fallback) ===');
					console.log('To:', user.email);
					console.log('URL:', url);
					console.log('==================================\n');
				}
			}
		},
	},

	// Plugins
	plugins: [
		// Bearer token authentication for API access
		bearer({
			storage: 'database',
		}),

		// Organization support for multi-tenancy
		organization({
			ac: {
				enabled: true,
				model: 'rbac',
			},
		}),

		// Two-factor authentication
		twoFactor({
			issuer: 'Cortex-OS',
			totpOptions: {
				algorithm: 'SHA1',
				digits: 6,
				period: 30,
			},
			// Backup codes
			backupCodes: {
				enabled: true,
				length: 10,
				generate: () => {
					const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
					const codes = [];
					for (let i = 0; i < 10; i++) {
						let code = '';
						for (let j = 0; j < 8; j++) {
							code += chars.charAt(Math.floor(Math.random() * chars.length));
						}
						codes.push(code);
					}
					return codes;
				},
			},
			// Enforcement options
			enforce: {
				enabled: env.ENFORCE_2FA,
				role: 'admin', // Only enforce for admin role
			},
		}),

		// Magic link authentication
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				try {
					await emailService.sendMagicLink(email, url);
				} catch (error) {
					console.error('Failed to send magic link:', error);
					// Fallback to console logging in development
					if (env.NODE_ENV === 'development') {
						console.log('\n=== MAGIC LINK (Fallback) ===');
						console.log('To:', email);
						console.log('URL:', url);
						console.log('===========================\n');
					}
				}
			},
			expiresIn: 3600, // 1 hour
		}),

		// OAuth2 plugin for custom providers - disabled for now
		// oauth2(),
	],
});

// Export auth handler for Express
export const authHandler = auth.handler;

// Export types
export type Auth = typeof auth;

// Export authentication utilities
export const authUtils = {
	// Get session from request
	getSession: async (request: Request) => {
		return auth.api.getSession({
			headers: Object.fromEntries(request.headers.entries()),
		});
	},

	// Get user from session
	getUser: async (request: Request) => {
		const session = await authUtils.getSession(request);
		return session?.user;
	},

	// Require authentication middleware
	requireAuth: async (request: Request) => {
		const session = await authUtils.getSession(request);
		if (!session) {
			throw new Error('Authentication required');
		}
		return session;
	},

	// Check if user has specific role
	hasRole: async (request: Request, role: string) => {
		const user = await authUtils.getUser(request);
		return user?.role === role;
	},

	// Create API key for user
	createAPIKey: async (userId: string, name: string) => {
		return auth.api.createAPIKey({
			userId,
			name,
		});
	},

	// Validate API key
	validateAPIKey: async (apiKey: string) => {
		return auth.api.validateAPIKey({
			apiKey,
		});
	},
};

// Initialize database tables if they don't exist
export const initializeAuthTables = async () => {
	// Import database instance
	const { sqlite } = await import('../db');

	// Enable foreign keys
	await sqlite.exec('PRAGMA foreign_keys = ON');

	// Create tables using drizzle
	// Note: Better Auth handles schema creation automatically
	// This is just for additional setup if needed

	console.log('Auth tables initialized');
};

// Export for use in server
export type { schema };
