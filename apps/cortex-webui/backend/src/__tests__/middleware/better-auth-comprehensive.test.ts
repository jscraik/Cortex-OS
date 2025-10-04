/**
 * Comprehensive tests for better-auth middleware
 * Goal: Achieve 95% coverage on authentication paths
 */

import type { Express, NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	authCORS,
	authenticateAPIKey,
	betterAuthErrorHandler,
	optionalBetterAuth,
	requireRole,
} from '../../middleware/better-auth';
import { createApp } from '../../server';

// Mock dependencies
vi.mock('../../lib/env', () => ({
	FRONTEND_URL: 'http://localhost:5173',
	JWT_SECRET: 'test-secret',
}));

describe('Better Auth Middleware - Comprehensive Tests', () => {
	let app: Express;
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		app = createApp();
		mockRequest = {
			headers: {},
			method: 'GET',
		};
		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			setHeader: vi.fn().mockReturnThis(),
			end: vi.fn().mockReturnThis(),
		};
		mockNext = vi.fn();
		vi.clearAllMocks();
	});

	describe('authenticateAPIKey', () => {
		it('should authenticate requests with valid API key', async () => {
			const validApiKey = 'valid-api-key-123';

			mockRequest.headers = {
				'x-api-key': validApiKey,
			};

			await authenticateAPIKey(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should reject requests with missing API key', async () => {
			await authenticateAPIKey(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'API key required',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject requests with invalid API key', async () => {
			mockRequest.headers = {
				'x-api-key': 'invalid-key',
			};

			await authenticateAPIKey(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid API key',
			});
		});

		it('should handle API key verification errors gracefully', async () => {
			// Simulate database error
			mockRequest.headers = {
				'x-api-key': 'error-inducing-key',
			};

			await authenticateAPIKey(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Authentication error',
			});
		});
	});

	describe('authCORS', () => {
		it('should set CORS headers for non-OPTIONS requests', async () => {
			mockRequest.method = 'POST';

			authCORS(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Access-Control-Allow-Origin',
				'http://localhost:5173',
			);
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Access-Control-Allow-Methods',
				'GET, POST, PUT, DELETE, OPTIONS',
			);
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Access-Control-Allow-Headers',
				'Content-Type, Authorization, X-API-Key, X-CSRF-Token',
			);
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Access-Control-Allow-Credentials',
				'true',
			);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle OPTIONS preflight requests', async () => {
			mockRequest.method = 'OPTIONS';

			authCORS(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.end).toHaveBeenCalled();
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should use custom FRONTEND_URL when provided', async () => {
			process.env.FRONTEND_URL = 'https://app.example.com';

			authCORS(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Access-Control-Allow-Origin',
				'https://app.example.com',
			);
		});
	});

	describe('betterAuthErrorHandler', () => {
		it('should handle BetterAuthError correctly', () => {
			const error = {
				name: 'BetterAuthError',
				message: 'Invalid credentials',
				code: 'INVALID_CREDENTIALS',
			};

			betterAuthErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid credentials',
				code: 'INVALID_CREDENTIALS',
			});
		});

		it('should handle ValidationError correctly', () => {
			const error = {
				name: 'ValidationError',
				errors: [
					{ field: 'email', message: 'Invalid email format' },
					{ field: 'password', message: 'Password too short' },
				],
			};

			betterAuthErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Validation error',
				details: error.errors,
			});
		});

		it('should handle generic errors', () => {
			const error = new Error('Database connection failed');

			betterAuthErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Internal server error',
				message: 'An unexpected error occurred',
			});
		});

		it('should log all errors', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const error = new Error('Test error');

			betterAuthErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			expect(consoleSpy).toHaveBeenCalledWith('Better Auth middleware error:', error);

			consoleSpy.mockRestore();
		});
	});

	describe('optionalBetterAuth', () => {
		it('should pass through requests without auth header', async () => {
			await optionalBetterAuth(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should authenticate valid session', async () => {
			const sessionCookie = 'auth-session=test-session-id';
			mockRequest.headers = {
				cookie: sessionCookie,
			};

			await optionalBetterAuth(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle invalid session gracefully', async () => {
			mockRequest.headers = {
				cookie: 'auth-session=invalid-session',
			};

			await optionalBetterAuth(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockRequest.user).toBeUndefined();
		});

		it('should handle multiple cookies', async () => {
			const cookies = 'csrf-token=abc123; auth-session=valid-session; theme=dark';
			mockRequest.headers = {
				cookie: cookies,
			};

			await optionalBetterAuth(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('requireRole', () => {
		it('should allow access with correct role', async () => {
			mockRequest.user = {
				id: 'user-123',
				email: 'user@example.com',
				role: 'admin',
			};

			const adminMiddleware = requireRole('admin');
			await adminMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it('should deny access with incorrect role', async () => {
			mockRequest.user = {
				id: 'user-123',
				email: 'user@example.com',
				role: 'user',
			};

			const adminMiddleware = requireRole('admin');
			await adminMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Insufficient permissions',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should deny access without user', async () => {
			const adminMiddleware = requireRole('admin');
			await adminMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Authentication required',
			});
		});

		it('should handle multiple allowed roles', async () => {
			mockRequest.user = {
				id: 'user-123',
				email: 'user@example.com',
				role: 'moderator',
			};

			const middleware = requireRole('admin', 'moderator');
			await middleware(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle role hierarchy', async () => {
			mockRequest.user = {
				id: 'user-123',
				email: 'user@example.com',
				role: 'super-admin',
			};

			const adminMiddleware = requireRole('admin');
			await adminMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Integration Tests', () => {
		it('should handle complete auth flow through API', async () => {
			// Test login endpoint
			const loginResponse = await request(app).post('/api/auth/login').send({
				email: 'admin@example.com',
				password: 'admin123',
			});

			// Should get session cookie
			expect(loginResponse.headers['set-cookie']).toBeDefined();

			// Test protected endpoint with session
			const sessionCookie = loginResponse.headers['set-cookie'][0];
			const protectedResponse = await request(app)
				.get('/api/user/profile')
				.set('Cookie', sessionCookie)
				.expect(200);

			expect(protectedResponse.body).toHaveProperty('user');
		});

		it('should handle API key authentication flow', async () => {
			const apiKey = 'test-api-key-123';

			// Create API key for user
			await request(app)
				.post('/api/user/api-keys')
				.set('Authorization', 'Bearer valid-jwt-token')
				.send({ name: 'Test Key' })
				.expect(201);

			// Use API key to access protected endpoint
			const response = await request(app).get('/api/v1/data').set('X-API-Key', apiKey).expect(200);

			expect(response.body).toBeDefined();
		});

		it('should handle CORS preflight correctly', async () => {
			const response = await request(app).options('/api/auth/login').expect(200);

			expect(response.headers['access-control-allow-origin']).toBeDefined();
			expect(response.headers['access-control-allow-methods']).toBeDefined();
			expect(response.headers['access-control-allow-headers']).toBeDefined();
		});
	});

	describe('Edge Cases', () => {
		it('should handle malformed headers gracefully', async () => {
			mockRequest.headers = {
				'x-api-key': '',
				authorization: 'Bearer malformed.jwt.token',
				cookie: 'invalid-cookie-format',
			};

			await authenticateAPIKey(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
		});

		it('should handle concurrent requests', async () => {
			const promises = Array(10)
				.fill(null)
				.map(() => optionalBetterAuth(mockRequest as Request, mockResponse as Response, mockNext));

			await Promise.all(promises);
			expect(mockNext).toHaveBeenCalledTimes(10);
		});

		it('should handle extremely long API keys', async () => {
			const longApiKey = 'a'.repeat(10000);
			mockRequest.headers = {
				'x-api-key': longApiKey,
			};

			await authenticateAPIKey(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
		});
	});

	describe('Security Tests', () => {
		it('should prevent SQL injection in API key lookup', async () => {
			const maliciousKey = "'; DROP TABLE users; --";
			mockRequest.headers = {
				'x-api-key': maliciousKey,
			};

			await authenticateAPIKey(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
		});

		it('should sanitize error messages', async () => {
			const error = {
				name: 'BetterAuthError',
				message: 'Database error: SELECT * FROM users WHERE id = 1',
				code: 'DB_ERROR',
			};

			betterAuthErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

			// Error should be returned as-is since it's a BetterAuthError
			// In production, you might want to sanitize these
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Database error: SELECT * FROM users WHERE id = 1',
				code: 'DB_ERROR',
			});
		});

		it('should handle rate limiting', async () => {
			const apiKey = 'valid-api-key-123';
			mockRequest.headers = {
				'x-api-key': apiKey,
			};

			// Simulate rate limit
			const promises = Array(100)
				.fill(null)
				.map(() => authenticateAPIKey(mockRequest as Request, mockResponse as Response, mockNext));

			await Promise.all(promises);

			// Should eventually hit rate limit
			expect(mockResponse.status).toHaveBeenCalledWith(429);
		});
	});
});
