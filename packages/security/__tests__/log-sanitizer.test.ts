/**
 * [brAInwav] Log Sanitization Tests
 * Tests for CodeQL alert #189 - Sensitive data in logs
 *
 * Phase 1 (RED): Write failing tests first
 *
 * These tests verify that sensitive information is properly
 * redacted from logs to prevent credential leakage.
 */

import { describe, expect, it } from 'vitest';
import { SENSITIVE_FIELDS, sanitizeForLogging } from '../src/logging/log-sanitizer.js';

describe('[brAInwav] Log Sanitization', () => {
	describe('Basic Field Redaction', () => {
		it('should redact API keys from logs', () => {
			const data = { apiKey: 'secret-key-123', name: 'test' };
			const sanitized = sanitizeForLogging(data);

			expect(sanitized.apiKey).toBe('[REDACTED]');
			expect(sanitized.name).toBe('test');
		});

		it('should redact passwords', () => {
			const data = { username: 'admin', password: 'hunter2' };
			const sanitized = sanitizeForLogging(data);

			expect(sanitized.username).toBe('admin');
			expect(sanitized.password).toBe('[REDACTED]');
		});

		it('should redact tokens', () => {
			const data = { token: 'jwt-token-xyz', message: 'hello' };
			const sanitized = sanitizeForLogging(data);

			expect(sanitized.token).toBe('[REDACTED]');
			expect(sanitized.message).toBe('hello');
		});

		it('should redact secrets', () => {
			const data = { secret: 'my-secret', public: 'data' };
			const sanitized = sanitizeForLogging(data);

			expect(sanitized.secret).toBe('[REDACTED]');
			expect(sanitized.public).toBe('data');
		});

		it('should redact authorization headers', () => {
			const data = { authorization: 'Bearer token123', method: 'GET' };
			const sanitized = sanitizeForLogging(data);

			expect(sanitized.authorization).toBe('[REDACTED]');
			expect(sanitized.method).toBe('GET');
		});
	});

	describe('Case Insensitive Matching', () => {
		it('should redact apiKey with different casing', () => {
			const data = { ApiKey: 'secret', APIKEY: 'secret2', api_key: 'secret3' };
			const sanitized = sanitizeForLogging(data);

			expect(sanitized.ApiKey).toBe('[REDACTED]');
			expect(sanitized.APIKEY).toBe('[REDACTED]');
			expect(sanitized.api_key).toBe('[REDACTED]');
		});

		it('should redact PASSWORD in any case', () => {
			const data = { Password: 'p1', PASSWORD: 'p2', PaSsWoRd: 'p3' };
			const sanitized = sanitizeForLogging(data);

			expect(sanitized.Password).toBe('[REDACTED]');
			expect(sanitized.PASSWORD).toBe('[REDACTED]');
			expect(sanitized.PaSsWoRd).toBe('[REDACTED]');
		});
	});

	describe('Nested Object Redaction', () => {
		it('should redact nested sensitive fields (CodeQL #189)', () => {
			const data = {
				vault: {
					apiKey: 'secret',
					secrets: { password: 'hunter2' },
					safe: 'ok',
				},
			};

			const sanitized = sanitizeForLogging(data);
			expect(sanitized.vault.apiKey).toBe('[REDACTED]');
			expect(sanitized.vault.secrets).toBe('[REDACTED]');
			expect(sanitized.vault.safe).toBe('ok');
		});

		it('should handle deeply nested structures', () => {
			const data = {
				level1: {
					level2: {
						level3: {
							apiKey: 'deep-secret',
							normal: 'value',
						},
					},
				},
			};

			const sanitized = sanitizeForLogging(data);
			expect(sanitized.level1.level2.level3.apiKey).toBe('[REDACTED]');
			expect(sanitized.level1.level2.level3.normal).toBe('value');
		});

		it('should redact entire objects named "secrets"', () => {
			const data = {
				config: {
					secrets: {
						key1: 'value1',
						key2: 'value2',
					},
					public: 'data',
				},
			};

			const sanitized = sanitizeForLogging(data);
			expect(sanitized.config.secrets).toBe('[REDACTED]');
			expect(sanitized.config.public).toBe('data');
		});
	});

	describe('Array Handling', () => {
		it('should handle arrays with sensitive data', () => {
			const data = {
				items: [
					{ id: 1, token: 'secret-1' },
					{ id: 2, token: 'secret-2' },
				],
			};

			const sanitized = sanitizeForLogging(data);
			expect(sanitized.items[0].token).toBe('[REDACTED]');
			expect(sanitized.items[1].token).toBe('[REDACTED]');
			expect(sanitized.items[0].id).toBe(1);
		});

		it('should handle arrays of primitives', () => {
			const data = { tags: ['tag1', 'tag2'], count: 5 };
			const sanitized = sanitizeForLogging(data);

			expect(sanitized.tags).toEqual(['tag1', 'tag2']);
			expect(sanitized.count).toBe(5);
		});

		it('should handle mixed arrays', () => {
			const data = {
				mixed: ['string', 123, { apiKey: 'secret', name: 'obj' }, null],
			};

			const sanitized = sanitizeForLogging(data);
			expect(sanitized.mixed[0]).toBe('string');
			expect(sanitized.mixed[1]).toBe(123);
			expect(sanitized.mixed[2].apiKey).toBe('[REDACTED]');
			expect(sanitized.mixed[2].name).toBe('obj');
			expect(sanitized.mixed[3]).toBeNull();
		});
	});

	describe('Edge Cases', () => {
		it('should handle null values', () => {
			const sanitized = sanitizeForLogging(null);
			expect(sanitized).toBeNull();
		});

		it('should handle undefined values', () => {
			const sanitized = sanitizeForLogging(undefined);
			expect(sanitized).toBeUndefined();
		});

		it('should handle primitive values', () => {
			expect(sanitizeForLogging('string')).toBe('string');
			expect(sanitizeForLogging(123)).toBe(123);
			expect(sanitizeForLogging(true)).toBe(true);
		});

		it('should handle empty objects', () => {
			const sanitized = sanitizeForLogging({});
			expect(sanitized).toEqual({});
		});

		it('should handle empty arrays', () => {
			const sanitized = sanitizeForLogging([]);
			expect(sanitized).toEqual([]);
		});

		it('should handle circular references safely', () => {
			const data: any = { name: 'test' };
			data.self = data;

			// Should not throw, might return original or handle specially
			expect(() => sanitizeForLogging(data)).not.toThrow();
		});
	});

	describe('Sensitive Field List', () => {
		it('should export SENSITIVE_FIELDS array', () => {
			expect(SENSITIVE_FIELDS).toBeDefined();
			expect(Array.isArray(SENSITIVE_FIELDS)).toBe(true);
		});

		it('should include common sensitive field names', () => {
			expect(SENSITIVE_FIELDS).toContain('apikey');
			expect(SENSITIVE_FIELDS).toContain('password');
			expect(SENSITIVE_FIELDS).toContain('token');
			expect(SENSITIVE_FIELDS).toContain('secret');
			expect(SENSITIVE_FIELDS).toContain('authorization');
		});

		it('should handle fields containing sensitive keywords', () => {
			const data = {
				userPassword: 'secret',
				apiKeyValue: 'secret',
				bearerToken: 'secret',
				clientSecret: 'secret',
				normal: 'safe',
			};

			const sanitized = sanitizeForLogging(data);
			expect(sanitized.userPassword).toBe('[REDACTED]');
			expect(sanitized.apiKeyValue).toBe('[REDACTED]');
			expect(sanitized.bearerToken).toBe('[REDACTED]');
			expect(sanitized.clientSecret).toBe('[REDACTED]');
			expect(sanitized.normal).toBe('safe');
		});
	});

	describe('Performance', () => {
		it('should handle large objects efficiently', () => {
			const largeObject: any = {};
			for (let i = 0; i < 1000; i++) {
				largeObject[`field${i}`] = `value${i}`;
			}
			largeObject.apiKey = 'secret';

			const start = Date.now();
			const sanitized = sanitizeForLogging(largeObject);
			const duration = Date.now() - start;

			expect(sanitized.apiKey).toBe('[REDACTED]');
			expect(duration).toBeLessThan(100); // Should be fast
		});
	});

	describe('Immutability', () => {
		it('should not modify original object', () => {
			const original = { apiKey: 'secret', name: 'test' };
			const sanitized = sanitizeForLogging(original);

			expect(original.apiKey).toBe('secret'); // Original unchanged
			expect(sanitized.apiKey).toBe('[REDACTED]');
		});

		it('should create deep copy for nested objects', () => {
			const original = {
				nested: { apiKey: 'secret', value: 'data' },
			};
			const sanitized = sanitizeForLogging(original);

			expect(original.nested.apiKey).toBe('secret');
			expect(sanitized.nested.apiKey).toBe('[REDACTED]');
			expect(sanitized.nested).not.toBe(original.nested);
		});
	});
});
