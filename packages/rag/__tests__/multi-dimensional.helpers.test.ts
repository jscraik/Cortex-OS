import { describe, expect, it } from 'vitest';
import {
	ALLOWED_DIMS,
	detectEmbeddingDimension,
	getAllowedDimensions,
	normalizeEmbedding,
	selectEmbeddingDimensionForModel,
} from '../src/embed/multi-dimensional.js';

describe('multi-dimensional helpers', () => {
	it('exposes allowed dimensions', () => {
		expect(getAllowedDimensions().sort()).toEqual(ALLOWED_DIMS.sort());
	});

	it('detects valid embedding dimensions and rejects invalid', () => {
		expect(detectEmbeddingDimension(new Array(384).fill(0))).toBe(384);
		expect(detectEmbeddingDimension(new Float32Array(1536))).toBe(1536);
		expect(() => detectEmbeddingDimension([1, 2, 3])).toThrowError(/invalid embedding dimension/i);
	});

	it('selects dimension from model string or env override', () => {
		expect(selectEmbeddingDimensionForModel('text-embed-1536-v3')).toBe(1536);
		expect(selectEmbeddingDimensionForModel('awesome-embed-768')).toBe(768);
		const prev = process.env.RAG_DEFAULT_EMBED_DIM;
		process.env.RAG_DEFAULT_EMBED_DIM = '1024';
		expect(selectEmbeddingDimensionForModel('mystery-model')).toBe(1024);
		process.env.RAG_DEFAULT_EMBED_DIM = prev;
	});

	it('normalizes embeddings to unit length', () => {
		const v = normalizeEmbedding([3, 4]);
		const mag = Math.hypot(v[0], v[1]);
		expect(Math.abs(mag - 1)).toBeLessThan(1e-6);
	});
});
