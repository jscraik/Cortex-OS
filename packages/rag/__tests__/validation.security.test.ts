import { describe, expect, it } from 'vitest';
import {
	sanitizeMetadata,
	validateContentSize,
	validateEmbeddingDim,
} from '../src/lib/validation.js';

describe('security validation', () => {
	it('rejects invalid embedding dimensions and non-finite values', () => {
		expect(() => validateEmbeddingDim([0.1, 0.2], [768, 1536])).toThrow(
			'Invalid embedding dimension',
		);
		expect(() => validateEmbeddingDim([0.1, Number.NaN], [2])).toThrow('non-finite');
	});

	it('enforces content size limits', () => {
		expect(() => validateContentSize('ok', 10)).not.toThrow();
		expect(() => validateContentSize('x'.repeat(11), 10)).toThrow('exceeds');
		expect(() => validateContentSize(123 as unknown as string, 10)).toThrow(
			'Content must be a string',
		);
	});

	it('sanitizes metadata and prevents prototype pollution', () => {
		const safeObj = sanitizeMetadata({ a: 1, b: ['x', 2, { c: true }] });
		// Type narrowing for test
		expect((safeObj as Record<string, unknown>).a).toBe(1);

		// Forbidden magic keys
		expect(() =>
			sanitizeMetadata({ __proto__: { hacked: true } } as unknown as Record<string, unknown>),
		).toThrow('forbidden key');

		// Non-plain objects rejected
		class X {
			x = 1;
		}
		expect(() => sanitizeMetadata(new X() as unknown as Record<string, unknown>)).toThrow(
			'non-plain object',
		);

		// Exotic types rejected
		const fnVal = (() => {
			/* noop */
		}) as unknown as Record<string, unknown>;
		expect(() => sanitizeMetadata(fnVal)).toThrow('Invalid metadata value type');
	});
});
