import { describe, expect, it } from 'vitest';
import {
	MAX_CONTENT_SIZE,
	sanitizeMetadata,
	sanitizeTextInputs,
	validateContentSize,
	validateEmbeddingDimensions,
} from '../src/lib/security.js';

describe('security: sanitizeTextInputs', () => {
	it('accepts normal inputs and enforces size', () => {
		expect(sanitizeTextInputs(['hello', 'world'])).toEqual(['hello', 'world']);
		expect(() => validateContentSize('a'.repeat(MAX_CONTENT_SIZE + 1))).toThrowError(
			/exceeds maximum size/i,
		);
	});

	it('rejects ASCII control characters (except tab/lf/cr)', () => {
		// 0x07 bell should be rejected
		expect(() => sanitizeTextInputs(['bad\x07'])).toThrowError(/invalid input/i);
		// allowed: tab, lf, cr
		expect(() => sanitizeTextInputs(['ok\tline1\nline2\r'])).not.toThrow();
	});

	it('rejects shell metacharacters and command substitution markers', () => {
		expect(() => sanitizeTextInputs(['rm -rf /; echo ok'])).toThrowError(/invalid input/i);
		expect(() => sanitizeTextInputs(['nested $(whoami)'])).toThrowError(/invalid input/i);
	});
});

describe('security: sanitizeMetadata', () => {
	it('allows plain objects and arrays', () => {
		const meta = { a: 1, b: { c: [1, 2, 3] } };
		expect(() => sanitizeMetadata(meta)).not.toThrow();
	});

	it('rejects prototype pollution attempts', () => {
		const polluted = JSON.parse('{"__proto__": {"polluted": true}}') as unknown;
		expect(() => sanitizeMetadata(polluted)).toThrowError(/prototype pollution/i);
	});

	it('rejects objects with non-plain prototypes', () => {
		class Foo {
			x = 1;
		}
		const obj = new Foo();
		// cast to unknown to satisfy sanitizer signature accepting unknown
		expect(() => sanitizeMetadata(obj as unknown)).toThrowError(/prototype pollution/i);
	});
});

describe('security: validateEmbeddingDimensions', () => {
	it('accepts allowed dimensions and rejects others', () => {
		expect(validateEmbeddingDimensions(new Array(384).fill(0))).toBe(true);
		expect(validateEmbeddingDimensions(new Array(768).fill(0))).toBe(true);
		expect(validateEmbeddingDimensions(new Array(1536).fill(0))).toBe(true);
		expect(() => validateEmbeddingDimensions([1, 2, 3])).toThrowError(/dimension/i);
	});
});
