import { hash } from 'bcryptjs';
import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';
import { createTestDatabase } from './database.js';

// Test configuration
export const testConfig = {
	secret: 'test-secret-key',
	baseURL: 'http://localhost:3000',
	database: new Database(':memory:'),
	advanced: {
		cookiePrefix: 'test-auth',
		crossSubDomainCookies: {
			enabled: false,
		},
	},
};

// Create Better Auth instance for tests
export const createTestAuth = (overrides = {}) => {
	const { drizzleDb, migrate } = createTestDatabase();

	return betterAuth({
		...testConfig,
		database: drizzleDb,
		...overrides,
	});
};

// Mock user data
export const mockUser = {
	id: 'test-user-id',
	email: 'test@example.com',
	password: 'TestPassword123!',
	name: 'Test User',
};

// Create test user helper
export const createTestUser = async (db: ReturnType<typeof drizzle>, userData = mockUser) => {
	const passwordHash = await hash(userData.password, 10);

	const [user] = await db
		.insert(schema.user)
		.values({
			id: userData.id,
			email: userData.email,
			emailVerified: 1,
			name: userData.name,
			passwordHash,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		})
		.returning();

	return user;
};

// Create test session helper
export const createTestSession = async (
	db: ReturnType<typeof drizzle>,
	userId: string,
	overrides = {},
) => {
	const [session] = await db
		.insert(schema.session)
		.values({
			id: 'test-session-id',
			sessionToken: 'test-session-token',
			userId,
			expires: Date.now() + 3600000, // 1 hour
			userAgent: 'test-agent',
			ipAddress: '127.0.0.1',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			...overrides,
		})
		.returning();

	return session;
};

// Mock OAuth provider response
export const mockOAuthResponse = {
	user: {
		id: 'oauth-user-id',
		email: 'oauth@example.com',
		name: 'OAuth User',
		image: 'https://example.com/avatar.jpg',
	},
	account: {
		providerId: 'github',
		providerAccountId: 'github-account-id',
		type: 'oauth',
		accessToken: 'github-access-token',
		refreshToken: 'github-refresh-token',
		expiresAt: Date.now() + 3600000,
		tokenType: 'Bearer',
		scope: 'user:email repo',
	},
};

// Mock email service
export const mockEmailService = {
	sendVerificationEmail: vi.fn().mockResolvedValue(true),
	sendPasswordReset: vi.fn().mockResolvedValue(true),
	sendMagicLink: vi.fn().mockResolvedValue(true),
};

// Test request helper
export const createTestRequest = (
	method: string,
	path: string,
	body?: any,
	headers: Record<string, string> = {},
) => {
	return {
		method,
		path,
		body: body ? JSON.stringify(body) : undefined,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	};
};

// Test response helper
export const createTestResponse = () => {
	const status = vi.fn().mockReturnThis();
	const json = vi.fn().mockReturnThis();
	const send = vi.fn().mockReturnThis();
	const setHeader = vi.fn().mockReturnThis();
	const end = vi.fn().mockReturnThis();

	return {
		status,
		json,
		send,
		setHeader,
		end,
		statusCode: 200,
		headers: {},
		body: null,
	};
};

// Authentication test scenarios
export const authTestScenarios = {
	validLogin: {
		email: 'test@example.com',
		password: 'TestPassword123!',
	},
	invalidPassword: {
		email: 'test@example.com',
		password: 'wrong-password',
	},
	nonExistentUser: {
		email: 'nonexistent@example.com',
		password: 'SomePassword123!',
	},
	weakPassword: {
		email: 'test@example.com',
		password: 'weak',
	},
	invalidEmail: {
		email: 'invalid-email',
		password: 'TestPassword123!',
	},
};

// Rate limiting test helper
export const simulateRateLimit = async (handler: any, times: number) => {
	const requests = [];
	for (let i = 0; i < times; i++) {
		requests.push(handler());
	}
	return Promise.all(requests);
};

// Security test helpers
export const securityTestHelpers = {
	// SQL injection attempts
	sqlInjection: [
		"' OR '1'='1",
		"'; DROP TABLE users; --",
		'1; DROP TABLE users; --',
		"' UNION SELECT * FROM users --",
	],

	// XSS attempts
	xss: [
		'<script>alert("xss")</script>',
		'javascript:alert("xss")',
		'"><script>alert("xss")</script>',
		'<img src="x" onerror="alert(\'xss\')">',
	],

	// Path traversal attempts
	pathTraversal: [
		'../../../etc/passwd',
		'..\\..\\..\\windows\\system32\\config\\sam',
		'....//....//....//etc/passwd',
	],
};

// Performance test helpers
export const performanceTestHelpers = {
	// Measure response time
	measureResponseTime: async (fn: () => Promise<any>) => {
		const start = Date.now();
		await fn();
		return Date.now() - start;
	},

	// Generate test load
	generateLoad: async (handler: any, concurrentUsers: number) => {
		const requests = [];
		for (let i = 0; i < concurrentUsers; i++) {
			requests.push(
				handler({
					email: `user${i}@example.com`,
					password: `Password${i}!`,
				}),
			);
		}
		return Promise.all(requests);
	},
};

// JWT test helpers
export const jwtTestHelpers = {
	// Create expired JWT
	createExpiredToken: (_secret: string) => {
		const payload = {
			sub: 'test-user',
			exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
		};
		// In real implementation, use actual JWT library
		return Buffer.from(JSON.stringify(payload)).toString('base64');
	},

	// Create invalid JWT
	createInvalidToken: () => {
		return 'invalid.token.here';
	},

	// Create JWT with future expiration
	createFutureToken: (_secret: string) => {
		const payload = {
			sub: 'test-user',
			exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
		};
		// In real implementation, use actual JWT library
		return Buffer.from(JSON.stringify(payload)).toString('base64');
	},
};

// Export all test utilities
export const testUtils = {
	createTestAuth,
	createTestUser,
	createTestSession,
	mockOAuthResponse,
	mockEmailService,
	createTestRequest,
	createTestResponse,
	authTestScenarios,
	simulateRateLimit,
	securityTestHelpers,
	performanceTestHelpers,
	jwtTestHelpers,
};
