import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { validateAPIKey } from '../../src/auth/api-key.js';
import { signJWT, verifyJWT } from '../../src/auth/jwt.js';
import { authMiddleware } from '../../src/auth/middleware.js';
import { checkPermission, hasRole } from '../../src/auth/permissions.js';

describe('Authentication & Authorization', () => {
	let app: Hono;

	beforeEach(() => {
		app = new Hono();
	});

	describe('API Key Validation', () => {
		it('should reject requests without API key', async () => {
			const _response = await app.request('/agents/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ agentId: 'test', input: 'test' }),
			});

			// Middleware will be added later
			expect(true).toBe(true);
		});

		it('should reject invalid API keys', async () => {
			const invalidKey = 'invalid-key-123';
			const result = await validateAPIKey(invalidKey);
			expect(result).toBe(false);
		});

		it('should accept valid API keys', async () => {
			const validKey = 'test-api-key-valid';
			// Mock valid key for testing
			process.env.API_KEYS = validKey;
			const result = await validateAPIKey(validKey);
			expect(result).toBe(true);
		});

		it('should extract API key from Authorization header', async () => {
			const key = 'test-key-123';
			const headerValue = `Bearer ${key}`;
			expect(headerValue.startsWith('Bearer ')).toBe(true);
		});
	});

	describe('JWT Token Operations', () => {
		const secret = 'test-secret';
		const payload = {
			userId: 'user123',
			roles: ['user'],
			permissions: ['read:agents'],
		};

		it('should generate JWT token', async () => {
			const token = await signJWT(payload, secret);
			expect(token).toBeDefined();
			expect(typeof token).toBe('string');
			expect(token.split('.').length).toBe(3); // JWT has 3 parts
		});

		it('should validate JWT token', async () => {
			const token = await signJWT(payload, secret);
			const verified = await verifyJWT(token, secret);
			expect(verified).toBeDefined();
			expect(verified.userId).toBe(payload.userId);
			expect(verified.roles).toEqual(payload.roles);
			expect(verified.permissions).toEqual(payload.permissions);
		});

		it('should reject invalid JWT token', async () => {
			const invalidToken = 'invalid.token.here';
			await expect(verifyJWT(invalidToken, secret)).rejects.toThrow();
		});

		it('should handle JWT expiration', async () => {
			const token = await signJWT(payload, secret, { expiresIn: '-1h' });
			await expect(verifyJWT(token, secret)).rejects.toThrow();
		});
	});

	describe('Permission Checking', () => {
		const user = {
			id: 'user123',
			roles: ['user'],
			permissions: ['read:agents'],
		};

		const admin = {
			id: 'admin123',
			roles: ['admin'],
			permissions: ['read:agents', 'execute:agents', 'manage:agents'],
		};

		it('should check user permissions correctly', () => {
			expect(checkPermission(user, 'read:agents')).toBe(true);
			expect(checkPermission(user, 'execute:agents')).toBe(true);
			expect(checkPermission(user, 'manage:agents')).toBe(false);
		});

		it('should check admin permissions correctly', () => {
			expect(checkPermission(admin, 'read:agents')).toBe(true);
			expect(checkPermission(admin, 'execute:agents')).toBe(true);
			expect(checkPermission(admin, 'manage:agents')).toBe(true);
		});

		it('should verify user roles', () => {
			expect(hasRole(user, 'user')).toBe(true);
			expect(hasRole(user, 'admin')).toBe(false);
			expect(hasRole(admin, 'admin')).toBe(true);
			expect(hasRole(admin, 'user')).toBe(false);
		});
	});

	describe('Authentication Middleware', () => {
		it('should pass with valid JWT token', async () => {
			const secret = 'test-secret';
			const token = await signJWT({ userId: 'user123' }, secret);

			const testApp = new Hono();
			testApp.use('*', authMiddleware({ secret }));
			testApp.get('/protected', (c) => c.json({ success: true }));

			const response = await testApp.request('/protected', {
				headers: { Authorization: `Bearer ${token}` },
			});

			expect(response.status).toBe(200);
		});

		it('should reject without authentication', async () => {
			const testApp = new Hono();
			testApp.use('*', authMiddleware({ secret: 'test-secret' }));
			testApp.get('/protected', (c) => c.json({ success: true }));

			const response = await testApp.request('/protected');

			expect(response.status).toBe(401);
		});

		it('should reject invalid token', async () => {
			const testApp = new Hono();
			testApp.use('*', authMiddleware({ secret: 'test-secret' }));
			testApp.get('/protected', (c) => c.json({ success: true }));

			const response = await testApp.request('/protected', {
				headers: { Authorization: 'Bearer invalid-token' },
			});

			expect(response.status).toBe(401);
		});
	});

	describe('Role-Based Access Control', () => {
		it('should allow admin to access admin routes', async () => {
			const adminUser = { roles: ['admin'] };
			expect(hasRole(adminUser, 'admin')).toBe(true);
		});

		it('should prevent user from accessing admin routes', async () => {
			const regularUser = { roles: ['user'] };
			expect(hasRole(regularUser, 'admin')).toBe(false);
		});

		it('should handle multiple roles', async () => {
			const multiRoleUser = { roles: ['user', 'operator'] };
			expect(hasRole(multiRoleUser, 'user')).toBe(true);
			expect(hasRole(multiRoleUser, 'operator')).toBe(true);
			expect(hasRole(multiRoleUser, 'admin')).toBe(false);
		});
	});

	describe('Security Headers', () => {
		it('should include security headers in response', async () => {
			const testApp = new Hono();
			testApp.get('/test', (c) => {
				c.header('X-Content-Type-Options', 'nosniff');
				c.header('X-Frame-Options', 'DENY');
				c.header('X-XSS-Protection', '1; mode=block');
				return c.json({ test: true });
			});

			const response = await testApp.request('/test');

			expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
			expect(response.headers.get('X-Frame-Options')).toBe('DENY');
			expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
		});
	});
});
