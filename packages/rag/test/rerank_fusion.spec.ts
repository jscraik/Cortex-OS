import { describe, expect, it } from 'vitest';
import { fusionRerank } from '../src/pipeline';

describe('fusionRerank', () => {
	it('ranks using query embedding', () => {
		const docs = [
			{ id: 'a', text: 'doc a', emb: [1, 0] },
			{ id: 'b', text: 'doc b', emb: [0, 1] },
		];
		const bm25 = new Map([
			['a', 0.1],
			['b', 0.2],
		]);
		const queryEmb = [1, 0];
		const out = fusionRerank(queryEmb, docs, bm25, 0.5);
		expect(out[0].id).toBe('a');
	});

	it('returns empty array for empty docs', () => {
		const queryEmb = [1, 0];
		const out = fusionRerank(queryEmb, [], new Map());
		expect(out).toEqual([]);
	});

	it('throws for invalid query embedding', () => {
		expect(() => fusionRerank([], [], new Map())).toThrow();
	});

	it('throws for mismatched embedding dims', () => {
		const queryEmb = [1, 0];
		const docs = [
			{ id: 'a', text: 'doc a', emb: [1, 0, 0] },
			{ id: 'b', text: 'doc b', emb: [0, 1] },
		];
		const bm25 = new Map([
			['a', 0.4],
			['b', 0.6],
		]);
		expect(() => fusionRerank(queryEmb, docs, bm25)).toThrow();
	});
});
