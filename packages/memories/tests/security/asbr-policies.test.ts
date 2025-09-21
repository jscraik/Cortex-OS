import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryValidationError } from '../../src/errors.js';
import { ASBRSecurityPolicy } from '../../src/security/asbr-policies.js';
import { createMemory } from '../test-utils.js';

describe('ASBR Security Policies', () => {
	let policy: ASBRSecurityPolicy;

	beforeEach(() => {
		policy = new ASBRSecurityPolicy();
	});

	describe('Memory Validation', () => {
		it('should allow valid memory content', () => {
			const memory = createMemory({
				text: 'This is a valid memory content',
				tags: ['work', 'project'],
			});

			expect(() => policy.validateMemory(memory)).not.toThrow();
		});

		it('should reject memories with suspicious patterns', () => {
			const memory = createMemory({
				text: 'Check out this amazing link: http://evil.com/login',
			});

			expect(() => policy.validateMemory(memory)).toThrow(MemoryValidationError);
		});

		it('should reject memories with potential XSS', () => {
			const memory = createMemory({
				text: 'Click <script>alert("xss")</script> here',
			});

			expect(() => policy.validateMemory(memory)).toThrow(MemoryValidationError);
		});

		it('should validate memory size limits', () => {
			const largeText = 'x'.repeat(10241); // 10KB+ text
			const memory = createMemory({ text: largeText });

			expect(() => policy.validateMemory(memory)).toThrow(MemoryValidationError);
		});

		it('should sanitize metadata', () => {
			const memory = createMemory({
				metadata: {
					'user-input': '<script>alert(1)</script>',
					'xss-vector': '<img src=x onerror=alert(1)>',
					'dangerous-link': '<a href="javascript:alert(1)">Click</a>',
					iframe: '<iframe src="evil.com"></iframe>',
					'safe-field': 'normal content',
				},
			});

			const sanitized = policy.sanitizeMemory(memory);
			expect(sanitized.metadata?.['user-input']).toBe('[SCRIPT REMOVED]');
			expect(sanitized.metadata?.['xss-vector']).toBe('');
			expect(sanitized.metadata?.['dangerous-link']).toBe('Click');
			expect(sanitized.metadata?.iframe).toBe('[IFRAME REMOVED]');
			expect(sanitized.metadata?.['safe-field']).toBe('normal content');
		});
	});

	describe('Access Control', () => {
		it('should enforce read permissions', () => {
			const memory = createMemory({
				policy: {
					read: ['admin', 'user'],
					write: ['admin'],
				},
			});

			expect(policy.canRead(memory, 'admin')).toBe(true);
			expect(policy.canRead(memory, 'user')).toBe(true);
			expect(policy.canRead(memory, 'guest')).toBe(false);
		});

		it('should enforce write permissions', () => {
			const memory = createMemory({
				policy: {
					read: ['admin', 'user'],
					write: ['admin'],
				},
			});

			expect(policy.canWrite(memory, 'admin')).toBe(true);
			expect(policy.canWrite(memory, 'user')).toBe(false);
		});

		it('should handle missing policies', () => {
			const memory = createMemory();

			expect(policy.canRead(memory, 'anyone')).toBe(true);
			expect(policy.canWrite(memory, 'anyone')).toBe(true);
		});
	});

	describe('Content Filtering', () => {
		it('should detect sensitive information patterns', () => {
			const patterns = [
				'My SSN is 123-45-6789',
				'Credit card: 4111-1111-1111-1111',
				'API key: sk_live_123456789',
				'Password: secret123',
			];

			for (const text of patterns) {
				const _memory = createMemory({ text });
				expect(policy.containsSensitiveData(text)).toBe(true);
			}
		});

		it('should allow non-sensitive content', () => {
			const text = 'This is normal content without sensitive data';
			expect(policy.containsSensitiveData(text)).toBe(false);
		});

		it('should apply content filtering policies', () => {
			const memory = createMemory({
				text: 'Here is my API key: sk_live_12345 for testing',
				metadata: { category: 'test' },
			});

			const filtered = policy.applyContentFilter(memory);
			expect(filtered.text).toContain('[REDACTED]');
			expect(filtered.metadata?.category).toBe('test');
		});
	});

	describe('Policy Validation', () => {
		it('should validate policy structure', () => {
			const validPolicy = {
				read: ['user', 'admin'],
				write: ['admin'],
				encrypt: true,
				ttl: 3600000,
			};

			expect(() => policy.validatePolicy(validPolicy)).not.toThrow();
		});

		it('should reject invalid policy structures', () => {
			const invalidPolicies = [
				{ read: 'not-an-array' }, // Should be array
				{ write: 123 }, // Should be array
				{ encrypt: 'yes' }, // Should be boolean
				{ ttl: '1hour' }, // Should be number
			];

			for (const invalidPolicy of invalidPolicies) {
				expect(() => policy.validatePolicy(invalidPolicy)).toThrow(MemoryValidationError);
			}
		});
	});

	describe('Security Scanning', () => {
		it('should scan memories for security issues', () => {
			const memory = createMemory({
				text: 'Visit http://evil.com for free stuff',
				metadata: { script: '<script>evil()</script>' },
			});

			const scan = policy.scanMemory(memory);

			expect(scan.issues.length).toBeGreaterThan(0);
			expect(scan.issues.some((issue) => issue.type === 'suspicious-link')).toBe(true);
			expect(scan.issues.some((issue) => issue.type === 'xss-risk')).toBe(true);
			expect(scan.score).toBeLessThan(1.0);
		});

		it('should return clean scan for safe memories', () => {
			const memory = createMemory({
				text: 'This is safe content',
				tags: ['work'],
			});

			const scan = policy.scanMemory(memory);

			expect(scan.issues).toHaveLength(0);
			expect(scan.score).toBe(1.0);
			expect(scan.severity).toBe('low');
		});
	});
});
