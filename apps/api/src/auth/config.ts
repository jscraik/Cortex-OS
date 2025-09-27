import { betterAuth } from 'better-auth';
import cors from 'cors';
import type { RequestHandler } from 'express';
import helmet from 'helmet';
import { createBetterAuthPrismaAdapter } from './database-adapter.js';
import { createAuthExpressMiddleware } from './express-adapter.js';

const BETTER_AUTH_BASE_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3001/auth';
export const AUTH_BASE_URL = BETTER_AUTH_BASE_URL;
const USER_PASSWORD_FIELD_KEY = 'password' as const;
const USER_PASSWORD_COLUMN = 'password' as const;
const ACCOUNT_PASSWORD_FIELD_KEY = 'password' as const;
const ACCOUNT_PASSWORD_COLUMN = 'credentialHash' as const;

const databaseAdapter = createBetterAuthPrismaAdapter();

const userFields = {
	email: 'email',
	emailVerified: 'emailVerified',
	name: 'name',
	[USER_PASSWORD_FIELD_KEY]: USER_PASSWORD_COLUMN,
	createdAt: 'createdAt',
	updatedAt: 'updatedAt',
} as const;

const sessionFields = {
	token: 'token',
	userId: 'userId',
	expiresAt: 'expiresAt',
	createdAt: 'createdAt',
	updatedAt: 'updatedAt',
	ipAddress: 'ipAddress',
	userAgent: 'userAgent',
} as const;

const sessionConfig = {
	fields: sessionFields,
	expiresIn: 60 * 60 * 24 * 7,
	updateAge: 60 * 60 * 24,
	cookieCache: {
		enabled: true,
		maxAge: 60 * 5,
	},
} as const;

const accountFields = {
	providerId: 'provider',
	accountId: 'providerAccountId',
	[ACCOUNT_PASSWORD_FIELD_KEY]: ACCOUNT_PASSWORD_COLUMN,
	type: 'type',
	refreshToken: 'refreshToken',
	accessToken: 'accessToken',
	accessTokenExpiresAt: 'expiresAt',
	idToken: 'idToken',
	scope: 'scope',
	createdAt: 'createdAt',
	updatedAt: 'updatedAt',
} as const;

export const auth: ReturnType<typeof betterAuth> = betterAuth({
	database: databaseAdapter,
	user: { fields: userFields },
	session: sessionConfig,
	account: { fields: accountFields },
	baseURL: AUTH_BASE_URL,
	secret: process.env.BETTER_AUTH_SECRET || 'better-auth-secret',

	// Email configuration (tests do not wire a mailer yet)
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},

	// Rate limiting
	rateLimit: {
		enabled: true,
		window: 60, // 1 minute
		max: 100, // 100 requests per minute
	},

	// Advanced security
	advanced: {
		crossSubDomainCookies: {
			enabled: true,
		},
		useSecureCookies: process.env.NODE_ENV === 'production',
		disableCSRFCheck: false,
	},

	// Social providers (not required for persistence spec but kept configurable)
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

	// Optional plugins disabled until supporting schema and flows are implemented
	plugins: [],
});

// Export Express middleware
export const authMiddleware: RequestHandler = createAuthExpressMiddleware(
	auth.handler,
	AUTH_BASE_URL,
);

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
