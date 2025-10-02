// Session Security Tests for Cortex WebUI backend
// TDD implementation for session hardening and security

import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSecurityConfig } from '../src/config/security.js';
import { enhanceSessionSecurity, generateCsrfTokenMiddleware } from '../src/middleware/security.js';

describe('Session Security Tests', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		mockReq = {
			headers: {},
			ip: '127.0.0.1',
			session: {} as any,
		};

		mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
			cookie: vi.fn(),
		};

		mockNext = vi.fn();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Session Security Enhancement', () => {
		it('should regenerate session ID to prevent fixation', async () => {
			const regenerateMock = vi.fn((callback: Function) => callback(null));
			mockReq.session = {
				regenerate: regenerateMock,
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(regenerateMock).toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalled();
		});

		it('should set secure session cookie flags', async () => {
			mockReq.session = {
				regenerate: vi.fn((callback: Function) => callback(null)),
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			const config = getSecurityConfig();
			expect(mockRes.cookie).toHaveBeenCalledWith(config.session.cookieName, expect.any(String), {
				httpOnly: true,
				secure: config.session.secureCookie,
				sameSite: 'strict',
				maxAge: config.session.timeoutMinutes * 60 * 1000,
				brand: config.brand.name,
			});
		});

		it('should set session timeout for security', async () => {
			const touchMock = vi.fn();
			mockReq.session = {
				touch: touchMock,
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			const config = getSecurityConfig();
			expect(mockReq.session.cookie.maxAge).toBe(config.session.timeoutMinutes * 60 * 1000);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle session regeneration errors gracefully', async () => {
			const regenerateMock = vi.fn((callback: Function) => {
				callback(new Error('Session regeneration failed'));
			});
			mockReq.session = {
				regenerate: regenerateMock,
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(regenerateMock).toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalled(); // Should not block request on session errors
		});

		it('should skip session security when disabled', async () => {
			process.env.ENABLE_SESSION_HARDENING = 'false';

			mockReq.session = {} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockRes.cookie).not.toHaveBeenCalled();

			process.env.ENABLE_SESSION_HARDENING = 'true';
		});

		it('should handle missing session object gracefully', async () => {
			mockReq.session = undefined as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('CSRF Token Generation', () => {
		it('should generate CSRF token for new sessions', async () => {
			mockReq.session = {} as any;

			await generateCsrfTokenMiddleware(mockReq as Request, mockRes as Response, mockNext);

			const config = getSecurityConfig();
			expect(mockReq.session.csrfToken).toBeDefined();
			expect(typeof mockReq.session.csrfToken).toBe('string');
			expect(mockReq.securityContext?.csrfToken).toBe(mockReq.session.csrfToken);
			expect(mockRes.cookie).toHaveBeenCalledWith(
				config.csrf.cookieName,
				mockReq.session.csrfToken,
				expect.objectContaining({
					httpOnly: true,
					secure: true,
					sameSite: 'strict',
					brand: config.brand.name,
				}),
			);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should reuse existing CSRF token', async () => {
			const existingToken = 'existing-csrf-token';
			mockReq.session = { csrfToken: existingToken } as any;

			await generateCsrfTokenMiddleware(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.session.csrfToken).toBe(existingToken);
			expect(mockReq.securityContext?.csrfToken).toBe(existingToken);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should set CSRF token with proper expiration', async () => {
			mockReq.session = {} as any;

			await generateCsrfTokenMiddleware(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.cookie).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({
					maxAge: 60 * 60 * 1000, // 1 hour
				}),
			);
		});

		it('should skip CSRF token generation when disabled', async () => {
			process.env.ENABLE_CSRF_PROTECTION = 'false';

			mockReq.session = {} as any;

			await generateCsrfTokenMiddleware(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.session.csrfToken).toBeUndefined();
			expect(mockRes.cookie).not.toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalled();

			process.env.ENABLE_CSRF_PROTECTION = 'true';
		});
	});

	describe('Session Timeout Management', () => {
		it('should extend session timeout on subsequent requests', async () => {
			const touchMock = vi.fn();
			mockReq.session = {
				touch: touchMock,
				cookie: { maxAge: 300000 }, // 5 minutes
				regenerated: true,
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(touchMock).toHaveBeenCalled();
			const config = getSecurityConfig();
			expect(mockReq.session.cookie.maxAge).toBe(config.session.timeoutMinutes * 60 * 1000);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle session timeout properly', async () => {
			const config = getSecurityConfig();
			const expiredSession = {
				cookie: { maxAge: -1 }, // Expired
				touch: vi.fn(),
			} as any;

			mockReq.session = expiredSession;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(expiredSession.touch).toHaveBeenCalled();
			expect(mockReq.session.cookie.maxAge).toBe(config.session.timeoutMinutes * 60 * 1000);
		});
	});

	describe('Session Cookie Security', () => {
		it('should set appropriate cookie flags for production', async () => {
			process.env.NODE_ENV = 'production';
			mockReq.session = {
				regenerate: vi.fn((callback: Function) => callback(null)),
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.cookie).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({
					httpOnly: true, // Prevent JavaScript access
					secure: true, // Only over HTTPS
					sameSite: 'strict', // Prevent CSRF
				}),
			);

			process.env.NODE_ENV = 'test';
		});

		it('should use brAInwav-branded cookie names', async () => {
			mockReq.session = {
				regenerate: vi.fn((callback: Function) => callback(null)),
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			const config = getSecurityConfig();
			expect(mockRes.cookie).toHaveBeenCalledWith(
				config.session.cookieName,
				expect.any(String),
				expect.any(Object),
			);
			expect(config.session.cookieName).toContain('brAInwav');
		});

		it('should set secure cookies based on environment', async () => {
			process.env.SESSION_SECURE_COOKIE = 'false';
			mockReq.session = {
				regenerate: vi.fn((callback: Function) => callback(null)),
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(mockRes.cookie).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({
					secure: false,
				}),
			);

			process.env.SESSION_SECURE_COOKIE = 'true';
		});
	});

	describe('Session Security Context', () => {
		it('should preserve existing security context during session enhancement', async () => {
			mockReq.securityContext = {
				apiKeyValid: true,
				inputSanitized: true,
			};

			mockReq.session = {
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.securityContext?.apiKeyValid).toBe(true);
			expect(mockReq.securityContext?.inputSanitized).toBe(true);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle session security without existing security context', async () => {
			mockReq.session = {
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Session Regeneration Security', () => {
		it('should prevent session fixation attacks', async () => {
			const oldSessionId = 'old-session-id';
			let _regenerateCallback: Function;

			const regenerateMock = vi.fn((callback: Function) => {
				_regenerateCallback = callback;
				// Simulate async session regeneration
				setTimeout(() => callback(null), 0);
			});

			mockReq.session = {
				id: oldSessionId,
				regenerate: regenerateMock,
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			const promise = enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			// Should not have called next yet (regeneration is async)
			expect(mockNext).not.toHaveBeenCalled();

			// Wait for regeneration to complete
			await promise;

			expect(regenerateMock).toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalled();
		});

		it('should track session regeneration to prevent duplicate regenerations', async () => {
			const regenerateMock = vi.fn((callback: Function) => callback(null));
			mockReq.session = {
				regenerate: regenerateMock,
				touch: vi.fn(),
				cookie: { maxAge: undefined },
				regenerated: true,
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			// Should not regenerate again
			expect(regenerateMock).not.toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Error Handling and Resilience', () => {
		it('should handle session store errors gracefully', async () => {
			const regenerateMock = vi.fn((callback: Function) => {
				callback(new Error('Session store unavailable'));
			});

			mockReq.session = {
				regenerate: regenerateMock,
				touch: vi.fn().mockImplementation(() => {
					throw new Error('Session touch failed');
				}),
				cookie: { maxAge: undefined },
			} as any;

			// Should not throw an error
			await expect(
				enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext),
			).resolves.not.toThrow();

			expect(mockNext).toHaveBeenCalled();
		});

		it('should handle missing session methods gracefully', async () => {
			mockReq.session = {
				// Missing regenerate and touch methods
				cookie: { maxAge: undefined },
			} as any;

			await expect(
				enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext),
			).resolves.not.toThrow();

			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('Integration with Other Security Features', () => {
		it('should work after input sanitization', async () => {
			mockReq.securityContext = {
				inputSanitized: true,
			};

			mockReq.session = {
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.securityContext?.inputSanitized).toBe(true);
			expect(mockNext).toHaveBeenCalled();
		});

		it('should work with API key authentication', async () => {
			mockReq.securityContext = {
				apiKeyValid: true,
			};

			mockReq.session = {
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			expect(mockReq.securityContext?.apiKeyValid).toBe(true);
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe('BrAInwav Branding', () => {
		it('should include brAInwav branding in session cookie', async () => {
			mockReq.session = {
				regenerate: vi.fn((callback: Function) => callback(null)),
				touch: vi.fn(),
				cookie: { maxAge: undefined },
			} as any;

			await enhanceSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

			const config = getSecurityConfig();
			expect(mockRes.cookie).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({
					brand: config.brand.name,
				}),
			);
		});

		it('should use brAInwav-branded CSRF cookie name', async () => {
			mockReq.session = {} as any;

			await generateCsrfTokenMiddleware(mockReq as Request, mockRes as Response, mockNext);

			const config = getSecurityConfig();
			expect(mockRes.cookie).toHaveBeenCalledWith(
				config.csrf.cookieName,
				expect.any(String),
				expect.any(Object),
			);
			expect(config.csrf.cookieName).toContain('brAInwav');
		});
	});
});
