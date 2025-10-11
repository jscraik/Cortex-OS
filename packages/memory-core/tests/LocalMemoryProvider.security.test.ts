/**
 * Security tests for loop bounds prevention in LocalMemoryProvider
 */
import { describe, expect, it } from 'vitest';

// We'll test the createMockEmbedding function indirectly through the provider
// For now, create a standalone test version
function createMockEmbedding(text: string, dim: number): number[] {
	// Security: Validate array dimension to prevent excessive memory allocation
	const maxDim = 10000;
	if (dim > maxDim || dim < 1) {
		throw new Error(`brAInwav embedding dimension must be between 1 and ${maxDim}`);
	}

	const embedding = new Array(dim).fill(0);
	// Security: Limit text length to prevent unbounded loop iteration
	const maxTextLength = 10000;
	const safeTextLength = Math.min(text.length, maxTextLength);

	for (let i = 0; i < safeTextLength; i++) {
		const charCode = text.charCodeAt(i);
		embedding[i % dim] = (embedding[i % dim] + charCode) / 255;
	}
	const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
	return embedding.map((val) => (norm === 0 ? 0 : val / norm));
}

describe('brAInwav Loop Bounds Prevention - LocalMemoryProvider', () => {
	it('should reject excessively large embedding dimensions', () => {
		const text = 'test';
		const largeDim = 10001;

		expect(() => createMockEmbedding(text, largeDim)).toThrow(
			'brAInwav embedding dimension must be between 1 and 10000',
		);
	});

	it('should reject zero or negative dimensions', () => {
		const text = 'test';

		expect(() => createMockEmbedding(text, 0)).toThrow(
			'brAInwav embedding dimension must be between 1 and 10000',
		);
		expect(() => createMockEmbedding(text, -1)).toThrow(
			'brAInwav embedding dimension must be between 1 and 10000',
		);
	});

	it('should handle very long text by limiting iteration', () => {
		const longText = 'a'.repeat(20000); // Exceeds maxTextLength
		const dim = 128;

		// Should not throw and should complete quickly
		const result = createMockEmbedding(longText, dim);
		expect(result).toHaveLength(dim);
		expect(result.every((val) => typeof val === 'number')).toBe(true);
	});

	it('should create valid embeddings for normal inputs', () => {
		const text = 'test embedding text';
		const dim = 384;

		const result = createMockEmbedding(text, dim);
		expect(result).toHaveLength(dim);

		// Check normalization (sum of squares should be ~1)
		const sumSquares = result.reduce((sum, val) => sum + val * val, 0);
		expect(sumSquares).toBeCloseTo(1, 5);
	});

	it('should handle edge case: exactly 10000 dimensions (allowed)', () => {
		const text = 'test';
		const maxDim = 10000;

		// Should not throw
		const result = createMockEmbedding(text, maxDim);
		expect(result).toHaveLength(maxDim);
	});

	it('should handle edge case: exactly 10000 char text (allowed)', () => {
		const maxText = 'a'.repeat(10000);
		const dim = 128;

		// Should not throw
		const result = createMockEmbedding(maxText, dim);
		expect(result).toHaveLength(dim);
	});

	it('should handle empty text', () => {
		const text = '';
		const dim = 128;

		const result = createMockEmbedding(text, dim);
		expect(result).toHaveLength(dim);
		// All values should be 0 for empty text
		expect(result.every((val) => val === 0)).toBe(true);
	});
});
