// Integration test for security middleware
// Simple test to verify basic functionality works

import { beforeEach, describe, expect, it } from 'vitest';
import { getSecurityConfig } from '../src/config/security.ts';

describe('Security Configuration Tests', () => {
	beforeEach(() => {
		// Set test environment variables
		process.env.BRAINWAV_API_KEY = 'brainwav-test-api-key-32-chars-long-12345';
		process.env.ENABLE_API_KEY_AUTH = 'true';
		process.env.ENABLE_CSRF_PROTECTION = 'true';
		process.env.ENABLE_INPUT_SANITIZATION = 'true';
		process.env.ENABLE_SESSION_HARDENING = 'true';
	});

	it('should load security configuration successfully', () => {
		const config = getSecurityConfig();

		expect(config).toBeDefined();
		expect(config.brand.name).toBe('brAInwav');
		expect(config.apiKey.enabled).toBe(true);
		expect(config.csrf.enabled).toBe(true);
		expect(config.validation.enabled).toBe(true);
		expect(config.session.enabled).toBe(true);
	});

	it('should validate brAInwav API key format', () => {
		const config = getSecurityConfig();
		const apiKey = config.apiKey.secretKey;

		expect(apiKey).toMatch(/^brainwav-/);
		expect(apiKey.length).toBeGreaterThanOrEqual(32);
	});

	it('should have proper security headers configuration', () => {
		const config = getSecurityConfig();

		expect(config.headers.enabled).toBe(true);
		expect(config.headers.xFrameOptions).toBe('DENY');
		expect(config.headers.xContentTypeOptions).toBe('nosniff');
		expect(config.headers.xXssProtection).toBe('1; mode=block');
	});

	it('should have brAInwav branding in configuration', () => {
		const config = getSecurityConfig();

		expect(config.brand.name).toBe('brAInwav');
		expect(config.brand.version).toBe('1.0');
		expect(config.brand.securityPolicyHeader).toBe('X-BrAInwav-Security-Policy');
		expect(config.brand.errorPrefix).toBe('brAInwav Security Error');
	});

	it('should have CSP configuration enabled', () => {
		const config = getSecurityConfig();

		expect(config.headers.enableCSP).toBe(true);
		expect(config.csp.scriptSrc).toBeDefined();
		expect(config.csp.styleSrc).toBeDefined();
		expect(config.csp.imgSrc).toBeDefined();
		expect(config.csp.connectSrc).toBeDefined();
	});

	it('should have CORS security configuration', () => {
		const config = getSecurityConfig();

		expect(config.cors.allowedOrigins).toBeDefined();
		expect(config.cors.allowedOrigins.length).toBeGreaterThan(0);
		expect(config.cors.allowedMethods).toContain('GET');
		expect(config.cors.allowedMethods).toContain('POST');
		expect(config.cors.allowedHeaders).toContain('Content-Type');
		expect(config.cors.allowedHeaders).toContain('Authorization');
	});

	it('should have input validation limits', () => {
		const config = getSecurityConfig();

		expect(config.validation.maxRequestSize).toBeGreaterThan(0);
		expect(config.validation.maxFieldLength).toBeGreaterThan(0);
		expect(config.validation.maxFieldLength).toBeLessThan(100000); // Reasonable limit
	});

	it('should have session security configuration', () => {
		const config = getSecurityConfig();

		expect(config.session.timeoutMinutes).toBeGreaterThan(0);
		expect(config.session.timeoutMinutes).toBeLessThan(1440); // Less than 24 hours
		expect(config.session.secureCookie).toBe(true);
		expect(config.session.cookieName).toContain('brAInwav');
	});

	it('should have CSRF protection configuration', () => {
		const config = getSecurityConfig();

		expect(config.csrf.enabled).toBe(true);
		expect(config.csrf.cookieName).toContain('brAInwav');
		expect(config.csrf.tokenHeader).toBe('X-CSRF-Token');
	});

	it('should have security monitoring configuration', () => {
		const config = getSecurityConfig();

		expect(config.monitoring.enabled).toBe(true);
		expect(config.monitoring.logLevel).toBeDefined();
	});

	it('should have rate limiting for security endpoints', () => {
		const config = getSecurityConfig();

		expect(config.rateLimit.windowMs).toBeGreaterThan(0);
		expect(config.rateLimit.maxAttempts).toBeGreaterThan(0);
		expect(config.rateLimit.maxAttempts).toBeLessThan(100); // Reasonable limit
	});
});
