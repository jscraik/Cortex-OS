// Security middleware tests for Cortex WebUI backend
// TDD implementation for Phase 1.2 security hardening

import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import middleware to be tested
import {
	apiKeyAuth,
	customCsrfProtection,
	enhanceSessionSecurity,
	sanitizeInput,
	securityHeaders,
} from '../src/middleware/security.ts';

// Mock dependencies
vi.mock('helmet', () => ({
	default: vi.fn(() => (_req: Request, res: Response, next: NextFunction) => {
		res.setHeader('X-Frame-Options', 'DENY');
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('X-XSS-Protection', '1; mode=block');
		res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
		next();
	}),
}));

vi.mock('dompurify', () => ({
	default: {
		sanitize: vi.fn((input: string) =>
			input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
		),
	},
}));

vi.mock('crypto', () => ({
	randomUUID: vi.fn(() => 'test-csrf-token-12345'),
	createHmac: vi.fn(() => ({
		update: vi.fn().mockReturnThis(),
		digest: vi.fn(() => 'hashed-signature'),
	})),
}));

describe('Security Middleware Tests', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		mockReq = {
			headers: {},
			body: {},
			query: {},
			params: {},
			ip: '127.0.0.1',
			session: {} as { [key: string]: unknown },
		};

		mockRes = {
			setHeader: vi.fn(),
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
			cookie: vi.fn(),
		};

		mockNext = vi.fn();
	});

	describe('Security Headers Middleware', () => {
		it('should set brAInwav-branded security headers', async () => {
			await securityHeaders(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
			expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
			expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
			expect(mockRes.setHeader).toHaveBeenCalledWith(
				'Strict-Transport-Security',
				'max-age=31536000; includeSubDomains',
			);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should include brAInwav branding in security policy header', async () => {
			await securityHeaders(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.setHeader).toHaveBeenCalledWith(
				'X-BrAInwav-Security-Policy',
				'brAInwav-secured-v1.0',
			);
		});
	});

	describe('Custom CSRF Protection', () => {
		it('should reject requests without CSRF token for state-changing methods', async () => {
			mockReq.method = 'POST';
			mockReq.headers = {};

			await customCsrfProtection(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(403);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: CSRF token required',
				brand: 'brAInwav',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should allow GET requests without CSRF token', async () => {
			mockReq.method = 'GET';

			await customCsrfProtection(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it('should allow requests with valid CSRF token', async () => {
			mockReq.method = 'POST';
			mockReq.headers = {
				'x-csrf-token': 'valid-token',
			};
			mockReq.session = {
				csrfToken: 'valid-token',
			} as { csrfToken: string };

			await customCsrfProtection(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it('should reject requests with invalid CSRF token', async () => {
			mockReq.method = 'POST';
			mockReq.headers = {
				'x-csrf-token': 'invalid-token',
			};
			mockReq.session = {
				csrfToken: 'valid-token',
			} as { csrfToken: string };

			await customCsrfProtection(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(403);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Invalid CSRF token',
				brand: 'brAInwav',
			});
		});
	});

	describe('Input Sanitization', () => {
		it('should sanitize request body against XSS attacks', async () => {
			const maliciousInput = {
				name: '<script>alert("xss")</script>Test',
				description: 'Safe description',
			};
			mockReq.body = maliciousInput;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.name).toBe('Test'); // Script tag should be removed
			expect(mockReq.body.description).toBe('Safe description'); // Safe content unchanged
			expect(mockNext).toHaveBeenCalled();
		});

		it('should sanitize request query parameters', async () => {
			const maliciousQuery = {
				search: '<script>document.cookie</script>query',
				page: '1',
			};
			mockReq.query = maliciousQuery;

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.query.search).toBe('query'); // Script tag removed
			expect(mockReq.query.page).toBe('1'); // Safe content unchanged
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle null and undefined inputs gracefully', async () => {
			mockReq.body = {
				name: null,
				description: undefined,
			};

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.body.name).toBeNull();
			expect(mockReq.body.description).toBeUndefined();
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('API Key Authentication', () => {
		it('should reject requests without API key', async () => {
			mockReq.headers = {};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: API key required',
				brand: 'brAInwav',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject requests with invalid API key format', async () => {
			mockReq.headers = {
				'x-api-key': 'invalid-key',
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Invalid API key format',
				brand: 'brAInwav',
			});
		});

		it('should accept requests with valid brAInwav API key', async () => {
			process.env.BRAINWAV_API_KEY = 'brainwav-test-key-12345';
			mockReq.headers = {
				'x-api-key': 'brainwav-test-key-12345',
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Session Security Enhancement', () => {
		it('should set secure session cookie flags', async () => {
			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.cookie).toHaveBeenCalledWith('__Secure-brAInwav-Session', expect.any(String), {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
				maxAge: 30 * 60 * 1000, // 30 minutes
				brand: 'brAInwav',
			});
		});

		it('should regenerate session ID to prevent fixation', async () => {
			const regenerateMock = vi.fn();
			mockReq.session = {
				regenerate: regenerateMock,
			} as { regenerate: () => void };

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(regenerateMock).toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalled();
		});

		it('should set session timeout for security', async () => {
			const touchMock = vi.fn();
			mockReq.session = {
				touch: touchMock,
				cookie: {
					maxAge: undefined,
				},
			} as { touch: () => void; cookie: { maxAge?: number } };

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.session.cookie.maxAge).toBe(30 * 60 * 1000);
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Security Integration', () => {
		it('should work with existing authentication middleware', async () => {
			// Test that security middleware doesn't interfere with auth
			mockReq.user = {
				id: 'test-user',
				email: 'test@brainwav.ai',
				role: 'user',
			};

			await securityHeaders(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockReq.user).toBeDefined();
		});

		it('should maintain rate limiting compatibility', async () => {
			// Ensure security middleware works with existing rate limiting
			mockReq.rateLimit = {
				limit: 100,
				current: 1,
				remaining: 99,
			};

			await sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockReq.rateLimit).toBeDefined();
		});
	});
});
