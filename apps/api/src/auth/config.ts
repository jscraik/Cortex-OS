import { betterAuth } from 'better-auth';
import { organization, twoFactor, username } from 'better-auth/plugins';
import cors from 'cors';
import helmet from 'helmet';
import { DatabaseAdapter } from './database-adapter.js';

export const auth = betterAuth({
	database: new DatabaseAdapter(),
	baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
	secret: process.env.BETTER_AUTH_SECRET || 'better-auth-secret',

	// Email configuration
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},

	// Rate limiting
	rateLimit: {
		enabled: true,
		window: 60, // 1 minute
		max: 100, // 100 requests per minute
	},

	// Session configuration
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5, // 5 minutes
		},
	},

	// Advanced security
	advanced: {
		crossSubDomainCookies: {
			enabled: true,
		},
		useSecureCookies: process.env.NODE_ENV === 'production',
		disableCSRFCheck: false,
	},

	// Social providers
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID || '',
			clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
		},
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
		},
	},

	// Plugins
	plugins: [username(), passkey(), twoFactor({}), organization({})],

	// Hooks
	hooks: {},
});

// Export Express middleware
export const authMiddleware = auth.handler;

// Export CORS middleware for auth routes
export const authCors = cors({
	origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ['Content-Type', 'Authorization'],
});

// Security middleware
export const securityMiddleware = helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			scriptSrc: ["'self'"],
			imgSrc: ["'self'", 'data:', 'https:'],
		},
	},
});
