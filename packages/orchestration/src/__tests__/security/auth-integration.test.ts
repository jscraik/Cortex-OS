/**
 * nO Master Agent Loop - Authentication Integration Tests
 *
 * Comprehensive TDD tests for OAuth 2.0/JWT authentication,
 * RBAC authorization, and security middleware integration.
 *
 * Co-authored-by: brAInwav Development Team
 */

import express, { type Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	type AuthMiddleware,
	type AuthMiddlewareConfig,
	createAuthMiddleware,
} from '../../security/auth-middleware.js';
import { createEncryptionService } from '../../security/encryption.js';
import { type OAuthConfig, OAuthProvider } from '../../security/oauth-provider.js';

describe('Authentication Integration', () => {
	let app: Express;
	let authMiddleware: AuthMiddleware;
	let oauthProvider: OAuthProvider;

	const mockOAuthConfig: OAuthConfig = {
		issuer: 'https://auth.brainwav.ai',
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
		redirectUri: 'http://localhost:3000/auth/callback',
		scope: ['openid', 'profile', 'email'],
		tokenEndpoint: 'https://auth.brainwav.ai/oauth/token',
		authorizationEndpoint: 'https://auth.brainwav.ai/oauth/authorize',
		userInfoEndpoint: 'https://auth.brainwav.ai/userinfo',
	};

	const mockJWTSecret = 'test-jwt-secret-key-for-testing-purposes';

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));

		oauthProvider = new OAuthProvider(mockOAuthConfig, mockJWTSecret);

		const authConfig: AuthMiddlewareConfig = {
			oauthProvider,
			skipPaths: ['/health', '/auth/login', '/auth/callback'],
			enforceHttps: false, // Disabled for testing
			rateLimiting: {
				enabled: true,
				maxRequests: 5,
				windowMs: 60000,
			},
		};

		authMiddleware = createAuthMiddleware(authConfig);

		// Setup test routes
		app.get('/health', (_req, res) => {
			res.json({ status: 'healthy' });
		});

		app.get('/auth/login', authMiddleware.handleLogin());
		app.post('/auth/callback', authMiddleware.handleOAuthCallback());
		app.post('/auth/logout', authMiddleware.authenticate(), authMiddleware.handleLogout());
		app.get('/auth/userinfo', authMiddleware.authenticate(), authMiddleware.handleUserInfo());

		app.get('/protected', authMiddleware.authenticate(), (_req, res) => {
			res.json({ message: 'Protected resource accessed' });
		});

		app.get(
			'/admin',
			authMiddleware.authenticate(),
			authMiddleware.authorize('admin', 'read'),
			(_req, res) => {
				res.json({ message: 'Admin resource accessed' });
			},
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Authentication Flow', () => {
		it('should allow access to public endpoints without authentication', async () => {
			const response = await request(app).get('/health').expect(200);

			expect(response.body).toEqual({ status: 'healthy' });
		});

		it('should block access to protected endpoints without token', async () => {
			const response = await request(app).get('/protected').expect(401);

			expect(response.body).toMatchObject({
				error: 'Missing token',
				message: 'Authentication token is required',
			});
		});

		it('should generate authorization URL for login', async () => {
			const response = await request(app).get('/auth/login').expect(200);

			expect(response.body).toMatchObject({
				authUrl: expect.stringContaining('https://auth.brainwav.ai/oauth/authorize'),
				state: expect.any(String),
				nonce: expect.any(String),
			});

			expect(response.body.authUrl).toContain('client_id=test-client-id');
			expect(response.body.authUrl).toContain('response_type=code');
		});

		it('should handle OAuth callback with valid code', async () => {
			// Mock successful token exchange
			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							access_token: 'mock-access-token',
							refresh_token: 'mock-refresh-token',
						}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							sub: 'user123',
							email: 'test@brainwav.ai',
							name: 'Test User',
							groups: ['users'],
							roles: ['user'],
						}),
				});

			global.fetch = mockFetch;

			const response = await request(app)
				.post('/auth/callback')
				.send({ code: 'auth-code', state: 'test-state' })
				.expect(302); // Redirect

			expect(response.headers.location).toBe('/');
			expect(response.headers['set-cookie']).toBeDefined();
		});

		it('should handle OAuth callback errors', async () => {
			const response = await request(app)
				.post('/auth/callback')
				.send({ error: 'access_denied' })
				.expect(400);

			expect(response.body).toMatchObject({
				error: 'OAuth error',
				message: 'access_denied',
			});
		});

		it('should validate JWT tokens correctly', async () => {
			// Generate a valid token
			const mockUser = {
				sub: 'user123',
				email: 'test@brainwav.ai',
				name: 'Test User',
				groups: ['users'],
				roles: ['user'],
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
				iss: mockOAuthConfig.issuer,
				aud: mockOAuthConfig.clientId,
			};

			const _token = await oauthProvider.validateToken(
				// Simulate an internal token generation
				JSON.stringify(mockUser),
			);

			// Mock the token validation to return success
			vi.spyOn(oauthProvider, 'validateToken').mockResolvedValue({
				success: true,
				user: mockUser,
				token: 'valid-jwt-token',
			});

			const response = await request(app)
				.get('/protected')
				.set('Authorization', 'Bearer valid-jwt-token')
				.expect(200);

			expect(response.body).toEqual({
				message: 'Protected resource accessed',
			});
		});

		it('should reject invalid JWT tokens', async () => {
			vi.spyOn(oauthProvider, 'validateToken').mockResolvedValue({
				success: false,
				error: 'Invalid token',
				errorCode: 'INVALID_TOKEN',
			});

			const response = await request(app)
				.get('/protected')
				.set('Authorization', 'Bearer invalid-token')
				.expect(401);

			expect(response.body).toMatchObject({
				error: 'Invalid token',
				message: 'Invalid token',
			});
		});
	});

	describe('Rate Limiting', () => {
		it('should enforce rate limits', async () => {
			const promises: Promise<any>[] = [];

			// Make requests up to the limit
			for (let i = 0; i < 5; i++) {
				promises.push(
					request(app)
						.get('/protected')
						.expect(401), // Will fail auth, but rate limit should allow
				);
			}

			await Promise.all(promises);

			// The 6th request should be rate limited
			const response = await request(app).get('/protected').expect(429);

			expect(response.body).toMatchObject({
				error: 'Rate limit exceeded',
				retryAfter: expect.any(Number),
			});
		});

		it('should reset rate limit after window expires', async () => {
			// Mock time to advance quickly
			const originalNow = Date.now;
			let mockTime = Date.now();

			vi.spyOn(Date, 'now').mockImplementation(() => mockTime);

			// Exhaust rate limit
			for (let i = 0; i < 5; i++) {
				await request(app).get('/protected').expect(401);
			}

			// Should be rate limited
			await request(app).get('/protected').expect(429);

			// Advance time past window
			mockTime += 61000; // 61 seconds

			// Should work again
			await request(app).get('/protected').expect(401); // Auth error, not rate limit

			Date.now = originalNow;
		});
	});

	describe('Authorization', () => {
		it('should enforce RBAC authorization', async () => {
			// Mock user without admin role
			const mockUser = {
				sub: 'user123',
				email: 'test@brainwav.ai',
				roles: ['user'], // No admin role
				groups: ['users'],
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
				iss: mockOAuthConfig.issuer,
				aud: mockOAuthConfig.clientId,
			};

			vi.spyOn(oauthProvider, 'validateToken').mockResolvedValue({
				success: true,
				user: mockUser,
				token: 'valid-token',
			});

			const response = await request(app)
				.get('/admin')
				.set('Authorization', 'Bearer valid-token')
				.expect(403);

			expect(response.body).toMatchObject({
				error: 'Forbidden',
				message: expect.any(String),
			});
		});

		it('should allow access with proper authorization', async () => {
			// Mock user with admin role
			const mockUser = {
				sub: 'admin123',
				email: 'admin@brainwav.ai',
				roles: ['admin'],
				groups: ['admins'],
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
				iss: mockOAuthConfig.issuer,
				aud: mockOAuthConfig.clientId,
			};

			vi.spyOn(oauthProvider, 'validateToken').mockResolvedValue({
				success: true,
				user: mockUser,
				token: 'admin-token',
			});

			// Mock RBAC system to allow admin access
			const { rbacSystem } = await import('../../security/rbac-system');
			vi.spyOn(rbacSystem, 'authorize').mockResolvedValue({
				allowed: true,
			});

			const response = await request(app)
				.get('/admin')
				.set('Authorization', 'Bearer admin-token')
				.expect(200);

			expect(response.body).toEqual({
				message: 'Admin resource accessed',
			});
		});
	});

	describe('User Info Endpoint', () => {
		it('should return user information for authenticated requests', async () => {
			const mockUser = {
				sub: 'user123',
				email: 'test@brainwav.ai',
				name: 'Test User',
				roles: ['user'],
				groups: ['users'],
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
				iss: mockOAuthConfig.issuer,
				aud: mockOAuthConfig.clientId,
			};

			vi.spyOn(oauthProvider, 'validateToken').mockResolvedValue({
				success: true,
				user: mockUser,
				token: 'valid-token',
			});

			// Mock RBAC system
			const { rbacSystem } = await import('../../security/rbac-system');
			vi.spyOn(rbacSystem, 'getUserEffectivePermissions').mockReturnValue([
				{
					id: 'read-profile',
					name: 'Read Profile',
					resource: 'profile',
					action: 'read',
					conditions: {},
				},
			]);

			const response = await request(app)
				.get('/auth/userinfo')
				.set('Authorization', 'Bearer valid-token')
				.expect(200);

			expect(response.body).toMatchObject({
				user: {
					sub: 'user123',
					email: 'test@brainwav.ai',
					name: 'Test User',
					roles: ['user'],
					groups: ['users'],
				},
				permissions: [
					{
						id: 'read-profile',
						name: 'Read Profile',
						resource: 'profile',
						action: 'read',
					},
				],
			});
		});
	});

	describe('Logout', () => {
		it('should handle logout successfully', async () => {
			const mockUser = {
				sub: 'user123',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
				iss: mockOAuthConfig.issuer,
				aud: mockOAuthConfig.clientId,
			};

			vi.spyOn(oauthProvider, 'validateToken').mockResolvedValue({
				success: true,
				user: mockUser,
				token: 'valid-token',
				refreshToken: 'refresh-token',
			});

			vi.spyOn(oauthProvider, 'logout').mockResolvedValue(true);

			const response = await request(app)
				.post('/auth/logout')
				.set('Authorization', 'Bearer valid-token')
				.expect(200);

			expect(response.body).toEqual({
				message: 'Logged out successfully',
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle authentication middleware errors', async () => {
			// Mock OAuth provider to throw error
			vi.spyOn(oauthProvider, 'validateToken').mockRejectedValue(new Error('OAuth provider error'));

			const response = await request(app)
				.get('/protected')
				.set('Authorization', 'Bearer some-token')
				.expect(500);

			expect(response.body).toMatchObject({
				error: 'Authentication error',
				message: 'Internal authentication error',
			});
		});

		it('should handle authorization middleware errors', async () => {
			const mockUser = {
				sub: 'user123',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
				iss: mockOAuthConfig.issuer,
				aud: mockOAuthConfig.clientId,
			};

			vi.spyOn(oauthProvider, 'validateToken').mockResolvedValue({
				success: true,
				user: mockUser,
				token: 'valid-token',
			});

			// Mock RBAC system to throw error
			const { rbacSystem } = await import('../../security/rbac-system');
			vi.spyOn(rbacSystem, 'authorize').mockRejectedValue(new Error('RBAC system error'));

			const response = await request(app)
				.get('/admin')
				.set('Authorization', 'Bearer valid-token')
				.expect(500);

			expect(response.body).toMatchObject({
				error: 'Authorization error',
				message: 'Internal authorization error',
			});
		});
	});
});

describe('OAuth Provider', () => {
	let oauthProvider: OAuthProvider;
	const mockJWTSecret = 'test-jwt-secret-key-for-testing-purposes';

	const mockOAuthConfig: OAuthConfig = {
		issuer: 'https://auth.brainwav.ai',
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
		redirectUri: 'http://localhost:3000/auth/callback',
		scope: ['openid', 'profile', 'email'],
		tokenEndpoint: 'https://auth.brainwav.ai/oauth/token',
		authorizationEndpoint: 'https://auth.brainwav.ai/oauth/authorize',
		userInfoEndpoint: 'https://auth.brainwav.ai/userinfo',
	};

	beforeEach(() => {
		oauthProvider = new OAuthProvider(mockOAuthConfig, mockJWTSecret);
	});

	it('should generate proper authorization URLs', () => {
		const authUrl = oauthProvider.getAuthorizationUrl('test-state', 'test-nonce');

		expect(authUrl).toContain('https://auth.brainwav.ai/oauth/authorize');
		expect(authUrl).toContain('response_type=code');
		expect(authUrl).toContain('client_id=test-client-id');
		expect(authUrl).toContain('state=test-state');
		expect(authUrl).toContain('nonce=test-nonce');
		expect(authUrl).toContain('scope=openid+profile+email');
	});

	it('should handle token exchange errors', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			text: () => Promise.resolve('Token exchange failed'),
		});

		global.fetch = mockFetch;

		const result = await oauthProvider.exchangeCodeForTokens('invalid-code');

		expect(result.success).toBe(false);
		expect(result.error).toContain('Token exchange failed');
		expect(result.errorCode).toBe('TOKEN_EXCHANGE_FAILED');
	});
});

describe('Security Integration with Encryption', () => {
	it('should integrate with encryption service for secure data handling', async () => {
		const encryptionService = createEncryptionService('test-encryption-key');

		const sensitiveData = {
			userId: 'user123',
			apiKey: 'secret-api-key',
			password: 'user-password',
		};

		// Encrypt sensitive fields
		const encrypted = await encryptionService.encryptFields(sensitiveData, ['apiKey', 'password']);

		expect(encrypted.userId).toBe('user123'); // Not encrypted
		expect(encrypted.apiKey).toMatchObject({
			data: expect.any(String),
			iv: expect.any(String),
			algorithm: expect.any(String),
		});
		expect(encrypted.password).toMatchObject({
			data: expect.any(String),
			iv: expect.any(String),
			algorithm: expect.any(String),
		});

		// Decrypt for verification
		const decrypted = await encryptionService.decryptFields(encrypted, ['apiKey', 'password']);

		expect(decrypted).toEqual(sensitiveData);
	});
});
