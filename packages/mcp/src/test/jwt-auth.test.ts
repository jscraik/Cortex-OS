import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JWTAuth } from '../auth/jwt-auth.js';
import { HTTPException } from '../errors.js';

// Mock environment variables
process.env.MCP_JWT_SECRET = 'test-mcp-secret';
process.env.BETTER_AUTH_SECRET = 'test-better-auth-secret';

describe('JWT Authentication', () => {
	let jwtAuth: JWTAuth;

	beforeEach(() => {
		jwtAuth = new JWTAuth({
			secret: 'test-secret',
			issuer: 'test-issuer',
			audience: 'test-audience',
			expiresIn: '1h',
		});
	});

	describe('Token Creation', () => {
		it('should create a valid JWT token', () => {
			const payload = {
				userId: 'test-user-123',
				sessionId: 'session-456',
				roles: ['user'],
				permissions: ['read:data'],
			};

			const token = jwtAuth.createToken(payload);

			expect(token).toBeTypeOf('string');
			expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
		});

		it('should create token with custom expiration', () => {
			const payload = { userId: 'test-user', sessionId: 'session-123' };
			const token = jwtAuth.createToken(payload, { expiresIn: '2h' });

			expect(token).toBeTypeOf('string');
		});

		it('should fallback to static token when JWT unavailable', () => {
			// Mock JWT unavailability
			const mockJwtAuth = new JWTAuth({ secret: 'test' });
			(mockJwtAuth as any).jwtAvailable = false;

			const payload = { userId: 'test-user', sessionId: 'session-123' };
			const token = mockJwtAuth.createToken(payload);

			expect(token).toMatch(/^static-test-user-/);
		});
	});

	describe('Token Validation', () => {
		it('should validate a valid token', async () => {
			const payload = {
				userId: 'test-user-123',
				sessionId: 'session-456',
				roles: ['user'],
			};

			const token = jwtAuth.createToken(payload);
			const validated = await jwtAuth.validateToken(token);

			expect(validated.userId).toBe(payload.userId);
			expect(validated.sessionId).toBe(payload.sessionId);
			expect(validated.roles).toEqual(payload.roles);
			expect(validated.iat).toBeDefined();
			expect(validated.exp).toBeDefined();
		});

		it('should reject invalid token', async () => {
			await expect(jwtAuth.validateToken('invalid-token')).rejects.toThrow(HTTPException);
		});

		it('should reject expired token', async () => {
			const payload = { userId: 'test-user', sessionId: 'session-123' };
			const token = jwtAuth.createToken(payload, { expiresIn: '-1s' });

			await expect(jwtAuth.validateToken(token)).rejects.toThrow('Token expired');
		});

		it('should reject token with wrong secret', async () => {
			const wrongAuth = new JWTAuth({ secret: 'wrong-secret' });
			const token = jwtAuth.createToken({ userId: 'test-user', sessionId: 'session-123' });

			await expect(wrongAuth.validateToken(token)).rejects.toThrow('Invalid token');
		});

		it('should validate static token when JWT unavailable', async () => {
			const mockJwtAuth = new JWTAuth({ secret: 'test' });
			(mockJwtAuth as any).jwtAvailable = false;

			const token = mockJwtAuth.createToken({ userId: 'test-user', sessionId: 'session-123' });
			const validated = await mockJwtAuth.validateToken(token);

			expect(validated.userId).toBe('test-user');
		});
	});

	describe('Token Refresh', () => {
		it('should refresh an expired token', async () => {
			const payload = {
				userId: 'test-user',
				sessionId: 'session-123',
				roles: ['user'],
				permissions: ['read:data'],
			};

			const refreshToken = jwtAuth.createToken(payload, { expiresIn: '7d' });
			const tokens = await jwtAuth.refreshToken(refreshToken);

			expect(tokens).toHaveProperty('accessToken');
			expect(tokens).toHaveProperty('refreshToken');
			expect(tokens.accessToken).not.toBe(refreshToken);
			expect(tokens.refreshToken).not.toBe(refreshToken);
		});
	});

	describe('Role and Permission Checking', () => {
		let token: string;
		let payload: any;

		beforeEach(async () => {
			payload = {
				userId: 'test-user',
				sessionId: 'session-123',
				roles: ['user', 'editor'],
				permissions: ['read:data', 'write:data'],
			};

			token = jwtAuth.createToken(payload);
			payload = await jwtAuth.validateToken(token);
		});

		it('should correctly check user roles', () => {
			expect(jwtAuth.hasRole(payload, 'user')).toBe(true);
			expect(jwtAuth.hasRole(payload, 'editor')).toBe(true);
			expect(jwtAuth.hasRole(payload, 'admin')).toBe(false);
		});

		it('should correctly check user permissions', () => {
			expect(jwtAuth.hasPermission(payload, 'read:data')).toBe(true);
			expect(jwtAuth.hasPermission(payload, 'write:data')).toBe(true);
			expect(jwtAuth.hasPermission(payload, 'delete:data')).toBe(false);
		});
	});

	describe('Header Extraction', () => {
		it('should extract token from Bearer header', () => {
			const token = jwtAuth.extractTokenFromHeader('Bearer test-token');
			expect(token).toBe('test-token');
		});

		it('should return null for invalid header', () => {
			const token = jwtAuth.extractTokenFromHeader('Invalid test-token');
			expect(token).toBeNull();
		});

		it('should return null for missing header', () => {
			const token = jwtAuth.extractTokenFromHeader(undefined);
			expect(token).toBeNull();
		});
	});

	describe('Middleware', () => {
		it('should create authentication middleware', () => {
			const middleware = jwtAuth.middleware();
			expect(middleware).toBeTypeOf('function');
		});

		it('should create role-based middleware', () => {
			const middleware = jwtAuth.requireRole('admin');
			expect(middleware).toBeTypeOf('function');
		});

		it('should create permission-based middleware', () => {
			const middleware = jwtAuth.requirePermission('delete:data');
			expect(middleware).toBeTypeOf('function');
		});
	});

	describe('Environment Configuration', () => {
		it('should create JWTAuth from environment', () => {
			const auth = createJWTAuth();

			expect(auth).toBeInstanceOf(JWTAuth);
			// Should use environment variables
			expect((auth as any).config.secret).toBe('test-mcp-secret');
		});

		it('should fallback to Better Auth secret', () => {
			delete process.env.MCP_JWT_SECRET;
			const auth = createJWTAuth();

			expect((auth as any).config.secret).toBe('test-better-auth-secret');

			// Restore
			process.env.MCP_JWT_SECRET = 'test-mcp-secret';
		});
	});

	describe('Error Handling', () => {
		it('should handle malformed JWT', async () => {
			const malformedToken = 'header.invalid.signature';

			await expect(jwtAuth.validateToken(malformedToken)).rejects.toThrow(HTTPException);
		});

		it('should handle token with invalid algorithm', async () => {
			// Create token with different algorithm
			const wrongAuth = new JWTAuth({ secret: 'test', algorithm: 'HS512' });
			const token = wrongAuth.createToken({ userId: 'test', sessionId: 'test' });

			await expect(jwtAuth.validateToken(token)).rejects.toThrow(HTTPException);
		});
	});
});
