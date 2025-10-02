import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSecurityConfig } from '../../config/security';
import {
	apiKeyAuth,
	applySecurityMiddleware,
	customCsrfProtection,
	enhanceSessionSecurity,
	generateCsrfTokenMiddleware,
	sanitizeInput,
	securityErrorHandler,
	securityHeaders,
	securityLogger,
	validateRequestSize,
} from '../../middleware/security';

// Mock console methods to test logging
const consoleSpy = {
	log: vi.spyOn(console, 'log').mockImplementation(() => {}),
	warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
	error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('Security Middleware Comprehensive Tests', () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));
		vi.clearAllMocks();
	});

	afterEach(() => {
		consoleSpy.log.mockClear();
		consoleSpy.warn.mockClear();
		consoleSpy.error.mockClear();
	});

	describe('Security Headers Middleware', () => {
		it('should apply security headers when enabled', async () => {
			app.use(securityHeaders);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app).get('/test').expect(200);

			// Check for brAInwav branding headers
			expect(response.headers).toHaveProperty('x-brainwav-security-enabled', 'true');
			expect(response.headers).toHaveProperty('x-brainwav-security-timestamp');
			expect(response.headers).toHaveProperty('x-brainwav-security-policy');

			// Check for standard security headers
			expect(response.headers).toHaveProperty('x-content-type-options');
			expect(response.headers).toHaveProperty('x-frame-options');
			expect(response.headers).toHaveProperty('x-xss-protection');
		});

		it('should include CSP headers when enabled', async () => {
			process.env.ENABLE_CSP = 'true';
			app.use(securityHeaders);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app).get('/test').expect(200);

			expect(response.headers).toHaveProperty('content-security-policy');

			// Verify CSP includes brAInwav security directives
			const csp = response.headers['content-security-policy'];
			expect(csp).toContain("default-src 'self'");
			expect(csp).toContain('upgrade-insecure-requests');
		});

		it('should apply HSTS headers in production', async () => {
			process.env.NODE_ENV = 'production';
			app.use(securityHeaders);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app).get('/test').expect(200);

			expect(response.headers).toHaveProperty('strict-transport-security');
			expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
		});
	});

	describe('CSRF Protection Middleware', () => {
		it('should generate CSRF token for new sessions', async () => {
			app.use((req, _res, next) => {
				req.session = {};
				next();
			});
			app.use(generateCsrfTokenMiddleware);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app).get('/test').expect(200);

			// Should set CSRF token cookie
			expect(response.headers['set-cookie']).toBeDefined();
			const csrfCookie = response.headers['set-cookie'].find((cookie: string) =>
				cookie.includes('__Secure-brAInwav-CSRF'),
			);
			expect(csrfCookie).toBeDefined();
		});

		it('should allow safe HTTP methods without CSRF token', async () => {
			app.use(customCsrfProtection);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));
			app.head('/test', (_req, res) => res.json({ test: 'success' }));
			app.options('/test', (_req, res) => res.json({ test: 'success' }));

			await request(app).get('/test').expect(200);
			await request(app).head('/test').expect(200);
			await request(app).options('/test').expect(200);
		});

		it('should reject POST requests without CSRF token', async () => {
			app.use(customCsrfProtection);
			app.post('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app).post('/test').send({ data: 'test' }).expect(403);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('brAInwav Security Error');
			expect(response.body.error).toContain('CSRF token required');
		});

		it('should reject POST requests with invalid CSRF token', async () => {
			app.use(customCsrfProtection);
			app.post('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app)
				.post('/test')
				.set('X-CSRF-Token', 'invalid-token')
				.send({ data: 'test' })
				.expect(403);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('Invalid CSRF token');
		});

		it('should allow POST requests with valid CSRF token', async () => {
			app.use((req, _res, next) => {
				req.session = { csrfToken: 'valid-token-123' };
				next();
			});
			app.use(customCsrfProtection);
			app.post('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app)
				.post('/test')
				.set('X-CSRF-Token', 'valid-token-123')
				.send({ data: 'test' })
				.expect(200);

			expect(response.body).toHaveProperty('test', 'success');
		});
	});

	describe('Input Sanitization Middleware', () => {
		it('should sanitize request body against XSS attacks', async () => {
			app.use(sanitizeInput);
			app.post('/test', (req, res) => res.json({ body: req.body }));

			const maliciousInput = {
				name: '<script>alert("xss")</script>',
				description: 'Test with <img src=x onerror=alert(1)> malicious content',
				safe: 'This is safe content',
			};

			const response = await request(app).post('/test').send(maliciousInput).expect(200);

			expect(response.body.body.name).not.toContain('<script>');
			expect(response.body.body.name).not.toContain('alert');
			expect(response.body.body.description).not.toContain('<img');
			expect(response.body.body.description).not.toContain('onerror');
			expect(response.body.body.safe).toBe('This is safe content');
		});

		it('should truncate fields that exceed maximum length', async () => {
			const longString = 'a'.repeat(15000); // Exceeds default max length
			app.use(sanitizeInput);
			app.post('/test', (req, res) => res.json({ body: req.body }));

			const response = await request(app).post('/test').send({ longField: longString }).expect(200);

			expect(response.body.body.longField.length).toBeLessThanOrEqual(10000);
		});

		it('should sanitize nested objects', async () => {
			app.use(sanitizeInput);
			app.post('/test', (req, res) => res.json({ body: req.body }));

			const maliciousNested = {
				user: {
					name: '<script>alert("nested")</script>',
					profile: {
						bio: '<img src=x onerror=alert(1)> bio',
					},
				},
				items: ['<script>bad</script>', 'safe item'],
			};

			const response = await request(app).post('/test').send(maliciousNested).expect(200);

			expect(response.body.body.user.name).not.toContain('<script>');
			expect(response.body.body.user.profile.bio).not.toContain('<img>');
			expect(response.body.body.items[0]).not.toContain('<script>');
			expect(response.body.body.items[1]).toBe('safe item');
		});

		it('should handle sanitization errors gracefully', async () => {
			// Mock a sanitization error
			const mockPurify = {
				sanitize: vi.fn().mockImplementation(() => {
					throw new Error('Sanitization failed');
				}),
			};

			// Temporarily replace DOMPurify
			vi.doMock('dompurify', () => mockPurify);

			app.use(sanitizeInput);
			app.post('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app).post('/test').send({ data: 'test' }).expect(400);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('brAInwav Security Error');
			expect(response.body.error).toContain('Input sanitization failed');

			// Verify error was logged
			expect(consoleSpy.error).toHaveBeenCalledWith(
				'brAInwav Input Sanitization Error:',
				expect.any(Error),
			);
		});
	});

	describe('API Key Authentication Middleware', () => {
		beforeEach(() => {
			process.env.BRAINWAV_API_KEY = 'brainwav-testapikey12345678901234567890';
		});

		it('should authenticate requests with valid API key', async () => {
			app.use(apiKeyAuth);
			app.get('/test', (req, res) => {
				expect(req.securityContext?.apiKeyValid).toBe(true);
				res.json({ test: 'success' });
			});

			const response = await request(app)
				.get('/test')
				.set('X-API-Key', 'brainwav-testapikey12345678901234567890')
				.expect(200);

			expect(response.body).toHaveProperty('test', 'success');
		});

		it('should reject requests without API key', async () => {
			app.use(apiKeyAuth);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app).get('/test').expect(401);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('brAInwav Security Error');
			expect(response.body.error).toContain('API key required');
		});

		it('should reject requests with invalid API key format', async () => {
			app.use(apiKeyAuth);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app).get('/test').set('X-API-Key', 'invalid-key').expect(401);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('Invalid API key format');
		});

		it('should reject requests with wrong API key', async () => {
			app.use(apiKeyAuth);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app)
				.get('/test')
				.set('X-API-Key', 'brainwav-wrongkey12345678901234567890')
				.expect(401);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('Invalid API key format');
		});
	});

	describe('Request Size Validation Middleware', () => {
		it('should accept requests within size limit', async () => {
			app.use(validateRequestSize);
			app.post('/test', (_req, res) => res.json({ test: 'success' }));

			const smallData = { data: 'x'.repeat(1000) }; // Well within limits

			const response = await request(app).post('/test').send(smallData).expect(200);

			expect(response.body).toHaveProperty('test', 'success');
		});

		it('should reject requests that exceed size limit', async () => {
			app.use(validateRequestSize);
			app.post('/test', (_req, res) => res.json({ test: 'success' }));

			// Create data that exceeds the default 10MB limit
			const largeData = { data: 'x'.repeat(11 * 1024 * 1024) }; // 11MB

			const response = await request(app).post('/test').send(largeData).expect(413);

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toContain('brAInwav Security Error');
			expect(response.body.error).toContain('Request size exceeds limit');
		});
	});

	describe('Security Logger Middleware', () => {
		it('should log requests in debug mode', async () => {
			process.env.SECURITY_LOG_LEVEL = 'debug';
			app.use(securityLogger);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));

			await request(app).get('/test').expect(200);

			expect(consoleSpy.log).toHaveBeenCalledWith(
				'brAInwav Security Log - Request: GET /test',
				expect.objectContaining({
					ip: expect.any(String),
					userAgent: expect.any(String),
					timestamp: expect.any(String),
				}),
			);
		});

		it('should log error responses', async () => {
			app.use(securityLogger);
			app.get('/test', (_req, res) => res.status(400).json({ error: 'test error' }));

			await request(app).get('/test').expect(400);

			expect(consoleSpy.warn).toHaveBeenCalledWith(
				'brAInwav Security Warning - Response: 400 GET /test',
				expect.objectContaining({
					duration: expect.any(Number),
					ip: expect.any(String),
					timestamp: expect.any(String),
				}),
			);
		});
	});

	describe('Session Security Enhancement Middleware', () => {
		it('should regenerate session ID and set secure cookie', async () => {
			app.use((req, _res, next) => {
				req.session = { regenerate: vi.fn((callback) => callback()) };
				next();
			});
			app.use(enhanceSessionSecurity);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));

			const response = await request(app).get('/test').expect(200);

			// Should set secure session cookie
			expect(response.headers['set-cookie']).toBeDefined();
			const sessionCookie = response.headers['set-cookie'].find((cookie: string) =>
				cookie.includes('__Secure-brAInwav-Session'),
			);
			expect(sessionCookie).toBeDefined();
		});

		it('should handle session regeneration errors gracefully', async () => {
			app.use((req, _res, next) => {
				req.session = {
					regenerate: vi.fn((callback) => callback(new Error('Session error'))),
				};
				next();
			});
			app.use(enhanceSessionSecurity);
			app.get('/test', (_req, res) => res.json({ test: 'success' }));

			await request(app).get('/test').expect(200);

			// Should log error but not block request
			expect(consoleSpy.error).toHaveBeenCalledWith(
				'brAInwav Session Regeneration Error:',
				expect.any(Error),
			);
		});
	});

	describe('Security Error Handler', () => {
		it('should handle brAInwav security errors appropriately', async () => {
			const securityError = new Error('brAInwav Security Error: Test security violation');

			app.use((_req, _res, next) => next(securityError));
			app.use(securityErrorHandler);

			const response = await request(app).get('/test').expect(403);

			expect(response.body).toHaveProperty(
				'error',
				'brAInwav Security Error: Test security violation',
			);
			expect(response.body).toHaveProperty('brand', 'brAInwav');
		});

		it('should handle CSRF errors appropriately', async () => {
			const csrfError = new Error('CSRF token validation failed');

			app.use((_req, _res, next) => next(csrfError));
			app.use(securityErrorHandler);

			const response = await request(app).get('/test').expect(403);

			expect(response.body).toHaveProperty('error', 'CSRF token validation failed');
			expect(response.body).toHaveProperty('brand', 'brAInwav');
		});

		it('should not expose internal errors', async () => {
			const internalError = new Error('Internal database connection failed');

			app.use((_req, _res, next) => next(internalError));
			app.use(securityErrorHandler);

			const response = await request(app).get('/test').expect(500);

			expect(response.body).toHaveProperty(
				'error',
				'brAInwav Security Error: Internal security error',
			);
			expect(response.body).toHaveProperty('brand', 'brAInwav');
			expect(response.body).not.toHaveProperty('stack');
			expect(response.body).not.toHaveProperty('message');
		});

		it('should log all security errors', async () => {
			const testError = new Error('Test security error');

			app.use((_req, _res, next) => next(testError));
			app.use(securityErrorHandler);

			await request(app).get('/test').expect(500);

			expect(consoleSpy.error).toHaveBeenCalledWith(
				'brAInwav Security Error:',
				expect.objectContaining({
					error: 'Test security error',
					path: '/test',
					method: 'GET',
					ip: expect.any(String),
					timestamp: expect.any(String),
				}),
			);
		});
	});

	describe('Comprehensive Security Middleware Chain', () => {
		it('should apply all security middleware in correct order', async () => {
			const mockApp = {
				use: vi.fn(),
			};

			applySecurityMiddleware(mockApp);

			// Verify middleware was applied in correct order
			expect(mockApp.use).toHaveBeenCalledTimes(6);

			// Check that security headers are applied first
			expect(mockApp.use).toHaveBeenNthCalledWith(1, securityHeaders);

			// Check that request size validation is applied early
			expect(mockApp.use).toHaveBeenNthCalledWith(2, validateRequestSize);

			// Check that security logging is applied
			expect(mockApp.use).toHaveBeenNthCalledWith(3, securityLogger);

			// Check that CSRF token generation comes before protection
			expect(mockApp.use).toHaveBeenNthCalledWith(4, generateCsrfTokenMiddleware);

			// Check that input sanitization is applied
			expect(mockApp.use).toHaveBeenNthCalledWith(5, sanitizeInput);

			// Check that session security is applied last
			expect(mockApp.use).toHaveBeenNthCalledWith(6, enhanceSessionSecurity);
		});
	});

	describe('Security Configuration Integration', () => {
		it('should respect configuration settings', async () => {
			process.env.ENABLE_CSRF_PROTECTION = 'false';
			process.env.ENABLE_INPUT_SANITIZATION = 'false';
			process.env.ENABLE_API_KEY_AUTH = 'false';
			process.env.ENABLE_SESSION_HARDENING = 'false';

			const config = getSecurityConfig();

			expect(config.csrf.enabled).toBe(false);
			expect(config.validation.enabled).toBe(false);
			expect(config.apiKey.enabled).toBe(false);
			expect(config.session.enabled).toBe(false);
		});

		it('should use brAInwav branding consistently', async () => {
			const config = getSecurityConfig();

			expect(config.brand.name).toBe('brAInwav');
			expect(config.brand.securityPolicyHeader).toBe('X-BrAInwav-Security-Policy');
			expect(config.brand.errorPrefix).toBe('brAInwav Security Error');
		});
	});
});
