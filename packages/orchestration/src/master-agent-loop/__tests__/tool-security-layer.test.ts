/**
 * @fileoverview Tool Security & Validation Tests - Phase 3.5
 * @module ToolSecurityLayer.test
 * @description Test-driven development for comprehensive tool security validation
 * @author brAInwav Development Team
 * @version 3.5.0
 * @since 2024-12-09
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolSecurityLayer } from '../tool-security-layer.js';
import { ToolValidationError } from '../tool-validation-error.js';

/**
 * Create malicious tool input for security testing
 */
function createMaliciousToolInput() {
	return {
		command: 'rm -rf /',
		script: '<script>alert("xss")</script>',
		path: '../../../etc/passwd',
		url: 'javascript:alert("evil")',
		sql: "'; DROP TABLE users; --",
		prototype: { __proto__: { isAdmin: true } },
		oversized: 'x'.repeat(10000),
	};
}

/**
 * Create legitimate tool input for testing
 */
function createLegitimateToolInput() {
	return {
		operation: 'read',
		path: '/safe/path/file.txt',
		data: 'legitimate content',
		options: { timeout: 5000 },
	};
}

describe('ToolSecurityLayer', () => {
	let security: ToolSecurityLayer;

	beforeEach(() => {
		security = new ToolSecurityLayer();
	});

	describe('Input Validation and Sanitization', () => {
		it('should validate and sanitize all tool inputs', async () => {
			const maliciousInput = createMaliciousToolInput();

			// Should throw error for malicious input (prototype pollution detected first)
			await expect(security.validateInput(maliciousInput)).rejects.toThrow(/prototype pollution/i);
		});

		it('should sanitize HTML and script content', async () => {
			const input = {
				content: '<script>alert("xss")</script><p>Safe content</p>',
				description: 'User input with <b>formatting</b>',
			};

			const sanitized = (await security.sanitizeInput(input)) as Record<string, string>;

			expect(sanitized.content).not.toContain('<script>');
			expect(sanitized.content).toContain('Safe content');
			expect(sanitized.description).toBe('User input with formatting'); // HTML stripped
		});

		it('should detect and prevent path traversal attacks', async () => {
			const pathTraversalInputs = [
				{ path: '../../../etc/passwd' },
				{ path: '..\\..\\windows\\system32\\config\\sam' },
				{ path: '/etc/../etc/passwd' },
				{ path: 'legitimate/../../../etc/shadow' },
			];

			for (const input of pathTraversalInputs) {
				await expect(security.validateInput(input)).rejects.toThrow(/path traversal/i);
			}
		});

		it('should validate URL schemes and prevent dangerous protocols', async () => {
			const dangerousUrls = [
				{ url: 'javascript:alert("evil")' },
				{ url: 'data:text/html,<script>alert("xss")</script>' },
				{ url: 'file:///etc/passwd' },
				{ url: 'ftp://malicious.com/steal-data' },
			];

			for (const input of dangerousUrls) {
				await expect(security.validateInput(input)).rejects.toThrow(/invalid URL scheme/i);
			}
		});

		it('should detect SQL injection attempts', async () => {
			const sqlInjectionInputs = [
				{ query: "'; DROP TABLE users; --" },
				{ filter: "1' OR '1'='1" },
				{ search: "admin'; DELETE FROM passwords; --" },
			];

			for (const input of sqlInjectionInputs) {
				await expect(security.validateInput(input)).rejects.toThrow(/SQL injection/i);
			}
		});

		it('should prevent prototype pollution', async () => {
			const pollutionInputs = [
				{ __proto__: { isAdmin: true } },
				{ constructor: { prototype: { evil: true } } },
				JSON.parse('{"__proto__": {"polluted": true}}'),
			];

			for (const input of pollutionInputs) {
				await expect(security.validateInput(input)).rejects.toThrow(/prototype pollution/i);
			}
		});

		it('should enforce input size limits', async () => {
			const oversizedInput = {
				data: 'x'.repeat(10000000), // 10MB string
				array: new Array(100000).fill('data'),
				nested: { deep: { very: { nested: 'x'.repeat(50000) } } },
			};

			await expect(security.validateInput(oversizedInput)).rejects.toThrow(/size limit/i);
		});

		it('should validate data types and reject unexpected types', async () => {
			const invalidTypeInputs = [
				{ callback: () => console.log('evil') },
				{ date: new Date() }, // Only allow serializable types
				{ symbol: Symbol('evil') },
				{ bigint: BigInt(12345) },
			];

			for (const input of invalidTypeInputs) {
				await expect(security.validateInput(input)).rejects.toThrow(/invalid data type/i);
			}
		});

		it('should allow legitimate inputs after validation', async () => {
			const legitimateInput = createLegitimateToolInput();

			const validated = await security.validateInput(legitimateInput);
			expect(validated).toEqual(legitimateInput);
		});
	});

	describe('Authorization and Access Control', () => {
		it('should enforce role-based access control', async () => {
			const restrictedOperation = {
				operation: 'system-shutdown',
				requiresRole: 'admin',
			};

			// Should fail without proper role
			await expect(
				security.checkAuthorization(restrictedOperation, { userId: 'user123', roles: ['user'] }),
			).rejects.toThrow(/insufficient permissions/i);

			// Should succeed with proper role
			await expect(
				security.checkAuthorization(restrictedOperation, { userId: 'admin123', roles: ['admin'] }),
			).resolves.toBeTruthy();
		});

		it('should validate API keys and authentication tokens', async () => {
			const protectedOperation = {
				operation: 'sensitive-data',
				requiresAuth: true,
			};

			// Should fail without authentication
			await expect(security.checkAuthorization(protectedOperation, {})).rejects.toThrow(
				/authentication required/i,
			);

			// Should fail with invalid token
			await expect(
				security.checkAuthorization(protectedOperation, { apiKey: 'invalid-key' }),
			).rejects.toThrow(/invalid credentials/i);

			// Should succeed with valid token
			await expect(
				security.checkAuthorization(protectedOperation, { apiKey: 'valid-api-key-123' }),
			).resolves.toBeTruthy();
		});

		it('should enforce resource-based permissions', async () => {
			const resourceOperation = {
				operation: 'file-read',
				resource: '/sensitive/documents/secret.txt',
			};

			// Should fail without resource permission
			await expect(
				security.checkResourcePermission(resourceOperation, {
					userId: 'user123',
					permissions: ['/public/*'],
				}),
			).rejects.toThrow(/resource access denied/i);

			// Should succeed with matching permission
			await expect(
				security.checkResourcePermission(resourceOperation, {
					userId: 'admin123',
					permissions: ['/sensitive/*'],
				}),
			).resolves.toBeTruthy();
		});

		it('should implement capability-based security model', async () => {
			const capabilityOperation = {
				operation: 'network-scan',
				requiredCapabilities: ['network-admin', 'security-audit'],
			};

			// Should fail without required capabilities
			await expect(
				security.checkCapabilities(capabilityOperation, { capabilities: ['file-read'] }),
			).rejects.toThrow(/missing capabilities/i);

			// Should succeed with all required capabilities
			await expect(
				security.checkCapabilities(capabilityOperation, {
					capabilities: ['network-admin', 'security-audit', 'file-read'],
				}),
			).resolves.toBeTruthy();
		});
	});

	describe('Audit Logging', () => {
		it('should log all security-relevant events', async () => {
			const auditLogs: any[] = [];
			security.on('security-audit', (event) => auditLogs.push(event));

			try {
				await security.validateInput(createMaliciousToolInput());
			} catch {
				// Expected to fail
			}

			expect(auditLogs).toHaveLength(1);
			expect(auditLogs[0]).toEqual(
				expect.objectContaining({
					event: 'security-violation',
					timestamp: expect.any(Date),
					violationType: expect.any(String),
					inputHash: expect.any(String),
					blocked: true,
				}),
			);
		});

		it('should log successful validations for compliance', async () => {
			const auditLogs: any[] = [];
			security.on('security-audit', (event) => auditLogs.push(event));

			await security.validateInput(createLegitimateToolInput());

			expect(auditLogs).toHaveLength(1);
			expect(auditLogs[0]).toEqual(
				expect.objectContaining({
					event: 'input-validated',
					timestamp: expect.any(Date),
					success: true,
					inputHash: expect.any(String),
				}),
			);
		});

		it('should maintain audit trail with correlation IDs', async () => {
			const correlationId = 'test-correlation-123';
			const auditLogs: any[] = [];
			security.on('security-audit', (event) => auditLogs.push(event));

			await security.validateInput(createLegitimateToolInput(), { correlationId });

			expect(auditLogs[0].correlationId).toBe(correlationId);
		});

		it('should redact sensitive information from audit logs', async () => {
			const sensitiveInput = {
				password: 'secret123',
				apiKey: 'sk-1234567890abcdef',
				creditCard: '4111111111111111',
				operation: 'login',
			};

			const auditLogs: any[] = [];
			security.on('security-audit', (event) => auditLogs.push(event));

			await security.validateInput(sensitiveInput);

			const auditEntry = auditLogs[0];
			expect(auditEntry.redactedFields).toContain('password');
			expect(auditEntry.redactedFields).toContain('apiKey');
			expect(auditEntry.redactedFields).toContain('creditCard');
			expect(auditEntry.inputHash).toBeDefined();
			expect(auditEntry.inputData).toBeUndefined(); // Sensitive data not logged
		});
	});

	describe('Rate Limiting and Abuse Detection', () => {
		it('should enforce rate limits per user/IP', async () => {
			const userId = 'test-user-123';
			const operations = Array(10)
				.fill(null)
				.map(() => createLegitimateToolInput());

			// First few should succeed
			for (let i = 0; i < 5; i++) {
				await expect(security.checkRateLimit(operations[i], { userId })).resolves.toBeTruthy();
			}

			// Should start rate limiting after threshold
			await expect(security.checkRateLimit(operations[6], { userId })).rejects.toThrow(
				/rate limit exceeded/i,
			);
		});

		it('should implement sliding window rate limiting', async () => {
			const userId = 'sliding-test-user';

			// Fill up the rate limit
			for (let i = 0; i < 5; i++) {
				await security.checkRateLimit(createLegitimateToolInput(), { userId });
			}

			// Should be rate limited
			await expect(
				security.checkRateLimit(createLegitimateToolInput(), { userId }),
			).rejects.toThrow(/rate limit/i);

			// Mock time advance (in real implementation, this would be based on actual time)
			vi.advanceTimersByTime(60000); // 1 minute

			// Should allow requests again after window slides
			await expect(
				security.checkRateLimit(createLegitimateToolInput(), { userId }),
			).resolves.toBeTruthy();
		});

		it('should detect and block suspicious patterns', async () => {
			const userId = 'suspicious-user';
			const suspiciousInputs = [
				{ operation: 'list-users' },
				{ operation: 'list-permissions' },
				{ operation: 'check-admin' },
				{ operation: 'dump-database' },
				{ operation: 'system-info' },
			];

			// Multiple suspicious operations should trigger detection
			for (const input of suspiciousInputs) {
				await security.validateInput(input, { userId });
			}

			// Next operation should be blocked due to suspicious pattern
			await expect(
				security.validateInput({ operation: 'normal-operation' }, { userId }),
			).rejects.toThrow(/suspicious activity detected/i);
		});

		it('should implement adaptive rate limiting based on security level', async () => {
			const highSecurityOperation = {
				operation: 'admin-access',
				securityLevel: 'critical',
			};

			const lowSecurityOperation = {
				operation: 'read-public-data',
				securityLevel: 'low',
			};

			const userId = 'adaptive-test-user';

			// High security operations should have stricter limits
			for (let i = 0; i < 2; i++) {
				await security.checkRateLimit(highSecurityOperation, { userId });
			}

			await expect(security.checkRateLimit(highSecurityOperation, { userId })).rejects.toThrow(
				/rate limit/i,
			);

			// Low security operations should have more lenient limits
			for (let i = 0; i < 10; i++) {
				await expect(
					security.checkRateLimit(lowSecurityOperation, { userId: `low-sec-${i}` }),
				).resolves.toBeTruthy();
			}
		});

		it('should provide rate limit status and reset information', async () => {
			const userId = 'status-test-user';

			const status = await security.getRateLimitStatus({ userId });

			expect(status).toEqual(
				expect.objectContaining({
					userId,
					requestsRemaining: expect.any(Number),
					resetTime: expect.any(Date),
					windowSizeMs: expect.any(Number),
				}),
			);
		});
	});

	describe('Security Error Handling', () => {
		it('should throw ToolValidationError for validation failures', async () => {
			await expect(security.validateInput(createMaliciousToolInput())).rejects.toThrow(
				ToolValidationError,
			);
		});

		it('should provide detailed error information for debugging', async () => {
			try {
				await security.validateInput(createMaliciousToolInput());
				expect.fail('Should have thrown error');
			} catch (error) {
				expect(error).toBeInstanceOf(ToolValidationError);
				expect(error.code).toBe('SECURITY_VIOLATION');
				expect(error.details).toBeInstanceOf(Array);
				expect(error.details.length).toBeGreaterThan(0);
			}
		});

		it('should not leak sensitive information in error messages', async () => {
			const sensitiveInput = {
				password: 'secret123',
				maliciousPath: '../../../etc/passwd',
			};

			try {
				await security.validateInput(sensitiveInput);
				expect.fail('Should have thrown error');
			} catch (error) {
				expect(error.message).not.toContain('secret123');
				expect(error.message).not.toContain('/etc/passwd');
				expect(error.message).toContain('security violation'); // Generic message
			}
		});
	});

	describe('Integration with Tool Layer', () => {
		it('should integrate seamlessly with ToolLayer validation', async () => {
			// This test will verify integration once ToolLayer is updated
			const toolLayer = {
				validateWithSecurity: security.validateInput.bind(security),
			};

			await expect(
				toolLayer.validateWithSecurity(createLegitimateToolInput()),
			).resolves.toBeDefined();

			await expect(toolLayer.validateWithSecurity(createMaliciousToolInput())).rejects.toThrow();
		});

		it('should provide security metadata for tool execution context', async () => {
			const validInput = createLegitimateToolInput();
			const securityContext = await security.createSecurityContext(validInput, {
				userId: 'test-user',
				sessionId: 'session-123',
			});

			expect(securityContext).toEqual(
				expect.objectContaining({
					validated: true,
					securityLevel: expect.any(String),
					permissions: expect.any(Array),
					auditId: expect.any(String),
					timestamp: expect.any(Date),
				}),
			);
		});
	});
});
