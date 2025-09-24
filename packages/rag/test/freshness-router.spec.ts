import { describe, expect, it } from 'vitest';
import { routeByFreshness } from '../src/retrieval/freshness-router.js';

describe('routeByFreshness', () => {
	it('keeps higher score first when difference > epsilon', () => {
		const chunks = [
			{ id: 'a', text: 'a', score: 0.9, updatedAt: 1 },
			{ id: 'b', text: 'b', score: 0.7, updatedAt: 999 },
		];
		const out = routeByFreshness(chunks, { epsilon: 0.01 });
		expect(out.map((c) => c.id)).toEqual(['a', 'b']);
	});

	it('ties by updatedAt when scores within epsilon', () => {
		const chunks = [
			{ id: 'old', text: 'o', score: 0.8, updatedAt: 1000 },
			{ id: 'new', text: 'n', score: 0.805, updatedAt: 2000 },
		];
		const out = routeByFreshness(chunks, { epsilon: 0.01 });
		// score diff = 0.005 <= 0.01 so newer wins
		expect(out.map((c) => c.id)).toEqual(['new', 'old']);
	});

	it('keeps order if both updatedAt missing and scores tied', () => {
		const chunks = [
			{ id: 'x', text: 'x', score: 0.5 },
			{ id: 'y', text: 'y', score: 0.5 },
		];
		const out = routeByFreshness(chunks, { epsilon: 0.02 });
		expect(out.map((c) => c.id)).toEqual(['x', 'y']);
	});
});
