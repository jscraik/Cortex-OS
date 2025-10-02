// API Key Authentication Tests for Cortex WebUI backend
// TDD implementation for secure API key validation

import type { Request, Response, NextFunction } from 'express';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { apiKeyAuth } from '../src/middleware/security.js';
import { getSecurityConfig, validateApiKeyFormat } from '../src/config/security.js';

// Mock environment variables
const originalEnv = process.env;

describe('API Key Authentication Tests', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		// Reset environment
		process.env = {
			...originalEnv,
			BRAINWAV_API_KEY: 'brainwav-test-api-key-32-chars-long-12345',
			ENABLE_API_KEY_AUTH: 'true'
		};

		mockReq = {
			headers: {},
			ip: '127.0.0.1'
		};

		mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn()
		};

		mockNext = vi.fn();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('API Key Validation', () => {
		it('should validate correct brAInwav API key format', () => {
			const validKey = 'brainwav-test-api-key-32-chars-long-12345';
			expect(validateApiKeyFormat(validKey)).toBe(true);
		});

		it('should reject API key without brAInwav prefix', () => {
			const invalidKey = 'test-api-key-32-chars-long-12345';
			expect(validateApiKeyFormat(invalidKey)).toBe(false);
		});

		it('should reject API key that is too short', () => {
			const shortKey = 'brainwav-short';
			expect(validateApiKeyFormat(shortKey)).toBe(false);
		});

		it('should reject API key that does not match configured key', () => {
			const wrongKey = 'brainwav-wrong-key-32-chars-long-67890';
			expect(validateApiKeyFormat(wrongKey)).toBe(false);
		});

		it('should handle empty or null API key', () => {
			expect(validateApiKeyFormat('')).toBe(false);
			expect(validateApiKeyFormat(null as any)).toBe(false);
			expect(validateApiKeyFormat(undefined as any)).toBe(false);
		});
	});

	describe('API Key Authentication Middleware', () => {
		it('should allow requests with valid brAInwav API key', async () => {
			mockReq.headers = {
				'x-api-key': 'brainwav-test-api-key-32-chars-long-12345'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockRes.status).not.toHaveBeenCalled();
			expect(mockReq.securityContext?.apiKeyValid).toBe(true);
		});

		it('should reject requests without API key', async () => {
			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: API key required',
				brand: 'brAInwav'
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject requests with invalid API key format', async () => {
			mockReq.headers = {
				'x-api-key': 'invalid-key-format'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Invalid API key format',
				brand: 'brAInwav'
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject requests with wrong API key', async () => {
			mockReq.headers = {
				'x-api-key': 'brainwav-wrong-key-32-chars-long-67890'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Invalid API key format',
				brand: 'brAInwav'
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should handle case-insensitive header name', async () => {
			mockReq.headers = {
				'X-API-Key': 'brainwav-test-api-key-32-chars-long-12345'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it('should skip authentication when disabled', async () => {
			process.env.ENABLE_API_KEY_AUTH = 'false';

			mockReq.headers = {}; // No API key

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockRes.status).not.toHaveBeenCalled();
		});
	});

	describe('Security Context Integration', () => {
		it('should set security context flag for valid API keys', async () => {
			mockReq.headers = {
				'x-api-key': 'brainwav-test-api-key-32-chars-long-12345'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.securityContext).toBeDefined();
			expect(mockReq.securityContext?.apiKeyValid).toBe(true);
		});

		it('should preserve existing security context', async () => {
			mockReq.securityContext = {
				inputSanitized: true,
				csrfToken: 'existing-token'
			};

			mockReq.headers = {
				'x-api-key': 'brainwav-test-api-key-32-chars-long-12345'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.securityContext?.inputSanitized).toBe(true);
			expect(mockReq.securityContext?.csrfToken).toBe('existing-token');
			expect(mockReq.securityContext?.apiKeyValid).toBe(true);
		});
	});

	describe('Configuration Edge Cases', () => {
		it('should handle missing API key in environment', async () => {
			delete process.env.BRAINWAV_API_KEY;

			mockReq.headers = {
				'x-api-key': 'some-key'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: 'brAInwav Security Error: Invalid API key format',
				brand: 'brAInwav'
			});
		});

		it('should handle malformed API key in environment', async () => {
			process.env.BRAINWAV_API_KEY = 'short-key';

			mockReq.headers = {
				'x-api-key': 'brainwav-test-api-key-32-chars-long-12345'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
		});
	});

	describe('Header Security', () => {
		it('should handle API key with extra whitespace', async () => {
			mockReq.headers = {
				'x-api-key': '  brainwav-test-api-key-32-chars-long-12345  '
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			// Should fail because whitespace makes it invalid
			expect(mockRes.status).toHaveBeenCalledWith(401);
		});

		it('should handle API key with newline characters', async () => {
			mockReq.headers = {
				'x-api-key': 'brainwav-test-api-key-32-chars-long-12345\n'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			// Should fail because newline makes it invalid
			expect(mockRes.status).toHaveBeenCalledWith(401);
		});
	});

	describe('BrAInwav Branding', () => {
		it('should include brAInwav branding in all error messages', async () => {
			const testCases = [
				{ headers: {}, expectedError: 'API key required' },
				{ headers: { 'x-api-key': 'invalid' }, expectedError: 'Invalid API key format' }
			];

			for (const testCase of testCases) {
				mockReq.headers = testCase.headers;
				mockNext.mockClear();
				mockRes.status.mockClear();
				mockRes.json.mockClear();

				await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

				expect(mockRes.json).toHaveBeenCalledWith({
					error: `brAInwav Security Error: ${testCase.expectedError}`,
					brand: 'brAInwav'
				});
			}
		});
	});

	describe('Performance and Reliability', () => {
		it('should handle rapid successive requests', async () => {
			mockReq.headers = {
				'x-api-key': 'brainwav-test-api-key-32-chars-long-12345'
			};

			const promises = Array.from({ length: 100 }, () =>
				apiKeyAuth(mockReq as Request, mockRes as Response, mockNext)
			);

			await Promise.all(promises);

			expect(mockNext).toHaveBeenCalledTimes(100);
		});

		it('should handle malformed headers gracefully', async () => {
			mockReq.headers = {
				'x-api-key': Buffer.from('invalid-buffer').toString(),
				'content-type': null as any
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
		});
	});

	describe('Integration with Other Security Middleware', () => {
		it('should work after input sanitization middleware', async () => {
			// Simulate input sanitization has already run
			mockReq.securityContext = {
				inputSanitized: true
			};

			mockReq.headers = {
				'x-api-key': 'brainwav-test-api-key-32-chars-long-12345'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockReq.securityContext?.inputSanitized).toBe(true);
			expect(mockReq.securityContext?.apiKeyValid).toBe(true);
		});

		it('should not interfere with CSRF protection', async () => {
			mockReq.securityContext = {
				csrfToken: 'valid-csrf-token'
			};

			mockReq.headers = {
				'x-api-key': 'brainwav-test-api-key-32-chars-long-12345'
			};

			await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockReq.securityContext?.csrfToken).toBe('valid-csrf-token');
		});
	});
});