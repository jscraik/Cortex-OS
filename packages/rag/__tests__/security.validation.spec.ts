import { describe, expect, it } from 'vitest';
import {
	sanitizeMetadata,
	validateContentSize,
	validateEmbeddingDim,
} from '../src/lib/validation.js';

describe('security validation', () => {
	it('rejects invalid embedding dimension and non-finite values', () => {
		expect(() => validateEmbeddingDim([1, 2, 3], [2, 4])).toThrow();
		expect(() => validateEmbeddingDim([1, Number.NaN], [2])).toThrow();
	});

	it('enforces max content size', () => {
		expect(() => validateContentSize('ok', 2)).not.toThrow();
		expect(() => validateContentSize('toolong', 3)).toThrow();
	});

	it('sanitizes metadata and rejects prototype pollution', () => {
		const clean = sanitizeMetadata<{ a: number; b: unknown[] }>({ a: 1, b: ['x', { y: true }] });
		expect(clean.a).toBe(1);

		expect(() =>
			sanitizeMetadata({ __proto__: {} } as unknown as Record<string, unknown>),
		).toThrow();
		class X {}
		expect(() => sanitizeMetadata(new X() as unknown as Record<string, unknown>)).toThrow();
	});
});
