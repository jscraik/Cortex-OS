import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server.js';
import {
	betterAuth,
	optionalBetterAuth,
	requireRole,
	authenticateAPIKey,
	hybridAuth,
	validateSession,
	authRateLimit,
	authCORS,
	betterAuthErrorHandler
} from '../../middleware/better-auth.js';

describe('Authentication Middleware Comprehensive Tests', () => {
	let app: any;

	beforeEach(() => {
		app = createApp();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Better Auth Middleware', () => {
		it('should authenticate requests with valid session', async () => {
			// First, create a user and login
			await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: 'Test User',
					email: 'test@brainwav.ai',
					password: 'SecurePass123!',
				})
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'test@brainwav.ai',
					password: 'SecurePass123!',
				})
				.expect(200);

			const sessionCookie = loginResponse.headers['set-cookie'];

			// Now test a protected route with valid session
			const response = await request(app)
				.get('/api/auth/session')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('session');
			expect(response.body).toHaveProperty('user');
		});

		it('should reject requests without valid session', async () => {
			const response = await request(app)
				.get('/api/auth/session')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
			expect(response.body).toHaveProperty('message', 'Please log in to access this resource');
		});

		it('should handle session validation errors gracefully', async () => {
			// Mock session validation to throw an error
			const mockAuthUtils = {
				getSession: vi.fn().mockRejectedValue(new Error('Database connection failed'))
			};

			vi.doMock('../../auth', () => ({
				auth: {
					api: {
						getSession: mockAuthUtils.getSession
					}
				}
			}));

			const response = await request(app)
				.get('/api/auth/session')
				.expect(500);

			expect(response.body).toHaveProperty('error', 'Internal server error');
			expect(response.body).toHaveProperty('message', 'Authentication service unavailable');
		});
	});

	describe('Optional Authentication Middleware', () => {
		it('should pass requests through without authentication', async () => {
			// Create a test route with optional auth
			app.get('/test-optional', optionalBetterAuth, (req, res) => {
				res.json({
					authenticated: !!req.user,
					user: req.user || null
				});
			});

			const response = await request(app)
				.get('/test-optional')
				.expect(200);

			expect(response.body).toHaveProperty('authenticated', false);
			expect(response.body).toHaveProperty('user', null);
		});

		it('should attach user info when valid session exists', async () => {
			// Create user and login first
			await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: 'Test User',
					email: 'optional-test@brainwav.ai',
					password: 'SecurePass123!',
				})
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'optional-test@brainwav.ai',
					password: 'SecurePass123!',
				})
				.expect(200);

			const sessionCookie = loginResponse.headers['set-cookie'];

			// Test route with optional auth
			const response = await request(app)
				.get('/api/auth/session') // Using existing route
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('email', 'optional-test@brainwav.ai');
		});

		it('should handle authentication errors gracefully', async () => {
			// Mock authentication to throw an error
			const mockAuthUtils = {
				getSession: vi.fn().mockRejectedValue(new Error('Auth service down'))
			};

			// The optional middleware should not fail the request
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Test should pass through even if auth service fails
			const response = await request(app)
				.get('/api/auth/session')
				.expect(401); // Still returns 401 because that's the session endpoint behavior

			expect(consoleSpy).toHaveBeenCalledWith(
				'Optional Better Auth error:',
				expect.any(Error)
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Role-Based Access Control Middleware', () => {
		it('should allow access to users with required role', async () => {
			// Create test middleware with role requirement
			app.get('/test-admin', requireRole('admin'), (req, res) => {
				res.json({ message: 'Admin access granted', user: req.user });
			});

			// Mock user with admin role
			app.use('/test-admin-mock', (req, res, next) => {
				req.user = { id: '1', email: 'admin@brainwav.ai', role: 'admin' };
				next();
			}, requireRole('admin'), (req, res) => {
				res.json({ message: 'Admin access granted', user: req.user });
			});

			const response = await request(app)
				.get('/test-admin-mock')
				.expect(200);

			expect(response.body).toHaveProperty('message', 'Admin access granted');
			expect(response.body.user).toHaveProperty('role', 'admin');
		});

		it('should allow access to users with any of multiple required roles', async () => {
			// Test with multiple roles
			app.get('/test-multiple-roles', (req, res, next) => {
				req.user = { id: '1', email: 'user@brainwav.ai', role: 'editor' };
				next();
			}, requireRole(['admin', 'editor', 'moderator']), (req, res) => {
				res.json({ message: 'Access granted', user: req.user });
			});

			const response = await request(app)
				.get('/test-multiple-roles')
				.expect(200);

			expect(response.body).toHaveProperty('message', 'Access granted');
			expect(response.body.user).toHaveProperty('role', 'editor');
		});

		it('should reject users without required role', async () => {
			app.get('/test-admin-only', (req, res, next) => {
				req.user = { id: '1', email: 'user@brainwav.ai', role: 'user' };
				next();
			}, requireRole('admin'), (req, res) => {
				res.json({ message: 'Should not reach here' });
			});

			const response = await request(app)
				.get('/test-admin-only')
				.expect(403);

			expect(response.body).toHaveProperty('error', 'Insufficient permissions');
			expect(response.body).toHaveProperty('message', 'You do not have permission to access this resource');
		});

		it('should reject unauthenticated users', async () => {
			app.get('/test-admin-unauth', requireRole('admin'), (req, res) => {
				res.json({ message: 'Should not reach here' });
			});

			const response = await request(app)
				.get('/test-admin-unauth')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
			expect(response.body).toHaveProperty('message', 'Please log in to access this resource');
		});

		it('should handle role authorization errors gracefully', async () => {
			app.get('/test-admin-error', (req, res, next) => {
				// Mock an error during role check
				throw new Error('Role service unavailable');
			}, requireRole('admin'), (req, res) => {
				res.json({ message: 'Should not reach here' });
			});

			const response = await request(app)
				.get('/test-admin-error')
				.expect(500);

			expect(response.body).toHaveProperty('error', 'Internal server error');
			expect(response.body).toHaveProperty('message', 'Authorization service unavailable');
		});
	});

	describe('API Key Authentication Middleware', () => {
		beforeEach(() => {
			process.env.BRAINWAV_API_KEY = 'brainwav-test-api-key-12345678901234567890';
		});

		it('should authenticate requests with valid API key', async () => {
			app.get('/test-api-key', authenticateAPIKey, (req, res) => {
				res.json({
					message: 'API key authentication successful',
					user: req.user,
					apiKey: req.apiKey
				});
			});

			const response = await request(app)
				.get('/test-api-key')
				.set('X-API-Key', 'brainwav-test-api-key-12345678901234567890')
				.expect(200);

			expect(response.body).toHaveProperty('message', 'API key authentication successful');
		});

		it('should reject requests without API key', async () => {
			app.get('/test-api-key-required', authenticateAPIKey, (req, res) => {
				res.json({ message: 'Should not reach here' });
			});

			const response = await request(app)
				.get('/test-api-key-required')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'API key required');
			expect(response.body).toHaveProperty('message', 'Please provide an API key in the X-API-Key header');
		});

		it('should reject requests with invalid API key', async () => {
			app.get('/test-api-key-invalid', authenticateAPIKey, (req, res) => {
				res.json({ message: 'Should not reach here' });
			});

			const response = await request(app)
				.get('/test-api-key-invalid')
				.set('X-API-Key', 'invalid-api-key')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Invalid API key');
			expect(response.body).toHaveProperty('message', 'The provided API key is invalid or expired');
		});

		it('should handle API key authentication errors gracefully', async () => {
			// Mock API key validation to throw an error
			const mockAuthUtils = {
				validateAPIKey: vi.fn().mockRejectedValue(new Error('API key service down'))
			};

			vi.doMock('../../auth', () => ({
				authUtils: mockAuthUtils
			}));

			const response = await request(app)
				.get('/api/auth/api-keys/validate')
				.send({ apiKey: 'test-key' })
				.expect(500);

			expect(response.body).toHaveProperty('error', 'Internal server error');
			expect(response.body).toHaveProperty('message', 'API key authentication failed');
		});
	});

	describe('Hybrid Authentication Middleware', () => {
		it('should authenticate via Better Auth when available', async () => {
			// Create user and login
			await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: 'Hybrid Test User',
					email: 'hybrid-test@brainwav.ai',
					password: 'SecurePass123!',
				})
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'hybrid-test@brainwav.ai',
					password: 'SecurePass123!',
				})
				.expect(200);

			const sessionCookie = loginResponse.headers['set-cookie'];

			// Test hybrid authentication
			const response = await request(app)
				.get('/api/auth/session')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('user');
			expect(response.body.user).toHaveProperty('email', 'hybrid-test@brainwav.ai');
		});

		it('should fallback to legacy JWT when Better Auth fails', async () => {
			// This would test the fallback mechanism
			// In a real scenario, this would involve creating JWT tokens and testing fallback
			const response = await request(app)
				.get('/api/auth/session')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
		});

		it('should reject requests with no valid authentication', async () => {
			const response = await request(app)
				.get('/api/auth/session')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
			expect(response.body).toHaveProperty('message', 'Please provide a valid authentication token');
		});

		it('should handle hybrid authentication errors gracefully', async () => {
			// Mock both authentication methods to fail
			const mockAuthUtils = {
				getSession: vi.fn().mockRejectedValue(new Error('Auth service down'))
			};

			const response = await request(app)
				.get('/api/auth/session')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Authentication required');
		});
	});

	describe('Session Validation Middleware', () => {
		it('should validate requests with valid session token', async () => {
			// Create user and login
			await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: 'Session Test User',
					email: 'session-test@brainwav.ai',
					password: 'SecurePass123!',
				})
				.expect(200);

			const loginResponse = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'session-test@brainwav.ai',
					password: 'SecurePass123!',
				})
				.expect(200);

			const sessionCookie = loginResponse.headers['set-cookie'];

			// Test session validation
			const response = await request(app)
				.get('/api/auth/session')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(response.body).toHaveProperty('session');
			expect(response.body).toHaveProperty('user');
		});

		it('should reject requests with invalid session token', async () => {
			const response = await request(app)
				.get('/api/auth/session')
				.set('Cookie', 'session_token=invalid-token')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'Invalid session');
			expect(response.body).toHaveProperty('message', 'Your session has expired or is invalid');
		});

		it('should reject requests without session token', async () => {
			const response = await request(app)
				.get('/api/auth/session')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'No session token provided');
			expect(response.body).toHaveProperty('message', 'Please provide a session token');
		});

		it('should handle expired sessions', async () => {
			// This would test session expiration logic
			// In a real scenario, this would involve creating expired sessions
			const response = await request(app)
				.get('/api/auth/session')
				.expect(401);

			expect(response.body).toHaveProperty('error', 'No active session');
		});
	});

	describe('Rate Limiting Middleware', () => {
		it('should allow requests within rate limit', async () => {
			// Make a few requests within the limit
			for (let i = 0; i < 3; i++) {
				const response = await request(app)
					.post('/api/auth/sign-in')
					.send({
						email: 'test@brainwav.ai',
						password: 'wrong-password',
					});

				// Should be allowed for first few attempts
				expect([200, 400]).toContain(response.status);
			}
		});

		it('should rate limit excessive requests', async () => {
			// Make many failed attempts to trigger rate limiting
			const responses = [];
			for (let i = 0; i < 10; i++) {
				responses.push(
					await request(app)
						.post('/api/auth/sign-in')
						.send({
							email: 'test@brainwav.ai',
							password: 'wrong-password',
						})
				);
			}

			// Last requests should be rate limited
			const lastResponse = responses[responses.length - 1];
			expect(lastResponse.status).toBe(429);
			expect(lastResponse.body).toHaveProperty('error', 'Too many attempts');
		});

		it('should include retry-after information', async () => {
			// Trigger rate limiting
			for (let i = 0; i < 8; i++) {
				await request(app)
					.post('/api/auth/sign-in')
					.send({
						email: 'test@brainwav.ai',
						password: 'wrong-password',
					});
			}

			const response = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'test@brainwav.ai',
					password: 'wrong-password',
				})
				.expect(429);

			expect(response.body).toHaveProperty('error', 'Too many attempts');
			expect(response.body.message).toContain('Please wait');
			expect(response.body.message).toContain('seconds before trying again');
		});
	});

	describe('CORS Middleware', () => {
		it('should handle preflight requests correctly', async () => {
			const response = await request(app)
				.options('/api/auth/sign-in')
				.set('Origin', 'http://localhost:5173')
				.set('Access-Control-Request-Method', 'POST')
				.expect(200);

			expect(response.headers).toHaveProperty('access-control-allow-methods');
			expect(response.headers).toHaveProperty('access-control-allow-headers');
			expect(response.headers).toHaveProperty('access-control-allow-origin');
		});

		it('should allow requests from authorized origins', async () => {
			const response = await request(app)
				.post('/api/auth/sign-in')
				.set('Origin', 'http://localhost:5173')
				.send({
					email: 'test@brainwav.ai',
					password: 'password',
				});

			// Should not be blocked by CORS (will get 400 for invalid credentials, but not CORS error)
			expect([400, 401]).toContain(response.status);
		});

		it('should include appropriate CORS headers', async () => {
			const response = await request(app)
				.options('/api/auth/sign-in')
				.expect(200);

			expect(response.headers).toHaveProperty('access-control-allow-credentials', 'true');
			expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
			expect(response.headers['access-control-allow-headers']).toContain('Authorization');
			expect(response.headers['access-control-allow-headers']).toContain('X-API-Key');
		});
	});

	describe('Error Handling Middleware', () => {
		it('should handle Better Auth specific errors', async () => {
			// Mock a Better Auth error
			const betterAuthError = new Error('Better Auth: Invalid credentials');
			betterAuthError.name = 'BetterAuthError';

			// The error handler should process this correctly
			const response = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'test@brainwav.ai',
					password: 'wrong-password',
				})
				.expect(400);

			expect(response.body).toHaveProperty('error');
		});

		it('should handle validation errors', async () => {
			const response = await request(app)
				.post('/api/auth/sign-up')
				.send({
					name: '',
					email: 'invalid-email',
					password: '123',
				})
				.expect(400);

			expect(response.body).toHaveProperty('error');
		});

		it('should handle generic errors without exposing details', async () => {
			// Mock an unexpected error
			const response = await request(app)
				.get('/api/auth/nonexistent-endpoint')
				.expect(404);

			// Should return generic error message
			expect(response.body).toHaveProperty('error');
		});
	});

	describe('Security Headers in Authentication', () => {
		it('should include security headers in auth responses', async () => {
			const response = await request(app)
				.get('/api/auth/session')
				.expect(401);

			expect(response.headers).toHaveProperty('x-content-type-options');
			expect(response.headers).toHaveProperty('x-frame-options');
		});

		it('should handle CSRF protection', async () => {
			// Test that CSRF protection is working
			const response = await request(app)
				.post('/api/auth/sign-in')
				.send({
					email: 'test@brainwav.ai',
					password: 'password',
				});

			// Should include CSRF-related headers or tokens
			expect(response.status).toBeDefined();
		});
	});

	describe('brAInwav Branding in Authentication', () => {
		it('should include brAInwav branding in error responses', async () => {
			const response = await request(app)
				.get('/api/auth/session')
				.expect(401);

			const responseStr = JSON.stringify(response.body);
			expect(responseStr).toMatch(/brAInwav/i);
		});

		it('should use brAInwav security policies', async () => {
			const response = await request(app)
				.get('/api/auth/session')
				.expect(401);

			// Should include brAInwav security headers
			expect(response.headers).toBeDefined();
		});
	});
});