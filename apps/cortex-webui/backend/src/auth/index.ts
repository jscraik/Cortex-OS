import { betterAuth } from 'better-auth';
import { bearer, magicLink, organization, twoFactor } from 'better-auth/plugins';
import { createBetterAuthAdapter } from '../db/better-auth-adapter.js';
import { env } from '../lib/env.js';
import { webUIBusIntegration } from '../services/a2a-integration.js';
import { authMonitoringService } from '../services/authMonitoringService.js';
import { emailService } from '../services/emailService.js';

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
		sendResetPassword: async ({ user, url, token }, _request) => {
			// Implement password reset email functionality
			console.log(`Password reset requested for user ${user.email}`);
			console.log(`Reset URL: ${url}`);
			console.log(`Reset token: ${token}`);
		},
		onPasswordReset: async ({ user }, _request) => {
			// Logic to execute after password reset
			console.log(`Password for user ${user.email} has been reset.`);
		},
	},

	// Session configuration
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 minutes cache duration
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
		disableCSRFCheck: false,
	},

	// Database hooks
	databaseHooks: {
		user: {
			create: {
				before: async (user, _context) => {
					console.log('Creating user:', user.email);
					// Add any preprocessing here
					return { data: user };
				},
				after: async (user, _context) => {
					console.log('User created:', user.id);
					// Log registration event
					await authMonitoringService.logEvent({
						userId: user.id,
						eventType: 'register',
					});
					const registrationMessage = user.email
						? `brAInwav user registration completed for ${user.email}`
						: 'brAInwav user registration completed';
					try {
						await webUIBusIntegration.publishUserEvent({
							sessionId: `auth-${user.id}`,
							userId: user.id,
							timestamp: new Date().toISOString(),
							eventType: 'user_connected',
							message: registrationMessage,
							metadata: {
								source: 'better-auth',
								environment: env.NODE_ENV,
							},
						});
					} catch (error) {
						console.error('brAInwav A2A user creation publish failed', error);
					}
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

	// Plugins
	plugins: [
		// Bearer token authentication for API access
		bearer(),

		// Organization support for multi-tenancy
		organization(),

		// Two-factor authentication
		twoFactor({
			issuer: 'brAInwav Cortex-OS',
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
			headers: request.headers,
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
		// NOTE: Add role support when admin plugin is properly configured
		return (user as { role?: string })?.role === role;
	},

	// Create API key for user  
	createAPIKey: async (_userId: string, _name: string) => {
		// NOTE: Update when API key plugin is properly configured
		throw new Error('API key creation not yet implemented');
	},

	// Validate API key
	validateAPIKey: async (_apiKey: string) => {
		// NOTE: Update when API key plugin is properly configured
		throw new Error('API key validation not yet implemented');
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

// Export types
export type AuthConfig = typeof auth;
