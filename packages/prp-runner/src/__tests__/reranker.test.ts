/**
 * @file reranker.test.ts
 * @description Unit tests for reranker utilities
 */

import { pipeline } from '@xenova/transformers';
import { describe, expect, it, vi } from 'vitest';
import { createRerankerState, rerank } from '../lib/reranker/index.js';

vi.mock('@xenova/transformers', () => ({
	pipeline: vi.fn(),
}));

describe('Reranker', () => {
	it('orders documents by score using transformers', async () => {
		const inference = vi
			.fn()
			.mockResolvedValue([
				[{ score: 0.1 }],
				[{ score: 0.9 }],
				[{ score: 0.5 }],
			]);
		(pipeline as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(inference);

		const state = createRerankerState('transformers');
		const docs = ['a', 'b', 'c'];
		const results = await rerank(state, 'q', docs);
		expect(results.map((r) => r.text)).toEqual(['b', 'c', 'a']);
	});

	it('throws for unknown provider', async () => {
		// @ts-expect-error testing invalid provider
		expect(() => createRerankerState('unknown')).toThrow(
			/Unsupported reranker provider/,
		);

		const badState = { config: { provider: 'unknown' } } as any;
		await expect(rerank(badState, 'q', ['a'])).rejects.toThrow(
			/Reranking not implemented/,
		);
	});
});
