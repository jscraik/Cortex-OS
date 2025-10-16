import { beforeEach, describe, expect, it } from 'vitest';
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import {
	createSanitizationConfig,
	recursiveSanitize,
	sanitizeField,
} from '../../a2a-core/src/lib/sanitization.js';
import { logInfo } from '../a2a-core/src/lib/logging.js';

describe('A2A Sanitization (Phase 7)', () => {
	it('recursively sanitizes objects without mutating safe fields', () => {
		const testData = {
			id: 'msg-123',
			content: '<script>alert("xss")</script>Hello World',
			metadata: {
				timestamp: '2025-09-27T12:00:00Z',
				userInput: '<img src=x onerror=alert(1)>',
				safe: 'keep-this',
			},
		};

		logInfo('Testing recursive sanitization without mutation', 'A2A-Sanitization');

		const sanitized = recursiveSanitize(testData, {
			safeFields: ['id', 'timestamp', 'safe'],
			enableLogging: true,
		});

		// Safe fields preserved
		expect(sanitized).toMatchObject({
			id: 'msg-123',
			metadata: expect.objectContaining({
				timestamp: '2025-09-27T12:00:00Z',
				safe: 'keep-this',
			}),
		});

		// Unsafe fields sanitized
		expect((sanitized as any).content).not.toContain('<script>');
		expect((sanitized as any).metadata.userInput).not.toContain('<img');

		// Original object unchanged (no mutation)
		expect(testData.content).toContain('<script>');
	});

	it('handles nested arrays and objects correctly', () => {
		const nested = {
			items: [
				{ value: '<script>bad</script>', safe: 'preserve' },
				{ value: 'normal text', safe: 'also-preserve' },
			],
		};

		const result = recursiveSanitize(nested, { safeFields: ['safe'], enableLogging: false });

		expect((result as any).items[0].safe).toBe('preserve');
		expect((result as any).items[1].safe).toBe('also-preserve');
		expect((result as any).items[0].value).not.toContain('<script>');
	});

	it('sanitizes individual fields with brAInwav branding', () => {
		const dangerous = '<script>alert("brAInwav hack")</script>data';
		const clean = sanitizeField(dangerous, 'testField');

		expect(clean).not.toContain('<script>');
		expect(clean).toContain('data');

		logInfo('Field sanitization complete', 'brAInwav-A2A');
	});
});

/**
 * Phase 7 - A2A Recursive Sanitization Tests
 * Tests sanitization utilities with brAInwav branding
 */

describe('Phase 7 - A2A Recursive Sanitization Tests', () => {
	let config: any;

	beforeEach(() => {
		config = createSanitizationConfig([
			'timestamp',
			'correlationId',
			'version',
			'brAInwavMetadata',
		]);
	});

	describe('Recursive Sanitization Without Mutation', () => {
		it('should sanitize nested malicious content without mutating safe fields', () => {
			const originalData = {
				user: {
					name: "admin'; DROP TABLE users; --",
					brAInwavMetadata: "'; DROP TABLE metadata; --", // This should NOT be sanitized
					profile: {
						bio: '<script>steal_cookies()</script>Bio content',
						timestamp: '<script>alert("xss")</script>', // This should NOT be sanitized
						settings: {
							theme: "dark'; DELETE FROM settings; --",
							correlationId: 'javascript:malicious()', // This should NOT be sanitized
						},
					},
				},
				version: '<iframe src="evil.com"></iframe>1.0.0', // This should NOT be sanitized
			};

			const envelope = createEnvelope({
				type: 'user.update',
				source: 'https://brAInwav.cortex-os/user-service',
				data: originalData,
			});

			// Apply sanitization
			const sanitized = recursiveSanitize(envelope.data, config) as typeof originalData;

			// Verify malicious content was sanitized
			expect(sanitized.user.name).not.toContain('DROP TABLE');
			expect(sanitized.user.name).not.toContain('--');
			expect(sanitized.user.profile.bio).not.toContain('<script>');
			expect(sanitized.user.profile.settings.theme).not.toContain('DELETE FROM');

			// Verify safe fields were NOT sanitized (preserved original values)
			expect(sanitized.user.brAInwavMetadata).toBe("'; DROP TABLE metadata; --");
			expect(sanitized.user.profile.timestamp).toBe('<script>alert("xss")</script>');
			expect(sanitized.user.profile.settings.correlationId).toBe('javascript:malicious()');
			expect(sanitized.version).toBe('<iframe src="evil.com"></iframe>1.0.0');

			// Verify original object was not mutated
			expect(originalData.user.name).toBe("admin'; DROP TABLE users; --");
			expect(originalData.user.profile.bio).toBe('<script>steal_cookies()</script>Bio content');
		});

		it('should handle deeply nested objects with mixed safe/unsafe fields', () => {
			const complexData = {
				level1: {
					malicious: "'; DROP TABLE level1; --",
					timestamp: "'; DROP TABLE timestamps; --", // Safe field
					level2: {
						attack: '<script>window.location="evil.com"</script>',
						correlationId: '<iframe src="malware.com"></iframe>', // Safe field
						level3: {
							payload: 'javascript:void(document.cookie="stolen")',
							brAInwavMetadata: 'SELECT * FROM secrets', // Safe field
						},
					},
				},
			};

			const sanitized = recursiveSanitize(complexData, config) as typeof complexData;

			// Check sanitization happened
			expect(sanitized.level1.malicious).not.toContain('DROP TABLE');
			expect(sanitized.level1.level2.attack).not.toContain('<script>');
			expect(sanitized.level1.level2.level3.payload).not.toContain('javascript:');

			// Check safe fields preserved
			expect(sanitized.level1.timestamp).toBe("'; DROP TABLE timestamps; --");
			expect(sanitized.level1.level2.correlationId).toBe('<iframe src="malware.com"></iframe>');
			expect(sanitized.level1.level2.level3.brAInwavMetadata).toBe('SELECT * FROM secrets');
		});

		it('should maintain object structure and types', () => {
			const originalData = {
				string: "'; DROP TABLE test; --",
				number: 42,
				boolean: true,
				null: null,
				undefined: undefined,
				timestamp: "'; DROP TABLE timestamps; --", // Safe field
				nested: {
					malicious: '<script>alert("test")</script>',
					correlationId: '<script>preserved</script>', // Safe field
					array: [1, "'; DELETE FROM arrays; --", true],
				},
			};

			const sanitized = recursiveSanitize(originalData, config) as typeof originalData;

			// Check types preserved
			expect(typeof sanitized.string).toBe('string');
			expect(typeof sanitized.number).toBe('number');
			expect(typeof sanitized.boolean).toBe('boolean');
			expect(sanitized.null).toBeNull();
			expect(sanitized.undefined).toBeUndefined();

			// Check structure preserved
			expect(Array.isArray(sanitized.nested.array)).toBe(true);
			expect(sanitized.nested.array).toHaveLength(3);

			// Check sanitization worked
			expect(sanitized.string).not.toContain('DROP TABLE');
			expect(sanitized.nested.malicious).not.toContain('<script>');
			expect(sanitized.nested.array[1]).not.toContain('DELETE FROM');

			// Check safe field preserved
			expect(sanitized.timestamp).toBe("'; DROP TABLE timestamps; --");
			expect(sanitized.nested.correlationId).toBe('<script>preserved</script>');
		});
	});

	describe('Integration with A2A Envelope', () => {
		it('should work with A2A envelope structure maintaining trace context', () => {
			const maliciousEnvelope = createEnvelope({
				type: 'data.process',
				source: 'https://brAInwav.cortex-os/malicious-service',
				data: {
					query: "'; DROP TABLE important_data; --",
					content: '<script>window.location="attacker.com"</script>',
					correlationId: "'; DROP TABLE correlations; --", // Safe field
					metadata: {
						trace: 'javascript:malicious()',
						timestamp: '<iframe src="evil.com"></iframe>2024-01-01', // Safe field
					},
				},
				correlationId: 'test-correlation',
				traceparent: '00-test-trace-01',
			});

			const sanitizedData = recursiveSanitize(maliciousEnvelope.data, config);

			// Verify envelope structure preserved
			expect(maliciousEnvelope.type).toBe('data.process');
			expect(maliciousEnvelope.source).toBe('https://brAInwav.cortex-os/malicious-service');
			expect(maliciousEnvelope.correlationId).toBe('test-correlation');
			expect(maliciousEnvelope.traceparent).toBe('00-test-trace-01');

			// Verify data sanitization
			const sanitized = sanitizedData as any;
			expect(sanitized.query).not.toContain('DROP TABLE');
			expect(sanitized.content).not.toContain('<script>');
			expect(sanitized.metadata.trace).not.toContain('javascript:');

			// Verify safe fields preserved
			expect(sanitized.correlationId).toBe("'; DROP TABLE correlations; --");
			expect(sanitized.metadata.timestamp).toBe('<iframe src="evil.com"></iframe>2024-01-01');
		});
	});
});
