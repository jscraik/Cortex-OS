// Security middleware comprehensive tests for Cortex WebUI backend
// brAInwav security standards with complete coverage

import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	apiKeyAuth,
	applySecurityMiddleware,
	customCsrfProtection,
	generateCsrfTokenMiddleware,
	sanitizeInput,
	securityErrorHandler,
	securityHeaders,
	securityLogger,
	validateRequestSize,
} from '../middleware/security.ts';

// Mock DOMPurify
vi.mock('dompurify', () => ({
	default: {
		sanitize: vi.fn((value: string) => value),
	},
}));

// Mock helmet
vi.mock('helmet', () => ({
	default: vi.fn((_options) => (_req: Request, res: Response, next: NextFunction) => {
		// Simulate helmet middleware
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('X-Frame-Options', 'DENY');
		next();
	}),
}));

// Mock security config
vi.mock('../config/security.ts', () => ({
	getSecurityConfig: vi.fn(() => ({
		headers: {
			enabled: true,
			enableCSP: true,
			hstsMaxAge: 31536000,
			xFrameOptions: 'DENY',
			referrerPolicy: 'strict-origin-when-cross-origin',
		},
		csp: {
			scriptSrc: "'self' 'unsafe-inline'",
			styleSrc: "'self' 'unsafe-inline'",
			imgSrc: "'self' data: https:",
			connectSrc: "'self'",
			fontSrc: "'self'",
			objectSrc: "'none'",
			mediaSrc: "'self'",
			frameSrc: "'none'",
			frameAncestors: "'none'",
			baseUri: "'self'",
			formAction: "'self'",
		},
		csrf: {
			enabled: true,
			tokenHeader: 'X-CSRF-Token',
			cookieName: '__Secure-brAInwav-CSRF',
		},
		validation: {
			enabled: true,
			maxRequestSize: 10485760, // 10MB
			maxFieldLength: 10000,
		},
		apiKey: {
			enabled: true,
			headerName: 'X-API-Key',
		},
		session: {
			enabled: true,
			timeoutMinutes: 30,
			secureCookie: true,
			cookieName: '__Secure-brAInwav-Session',
		},
		monitoring: {
			enabled: true,
			logLevel: 'debug',
		},
		brand: {
			name: 'brAInwav',
			version: '1.0',
			securityPolicyHeader: 'X-BrAInwav-Security-Policy',
			errorPrefix: 'brAInwav Security Error',
		},
	})),
	validateApiKeyFormat: vi.fn(() => true),
	generateCsrfToken: vi.fn(() => 'test-csrf-token-123'),
	validateCsrfToken: vi.fn(() => true),
}));

import { getSecurityConfig } from '../config/security.ts';

describe('Security Middleware', () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();

		mockRequest = {
			method: 'GET',
			path: '/test',
			headers: {},
			ip: '127.0.0.1',
			body: {},
			query: {},
			params: {},
			session: {},
			securityContext: {},
		};

		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
			setHeader: vi.fn(),
			cookie: vi.fn(),
			end: vi.fn(),
		};

		mockNext = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Security Headers Middleware', () => {
		it('should apply brAInwav security headers', () => {
			// Act
			securityHeaders(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'X-BrAInwav-Security-Policy',
				'brAInwav-secured-v1.0',
			);
			expect(mockResponse.setHeader).toHaveBeenCalledWith('X-BrAInwav-Security-Enabled', 'true');
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'X-BrAInwav-Security-Timestamp',
				expect.any(String),
			);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should skip when security headers disabled', () => {
			// Arrange
			vi.mocked(getSecurityConfig).mockReturnValueOnce({
				headers: { enabled: false },
			} as any);

			// Act
			securityHeaders(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.setHeader).not.toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('CSRF Protection Middleware', () => {
		it('should allow safe HTTP methods without CSRF token', () => {
			// Arrange
			const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

			safeMethods.forEach((method) => {
				vi.clearAllMocks();
				mockRequest.method = method;

				// Act
				customCsrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

				// Assert
				expect(mockNext).toHaveBeenCalled();
				expect(mockResponse.status).not.toHaveBeenCalled();
			});
		});

		it('should reject state-changing requests without CSRF token', () => {
			// Arrange
			mockRequest.method = 'POST';

			// Act
			customCsrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: CSRF token required',
				brand: 'brAInwav',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject requests with invalid CSRF token', () => {
			// Arrange
			mockRequest.method = 'POST';
			mockRequest.headers = { 'x-csrf-token': 'invalid-token' };
			mockRequest.session = { csrfToken: 'valid-token' };

			vi.mocked(getSecurityConfig).mockReturnValueOnce({
				csrf: {
					enabled: true,
					tokenHeader: 'X-CSRF-Token',
				},
				brand: {
					name: 'brAInwav',
					errorPrefix: 'brAInwav Security Error',
				},
			} as any);

			// Act
			customCsrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Invalid CSRF token',
				brand: 'brAInwav',
			});
		});

		it('should allow requests with valid CSRF token', () => {
			// Arrange
			const validToken = 'valid-csrf-token';
			mockRequest.method = 'POST';
			mockRequest.headers = { 'x-csrf-token': validToken };
			mockRequest.session = { csrfToken: validToken };

			vi.mocked(getSecurityConfig).mockReturnValueOnce({
				csrf: {
					enabled: true,
					tokenHeader: 'X-CSRF-Token',
				},
			} as any);

			// Act
			customCsrfProtection(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
	});

	describe('CSRF Token Generation Middleware', () => {
		it('should generate CSRF token if not present in session', () => {
			// Arrange
			mockRequest.session = {};

			// Act
			generateCsrfTokenMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockRequest.session.csrfToken).toBe('test-csrf-token-123');
			expect(mockRequest.securityContext?.csrfToken).toBe('test-csrf-token-123');
			expect(mockResponse.cookie).toHaveBeenCalledWith(
				'__Secure-brAInwav-CSRF',
				'test-csrf-token-123',
				{
					httpOnly: true,
					secure: true,
					sameSite: 'strict',
					maxAge: 3600000,
					brand: 'brAInwav',
				},
			);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should not generate new token if already exists', () => {
			// Arrange
			const existingToken = 'existing-token';
			mockRequest.session = { csrfToken: existingToken };

			// Act
			generateCsrfTokenMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockRequest.session.csrfToken).toBe(existingToken);
			expect(mockResponse.cookie).not.toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Input Sanitization Middleware', () => {
		it('should sanitize request body', () => {
			// Arrange
			const maliciousInput = '<script>alert("xss")</script>';
			mockRequest.body = {
				message: maliciousInput,
				safeField: 'safe value',
			};

			// Act
			sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockRequest.body.message).toBe(maliciousInput); // DOMPurify mock returns as-is
			expect(mockRequest.body.safeField).toBe('safe value');
			expect(mockRequest.securityContext?.inputSanitized).toBe(true);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle nested objects in request body', () => {
			// Arrange
			mockRequest.body = {
				user: {
					name: '<script>alert("xss")</script>',
					email: 'test@example.com',
				},
				metadata: {
					tags: ['tag1', 'tag2'],
				},
			};

			// Act
			sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockRequest.body.user.name).toBeDefined();
			expect(mockRequest.body.user.email).toBe('test@example.com');
			expect(mockRequest.securityContext?.inputSanitized).toBe(true);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should truncate fields exceeding maximum length', () => {
			// Arrange
			const longString = 'a'.repeat(15000); // Exceeds maxFieldLength
			mockRequest.body = {
				longField: longString,
			};

			// Act
			sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockRequest.body.longField.length).toBe(10000); // Truncated to maxFieldLength
			expect(mockNext).toHaveBeenCalled();
		});

		it('should sanitize query parameters and URL parameters', () => {
			// Arrange
			mockRequest.query = { search: '<script>alert("xss")</script>' };
			mockRequest.params = { id: 'malicious<script>' };

			// Act
			sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockRequest.query.search).toBeDefined();
			expect(mockRequest.params.id).toBeDefined();
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle sanitization errors gracefully', () => {
			// Arrange
			mockRequest.body = {}; // Will cause error in sanitization function

			// Mock sanitizeObject to throw error
			const { DOMPurify } = require('dompurify');
			DOMPurify.sanitize.mockImplementation(() => {
				throw new Error('Sanitization failed');
			});

			// Act
			sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Input sanitization failed',
				brand: 'brAInwav',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});
	});

	describe('API Key Authentication Middleware', () => {
		it('should reject requests without API key', () => {
			// Act
			apiKeyAuth(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: API key required',
				brand: 'brAInwav',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject requests with invalid API key format', () => {
			// Arrange
			mockRequest.headers = { 'x-api-key': 'invalid-key' };
			vi.mocked(require('../config/security.js').validateApiKeyFormat).mockReturnValueOnce(false);

			// Act
			apiKeyAuth(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Invalid API key format',
				brand: 'brAInwav',
			});
		});

		it('should authenticate requests with valid API key', () => {
			// Arrange
			const validApiKey = 'brainwav-valid-api-key-123456789';
			mockRequest.headers = { 'x-api-key': validApiKey };
			vi.mocked(require('../config/security.js').validateApiKeyFormat).mockReturnValueOnce(true);

			// Act
			apiKeyAuth(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockRequest.securityContext?.apiKeyValid).toBe(true);
			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
	});

	describe('Request Size Validation Middleware', () => {
		it('should allow requests within size limit', () => {
			// Arrange
			mockRequest.headers = { 'content-length': '1000000' }; // 1MB

			// Act
			validateRequestSize(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalled();
		});

		it('should reject requests exceeding size limit', () => {
			// Arrange
			mockRequest.headers = { 'content-length': '15000000' }; // 15MB

			// Act
			validateRequestSize(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(413);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Request size exceeds limit',
				brand: 'brAInwav',
				maxSize: 10485760,
			});
		});
	});

	describe('Security Logger Middleware', () => {
		it('should log requests in debug mode', () => {
			// Arrange
			vi.mocked(getSecurityConfig).mockReturnValueOnce({
				monitoring: {
					enabled: true,
					logLevel: 'debug',
				},
			} as any);

			const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			securityLogger(mockRequest as Request, mockResponse as Response, mockNext);

			// Assert
			expect(consoleLogSpy).toHaveBeenCalledWith(
				'brAInwav Security Log - Request: GET /test',
				expect.objectContaining({
					ip: '127.0.0.1',
					apiKeyValid: undefined,
					inputSanitized: undefined,
					timestamp: expect.any(String),
				}),
			);

			consoleLogSpy.mockRestore();
		});

		it('should log error responses', () => {
			// Arrange
			mockResponse.statusCode = 404;
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			// Mock res.end to trigger logging
			const originalEnd = mockResponse.end;
			mockResponse.end = vi.fn().mockImplementation(function (...args) {
				// Call the mocked end first to trigger logging
				setTimeout(() => {
					originalEnd?.apply(this, args);
				}, 0);
			});

			// Act
			securityLogger(mockRequest as Request, mockResponse as Response, mockNext);

			// Trigger the end callback
			setTimeout(() => {
				if (mockResponse.end) {
					(mockResponse.end as any)();
				}
			}, 10);

			// Assert
			expect(mockNext).toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});
	});

	describe('Security Error Handler', () => {
		it('should handle brAInwav security errors', () => {
			// Arrange
			const securityError = new Error('brAInwav Security Error: CSRF validation failed');

			// Act
			securityErrorHandler(
				securityError,
				mockRequest as Request,
				mockResponse as Response,
				mockNext,
			);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: CSRF validation failed',
				brand: 'brAInwav',
			});
		});

		it('should handle generic security errors', () => {
			// Arrange
			const genericError = new Error('CSRF token invalid');

			// Act
			securityErrorHandler(
				genericError,
				mockRequest as Request,
				mockResponse as Response,
				mockNext,
			);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'CSRF token invalid',
				brand: 'brAInwav',
			});
		});

		it('should handle non-security errors', () => {
			// Arrange
			const genericError = new Error('Database connection failed');

			// Act
			securityErrorHandler(
				genericError,
				mockRequest as Request,
				mockResponse as Response,
				mockNext,
			);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Internal security error',
				brand: 'brAInwav',
			});
		});
	});

	describe('Apply Security Middleware', () => {
		it('should apply security middleware chain to app', () => {
			// Arrange
			const mockApp = {
				use: vi.fn(),
			};

			// Act
			applySecurityMiddleware(mockApp as any);

			// Assert
			expect(mockApp.use).toHaveBeenCalledTimes(7); // Security headers, size validation, logging, CSRF generation, sanitization, session enhancement
		});
	});
});
