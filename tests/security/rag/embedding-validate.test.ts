import { describe, expect, it } from 'vitest';
import { getSingleDim, validateEmbedding } from '../../apps/cortex-os/brain/rag/src/vectorStore';

describe('Embedding validation', () => {
	const dim = getSingleDim();
	it('accepts correct length numeric arrays', () => {
		const vec = Array.from({ length: dim }, (_, i) => i * 0.001);
		expect(validateEmbedding(vec)).toHaveLength(dim);
	});
	it('rejects wrong length', () => {
		const vec = Array.from({ length: dim - 1 }, () => 0);
		expect(() => validateEmbedding(vec)).toThrow(/embedding_length_mismatch/);
	});
	it('rejects non-finite', () => {
		const vec = Array.from({ length: dim }, () => 0);
		vec[10] = Number.NaN as any;
		expect(() => validateEmbedding(vec as any)).toThrow(/embedding_non_finite/);
	});
});
