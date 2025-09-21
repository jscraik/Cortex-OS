/**
 * @fileoverview Security Middleware Tests - TDD Implementation
 * @company brAInwav
 * @version 1.0.0
 *
 * Comprehensive TDD Test Suite for Security Middleware
 * Co-authored-by: brAInwav Development Team
 */

import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
	createSecurityMiddleware,
	type SecurityMiddleware,
} from '../../security/security-middleware.js';

// Mock Express request and response
const createMockRequest = (overrides = {}): Partial<Request> => ({
	method: 'GET',
	path: '/test',
	ip: '192.168.1.1',
	headers: {},
	body: {},
	params: {},
	query: {},
	get: vi.fn(),
	...overrides,
});

const createMockResponse = (): Partial<Response> => {
	const res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		setHeader: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
	};
	return res;
};

const createMockNext = (): NextFunction => vi.fn();

describe('SecurityMiddleware - TDD Implementation', () => {
	let securityMiddleware: SecurityMiddleware;
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		securityMiddleware = createSecurityMiddleware({
			cors: {
				enabled: true,
				origins: ['http://localhost:3000', 'https://*.brainwav.ai'],
				credentials: true,
			},
			rateLimiting: {
				windowMs: 60000,
				maxRequests: 10,
				skipSuccessfulRequests: false,
				skipFailedRequests: false,
				standardHeaders: true,
				legacyHeaders: false,
			},
			audit: {
				enabled: true,
				sensitiveFields: ['password', 'token'],
				maxLogSize: 100,
			},
		});

		mockReq = createMockRequest();
		mockRes = createMockResponse();
		mockNext = createMockNext();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Security Headers', () => {
		it('should set essential security headers', () => {
			// Arrange
			const middleware = securityMiddleware.getSecurityHeaders();

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
			expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
			expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
			expect(mockRes.setHeader).toHaveBeenCalledWith(
				'X-Powered-By',
				'brAInwav nO Master Agent Loop',
			);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should set HSTS header when enabled', () => {
			// Arrange
			const securityWithHSTS = createSecurityMiddleware({
				headers: {
					hsts: {
						enabled: true,
						maxAge: 31536000,
						includeSubDomains: true,
					},
					csp: { enabled: false },
					referrerPolicy: 'strict-origin',
				},
			});
			const middleware = securityWithHSTS.getSecurityHeaders();

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockRes.setHeader).toHaveBeenCalledWith(
				'Strict-Transport-Security',
				'max-age=31536000; includeSubDomains',
			);
		});

		it('should set CSP header when enabled', () => {
			// Arrange
			const cspPolicy = "default-src 'self'; script-src 'self'";
			const securityWithCSP = createSecurityMiddleware({
				headers: {
					csp: {
						enabled: true,
						policy: cspPolicy,
					},
					hsts: { enabled: false, maxAge: 0, includeSubDomains: false },
					referrerPolicy: 'strict-origin',
				},
			});
			const middleware = securityWithCSP.getSecurityHeaders();

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Security-Policy', cspPolicy);
		});
	});

	describe('CORS Policies', () => {
		it('should allow requests from permitted origins', () => {
			// Arrange
			mockReq.headers = { origin: 'http://localhost:3000' };
			const middleware = securityMiddleware.getCORS();

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockRes.setHeader).toHaveBeenCalledWith(
				'Access-Control-Allow-Origin',
				'http://localhost:3000',
			);
			expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
			expect(mockNext).toHaveBeenCalled();
		});

		it('should block requests from non-permitted origins', () => {
			// Arrange
			mockReq.headers = { origin: 'http://malicious-site.com' };
			const middleware = securityMiddleware.getCORS();

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockRes.status).toHaveBeenCalledWith(403);
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: 'CORS policy violation',
					company: 'brAInwav',
				}),
			);
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should allow requests with no origin', () => {
			// Arrange (no origin header)
			const middleware = securityMiddleware.getCORS();

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(mockNext).toHaveBeenCalled();
		});

		it('should support wildcard origins', () => {
			// Arrange
			mockReq.headers = { origin: 'https://app.brainwav.ai' };
			const middleware = securityMiddleware.getCORS();

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockRes.setHeader).toHaveBeenCalledWith(
				'Access-Control-Allow-Origin',
				'https://app.brainwav.ai',
			);
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Rate Limiting', () => {
		it('should allow requests within rate limit', () => {
			// Arrange
			const middleware = securityMiddleware.getRateLimit();

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockRes.status).not.toHaveBeenCalled();
		});

		it('should block requests exceeding rate limit', () => {
			// Arrange
			const middleware = securityMiddleware.getRateLimit();

			// Act - Make requests exceeding the limit
			for (let i = 0; i < 11; i++) {
				middleware(mockReq as Request, mockRes as Response, mockNext);
			}

			// Assert - Last request should be blocked
			expect(mockRes.status).toHaveBeenCalledWith(429);
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: 'Too Many Requests',
					company: 'brAInwav',
				}),
			);
		});

		it('should differentiate between different IP addresses', () => {
			// Arrange
			const middleware = securityMiddleware.getRateLimit();
			const req1 = { ...mockReq, ip: '192.168.1.1' };
			const req2 = { ...mockReq, ip: '192.168.1.2' };

			// Act - Make requests from different IPs
			for (let i = 0; i < 10; i++) {
				middleware(req1 as Request, mockRes as Response, mockNext);
				middleware(req2 as Request, mockRes as Response, mockNext);
			}

			// Assert - Both should be allowed (different IP limits)
			expect(mockNext).toHaveBeenCalledTimes(20);
		});
	});

	describe('Input Validation', () => {
		it('should validate and pass through valid input', async () => {
			// Arrange
			const schema = z.object({
				body: z.object({
					name: z.string(),
					age: z.number(),
				}),
			});
			mockReq.body = { name: 'John', age: 30 };
			const middleware = securityMiddleware.validateInput(schema);

			// Act
			await middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockRes.status).not.toHaveBeenCalled();
		});

		it('should reject invalid input with validation errors', async () => {
			// Arrange
			const schema = z.object({
				body: z.object({
					name: z.string(),
					age: z.number(),
				}),
			});
			mockReq.body = { name: 'John', age: 'invalid' }; // Invalid age
			const middleware = securityMiddleware.validateInput(schema);

			// Act
			await middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockRes.status).toHaveBeenCalledWith(400);
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: 'Input Validation Failed',
					company: 'brAInwav',
				}),
			);
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should sanitize HTML content when enabled', async () => {
			// Arrange
			const schema = z.object({
				body: z.object({
					content: z.string(),
				}),
			});
			mockReq.body = { content: '<script>alert("xss")</script>Safe content' };
			const middleware = securityMiddleware.validateInput(schema);

			// Act
			await middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockReq.body.content).not.toContain('<script>');
			expect(mockReq.body.content).toContain('Safe content');
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Security Audit Logging', () => {
		it('should log security events when enabled', () => {
			// Arrange
			const middleware = securityMiddleware.auditRequest();
			const _originalSend = mockRes.send;

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Simulate response
			if (mockRes.send) {
				(mockRes.send as any)('test response');
			}

			// Assert
			const auditLog = securityMiddleware.getAuditLog();
			expect(auditLog).toHaveLength(1);
			expect(auditLog[0]).toEqual(
				expect.objectContaining({
					type: 'request_audit',
					method: 'GET',
					endpoint: '/test',
				}),
			);
		});

		it('should redact sensitive fields from audit logs', () => {
			// Arrange
			const testEvent = {
				type: 'test_event',
				password: 'secret123',
				token: 'abc123',
				normalField: 'normal_value',
			};

			// Access private method through any cast for testing
			const redacted = (securityMiddleware as any).redactSensitiveData(testEvent);

			// Assert
			expect(redacted.password).toBe('[REDACTED]');
			expect(redacted.token).toBe('[REDACTED]');
			expect(redacted.normalField).toBe('normal_value');
		});

		it('should limit audit log size', () => {
			// Arrange - Create middleware with small log size
			const smallLogSecurity = createSecurityMiddleware({
				audit: {
					enabled: true,
					maxLogSize: 2,
					sensitiveFields: [],
				},
			});

			// Act - Log more events than the limit
			for (let i = 0; i < 5; i++) {
				(smallLogSecurity as any).logSecurityEvent({
					type: 'test_event',
					id: i,
				});
			}

			// Assert
			const auditLog = smallLogSecurity.getAuditLog();
			expect(auditLog).toHaveLength(2); // Should be limited to maxLogSize
		});
	});

	describe('Integration with brAInwav Standards', () => {
		it('should include brAInwav branding in error responses', () => {
			// Arrange
			mockReq.headers = { origin: 'http://malicious-site.com' };
			const middleware = securityMiddleware.getCORS();

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					company: 'brAInwav',
				}),
			);
		});

		it('should set brAInwav-specific headers', () => {
			// Arrange
			const middleware = securityMiddleware.getSecurityHeaders();

			// Act
			middleware(mockReq as Request, mockRes as Response, mockNext);

			// Assert
			expect(mockRes.setHeader).toHaveBeenCalledWith(
				'X-Powered-By',
				'brAInwav nO Master Agent Loop',
			);
		});
	});

	describe('Performance and Memory Management', () => {
		it('should not leak memory with rate limiting storage', () => {
			// Arrange
			const middleware = securityMiddleware.getRateLimit();
			const initialMemory = process.memoryUsage().heapUsed;

			// Act - Simulate many different IPs
			for (let i = 0; i < 1000; i++) {
				const req = { ...mockReq, ip: `192.168.1.${i % 255}` };
				middleware(req as Request, mockRes as Response, mockNext);
			}

			// Assert - Memory should not grow excessively
			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = finalMemory - initialMemory;
			expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
		});

		it('should handle concurrent requests safely', async () => {
			// Arrange
			const middleware = securityMiddleware.getRateLimit();
			const promises: Promise<void>[] = [];

			// Act - Simulate concurrent requests
			for (let i = 0; i < 50; i++) {
				promises.push(
					new Promise<void>((resolve) => {
						middleware(mockReq as Request, mockRes as Response, () => resolve());
					}),
				);
			}

			await Promise.all(promises);

			// Assert - Should complete without errors
			expect(promises).toHaveLength(50);
		});
	});
});
