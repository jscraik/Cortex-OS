/**
 * @fileoverview TDD tests for secret scoping and redaction
 * Tests explicit secret accessor with logging redaction capabilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import the implementation (will fail initially)
import type { RedactionConfig, SecretScope } from './secret-accessor-impl.js';

describe('Secret Scoping and Redaction TDD', () => {
	let mockConsole: any;
	let originalConsole: any;

	beforeEach(() => {
		originalConsole = global.console;
		mockConsole = {
			log: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
		};
		global.console = mockConsole;
	});

	afterEach(() => {
		global.console = originalConsole;
		vi.restoreAllMocks();
	});

	describe('SecretScope Schema', () => {
		it('should validate minimal secret scope', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'test-scope',
				allowedSecrets: ['API_KEY'],
				restrictions: {
					environment: ['test', 'development'],
					timeWindow: undefined,
				},
			};

			const accessor = createSecretAccessor();
			const result = accessor.validateScope(scope);
			expect(result.isValid).toBe(true);
		});

		it('should validate complex secret scope with time restrictions', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'production-scope',
				allowedSecrets: ['DATABASE_URL', 'JWT_SECRET'],
				restrictions: {
					environment: ['production'],
					timeWindow: {
						start: '09:00',
						end: '17:00',
						timezone: 'UTC',
					},
				},
			};

			const accessor = createSecretAccessor();
			const result = accessor.validateScope(scope);
			expect(result.isValid).toBe(true);
		});

		it('should reject invalid scope with empty allowed secrets', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'invalid-scope',
				allowedSecrets: [],
				restrictions: {
					environment: ['test'],
				},
			};

			const accessor = createSecretAccessor();
			const result = accessor.validateScope(scope);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('allowedSecrets cannot be empty');
		});
	});

	describe('Secret Access Control', () => {
		it('should allow access to secrets within scope', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'api-scope',
				allowedSecrets: ['API_KEY'],
				restrictions: {
					environment: ['test'],
				},
			};

			const accessor = createSecretAccessor();
			accessor.setScope(scope);

			// Mock environment variable
			vi.stubEnv('API_KEY', 'secret-api-key-value');
			vi.stubEnv('NODE_ENV', 'test');

			const result = await accessor.getSecret('API_KEY');
			expect(result.success).toBe(true);
			expect(result.value).toBe('secret-api-key-value');
		});

		it('should deny access to secrets outside scope', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'limited-scope',
				allowedSecrets: ['API_KEY'],
				restrictions: {
					environment: ['test'],
				},
			};

			const accessor = createSecretAccessor();
			accessor.setScope(scope);

			vi.stubEnv('DATABASE_PASSWORD', 'secret-db-password');
			vi.stubEnv('NODE_ENV', 'test');

			const result = await accessor.getSecret('DATABASE_PASSWORD');
			expect(result.success).toBe(false);
			expect(result.error).toBe('SECRET_NOT_IN_SCOPE');
			expect(result.message).toContain('DATABASE_PASSWORD not allowed in scope limited-scope');
		});

		it('should deny access in wrong environment', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'prod-scope',
				allowedSecrets: ['API_KEY'],
				restrictions: {
					environment: ['production'],
				},
			};

			const accessor = createSecretAccessor();
			accessor.setScope(scope);

			vi.stubEnv('API_KEY', 'secret-value');
			vi.stubEnv('NODE_ENV', 'development');

			const result = await accessor.getSecret('API_KEY');
			expect(result.success).toBe(false);
			expect(result.error).toBe('ENVIRONMENT_RESTRICTED');
		});

		it('should deny access outside time window', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'time-restricted-scope',
				allowedSecrets: ['API_KEY'],
				restrictions: {
					environment: ['test'],
					timeWindow: {
						start: '09:00',
						end: '17:00',
						timezone: 'UTC',
					},
				},
			};

			const accessor = createSecretAccessor();
			accessor.setScope(scope);

			// Mock time outside window (18:00 UTC)
			vi.setSystemTime(new Date('2025-01-01T18:00:00Z'));

			vi.stubEnv('API_KEY', 'secret-value');
			vi.stubEnv('NODE_ENV', 'test');

			const result = await accessor.getSecret('API_KEY');
			expect(result.success).toBe(false);
			expect(result.error).toBe('TIME_RESTRICTED');
		});
	});

	describe('Log Redaction', () => {
		it('should redact secrets in console.log messages', async () => {
			const { createLogRedactor } = await import('./secret-accessor-impl.js');

			const config: RedactionConfig = {
				secretPatterns: [/api[_-]?key[_-]?=(\w+)/i, /password[_-]?=(\w+)/i, /token[_-]?=(\w+)/i],
				replacement: '[REDACTED]',
			};

			// Capture what gets logged
			const loggedMessages: string[] = [];
			const originalLog = console.log;
			console.log = (message: string) => {
				loggedMessages.push(message);
			};

			const redactor = createLogRedactor(config);
			redactor.attachToConsole();

			console.log('Starting with api_key=abc123 and password=secret456');

			// Check that the message was redacted
			expect(loggedMessages).toHaveLength(1);
			expect(loggedMessages[0]).toBe('Starting with api_key=[REDACTED] and password=[REDACTED]');

			redactor.detachFromConsole();
			console.log = originalLog;
		});

		it('should redact JWT tokens in error messages', async () => {
			const { createLogRedactor } = await import('./secret-accessor-impl.js');

			const config: RedactionConfig = {
				secretPatterns: [/Bearer\s+([A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_.+/=]*)/g],
				replacement: '[REDACTED]',
			};

			// Capture what gets logged
			const loggedMessages: string[] = [];
			const originalError = console.error;
			console.error = (message: string) => {
				loggedMessages.push(message);
			};

			const redactor = createLogRedactor(config);
			redactor.attachToConsole();

			console.error(
				'Auth failed with token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
			);

			expect(loggedMessages).toHaveLength(1);
			expect(loggedMessages[0]).toBe('Auth failed with token: Bearer [REDACTED]');

			redactor.detachFromConsole();
			console.error = originalError;
		});

		it('should not redact non-secret content', async () => {
			const { createLogRedactor } = await import('./secret-accessor-impl.js');

			const config: RedactionConfig = {
				secretPatterns: [/secret[_-]?=(\w+)/i],
				replacement: '[REDACTED]',
			};

			// Capture what gets logged
			const loggedMessages: string[] = [];
			const originalLog = console.log;
			console.log = (message: string) => {
				loggedMessages.push(message);
			};

			const redactor = createLogRedactor(config);
			redactor.attachToConsole();

			console.log('Normal log message without secrets');

			expect(loggedMessages).toHaveLength(1);
			expect(loggedMessages[0]).toBe('Normal log message without secrets');

			redactor.detachFromConsole();
			console.log = originalLog;
		});

		it('should handle multiple secrets in one message', async () => {
			const { createLogRedactor } = await import('./secret-accessor-impl.js');

			const config: RedactionConfig = {
				secretPatterns: [/api_key=(\w+)/g, /db_password=(\w+)/g],
				replacement: '[REDACTED]',
			};

			// Capture what gets logged
			const loggedMessages: string[] = [];
			const originalInfo = console.info;
			console.info = (message: string) => {
				loggedMessages.push(message);
			};

			const redactor = createLogRedactor(config);
			redactor.attachToConsole();

			console.info('Config: api_key=abc123, db_password=xyz789, port=3000');

			expect(loggedMessages).toHaveLength(1);
			expect(loggedMessages[0]).toBe(
				'Config: api_key=[REDACTED], db_password=[REDACTED], port=3000',
			);

			redactor.detachFromConsole();
			console.info = originalInfo;
		});
	});

	describe('Secret Metadata and Audit', () => {
		it('should track secret access metadata', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'audit-scope',
				allowedSecrets: ['API_KEY'],
				restrictions: {
					environment: ['test'],
				},
			};

			const accessor = createSecretAccessor();
			accessor.setScope(scope);

			vi.stubEnv('API_KEY', 'secret-value');
			vi.stubEnv('NODE_ENV', 'test');

			await accessor.getSecret('API_KEY');

			const metadata = accessor.getAccessMetadata('API_KEY');
			expect(metadata).toBeDefined();
			expect(metadata?.secretName).toBe('API_KEY');
			expect(metadata?.scope).toBe('audit-scope');
			expect(metadata?.accessCount).toBe(1);
			expect(metadata?.lastAccessed).toBeInstanceOf(Date);
		});

		it('should increment access count on repeated access', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'counter-scope',
				allowedSecrets: ['API_KEY'],
				restrictions: {
					environment: ['test'],
				},
			};

			const accessor = createSecretAccessor();
			accessor.setScope(scope);

			vi.stubEnv('API_KEY', 'secret-value');
			vi.stubEnv('NODE_ENV', 'test');

			await accessor.getSecret('API_KEY');
			await accessor.getSecret('API_KEY');
			await accessor.getSecret('API_KEY');

			const metadata = accessor.getAccessMetadata('API_KEY');
			expect(metadata?.accessCount).toBe(3);
		});

		it('should track denied access attempts', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'limited-scope',
				allowedSecrets: ['API_KEY'],
				restrictions: {
					environment: ['test'],
				},
			};

			const accessor = createSecretAccessor();
			accessor.setScope(scope);

			vi.stubEnv('FORBIDDEN_SECRET', 'secret-value');
			vi.stubEnv('NODE_ENV', 'test');

			await accessor.getSecret('FORBIDDEN_SECRET');

			const deniedAttempts = accessor.getDeniedAttempts();
			expect(deniedAttempts).toHaveLength(1);
			expect(deniedAttempts[0].secretName).toBe('FORBIDDEN_SECRET');
			expect(deniedAttempts[0].reason).toBe('SECRET_NOT_IN_SCOPE');
			expect(deniedAttempts[0].timestamp).toBeInstanceOf(Date);
		});
	});

	describe('Integration Scenarios', () => {
		it('should handle scope changes during runtime', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const initialScope: SecretScope = {
				name: 'initial-scope',
				allowedSecrets: ['API_KEY'],
				restrictions: {
					environment: ['test'],
				},
			};

			const newScope: SecretScope = {
				name: 'expanded-scope',
				allowedSecrets: ['API_KEY', 'DATABASE_URL'],
				restrictions: {
					environment: ['test'],
				},
			};

			const accessor = createSecretAccessor();
			accessor.setScope(initialScope);

			vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/db');
			vi.stubEnv('NODE_ENV', 'test');

			// Should fail initially
			let result = await accessor.getSecret('DATABASE_URL');
			expect(result.success).toBe(false);

			// Change scope
			accessor.setScope(newScope);

			// Should succeed now
			result = await accessor.getSecret('DATABASE_URL');
			expect(result.success).toBe(true);
		});

		it('should work with multiple redactors', async () => {
			const { createLogRedactor } = await import('./secret-accessor-impl.js');

			const apiRedactor = createLogRedactor({
				secretPatterns: [/api_key=(\w+)/g],
				replacement: '[API_REDACTED]',
			});

			const dbRedactor = createLogRedactor({
				secretPatterns: [/db_password=(\w+)/g],
				replacement: '[DB_REDACTED]',
			});

			// Capture what gets logged
			const loggedMessages: string[] = [];
			const originalLog = console.log;
			console.log = (message: string) => {
				loggedMessages.push(message);
			};

			apiRedactor.attachToConsole();
			dbRedactor.attachToConsole();

			console.log('Settings: api_key=abc123, db_password=xyz789');

			// Both redactors should apply
			expect(loggedMessages).toHaveLength(1);
			expect(loggedMessages[0]).toBe('Settings: api_key=[API_REDACTED], db_password=[DB_REDACTED]');

			apiRedactor.detachFromConsole();
			dbRedactor.detachFromConsole();
			console.log = originalLog;
		});

		it('should handle missing environment variables gracefully', async () => {
			const { createSecretAccessor } = await import('./secret-accessor-impl.js');

			const scope: SecretScope = {
				name: 'missing-scope',
				allowedSecrets: ['MISSING_SECRET'],
				restrictions: {
					environment: ['test'],
				},
			};

			const accessor = createSecretAccessor();
			accessor.setScope(scope);

			vi.stubEnv('NODE_ENV', 'test');
			// Don't set MISSING_SECRET

			const result = await accessor.getSecret('MISSING_SECRET');
			expect(result.success).toBe(false);
			expect(result.error).toBe('SECRET_NOT_FOUND');
			expect(result.message).toContain('Environment variable MISSING_SECRET not found');
		});
	});
});
