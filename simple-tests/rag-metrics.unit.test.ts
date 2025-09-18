import {
	dcg,
	ndcgAtK,
	precisionAtK,
	recallAtK,
} from '@cortex-os/rag/eval/metrics';
import { describe, expect, it } from 'vitest';

describe('RAG metrics', () => {
	it('computes DCG and NDCG for simple binary relevance', () => {
		const rel = [1, 0];
		const ideal = [1, 0];
		expect(dcg(rel)).toBeCloseTo(dcg(ideal), 6);
		expect(ndcgAtK(rel, 2, 1)).toBe(1);
	});

	it('precision/recall@k basics', () => {
		const rel = [1, 0, 1, 0];
		expect(precisionAtK(rel, 2)).toBeCloseTo(0.5, 6);
		expect(recallAtK(rel, 2, 2)).toBeCloseTo(0.5, 6);
		expect(recallAtK(rel, 4, 2)).toBeCloseTo(1, 6);
	});
});
