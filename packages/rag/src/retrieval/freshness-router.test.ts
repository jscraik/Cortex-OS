import { describe, expect, it } from 'vitest';
import type { Chunk } from '../lib/types.js';
import { routeByFreshness } from './freshness-router.js';

describe('routeByFreshness', () => {
	const now = Date.now();
	const oneHourAgo = now - 60 * 60 * 1000;
	const oneDayAgo = now - 24 * 60 * 60 * 1000;

	const mockChunks: Array<Chunk & { score?: number }> = [
		{
			id: 'chunk-1',
			text: 'Old high-score chunk',
			score: 0.9,
			updatedAt: oneDayAgo,
		},
		{
			id: 'chunk-2',
			text: 'Fresh medium-score chunk',
			score: 0.85,
			updatedAt: now,
		},
		{
			id: 'chunk-3',
			text: 'Fresh high-score chunk',
			score: 0.88,
			updatedAt: oneHourAgo,
		},
		{
			id: 'chunk-4',
			text: 'Very fresh low-score chunk',
			score: 0.5,
			updatedAt: now,
		},
	];

	describe('score-based routing', () => {
		it('should prioritize score when difference exceeds epsilon', () => {
			const result = routeByFreshness(mockChunks, { epsilon: 0.02 });

			// chunk-1 (0.9) should be first due to high score
			expect(result[0].id).toBe('chunk-1');
			expect(result[0].score).toBe(0.9);
		});

		it('should use default epsilon of 0.02 when not specified', () => {
			const result = routeByFreshness(mockChunks);

			// Should behave the same as specifying epsilon: 0.02
			expect(result[0].id).toBe('chunk-1');
		});
	});

	describe('freshness-based routing', () => {
		it('should prioritize freshness when scores are within epsilon', () => {
			// Use larger epsilon so chunks 2 and 3 are considered tied (0.85 vs 0.88)
			const result = routeByFreshness(mockChunks, { epsilon: 0.05 });

			// Among similar scores, fresher should come first
			const chunk2Index = result.findIndex((c) => c.id === 'chunk-2');
			const chunk3Index = result.findIndex((c) => c.id === 'chunk-3');

			expect(chunk2Index).toBeLessThan(chunk3Index);
		});

		it('should handle missing updatedAt timestamps', () => {
			const chunksWithMissingTimestamps = [
				{ id: 'chunk-a', text: 'No timestamp', score: 0.8 },
				{ id: 'chunk-b', text: 'With timestamp', score: 0.8, updatedAt: now },
			];

			const result = routeByFreshness(chunksWithMissingTimestamps, {
				epsilon: 0.1,
			});

			// Chunk with timestamp should come first
			expect(result[0].id).toBe('chunk-b');
		});
	});

	describe('configurable thresholds', () => {
		it('should respect custom epsilon values', () => {
			const tightEpsilon = routeByFreshness(mockChunks, { epsilon: 0.01 });
			const looseEpsilon = routeByFreshness(mockChunks, { epsilon: 0.1 });

			// With tight epsilon, score differences matter more
			// With loose epsilon, freshness matters more
			expect(tightEpsilon).not.toEqual(looseEpsilon);
		});

		it('should handle epsilon of 0 (strict score ordering)', () => {
			const result = routeByFreshness(mockChunks, { epsilon: 0 });

			// Should be strictly ordered by score
			for (let i = 1; i < result.length; i++) {
				const prevScore = result[i - 1].score ?? 0;
				const currScore = result[i].score ?? 0;
				expect(prevScore).toBeGreaterThanOrEqual(currScore);
			}
		});
	});

	describe('edge cases', () => {
		it('should handle empty arrays', () => {
			const result = routeByFreshness([]);
			expect(result).toHaveLength(0);
		});

		it('should handle single item arrays', () => {
			const single = [mockChunks[0]];
			const result = routeByFreshness(single);
			expect(result).toEqual(single);
		});

		it('should maintain original order for identical items', () => {
			const identical = [
				{ id: 'chunk-a', text: 'Same', score: 0.5, updatedAt: now },
				{ id: 'chunk-b', text: 'Same', score: 0.5, updatedAt: now },
				{ id: 'chunk-c', text: 'Same', score: 0.5, updatedAt: now },
			];

			const result = routeByFreshness(identical, { epsilon: 0.1 });

			// Should maintain original order (stable sort)
			expect(result.map((c) => c.id)).toEqual(['chunk-a', 'chunk-b', 'chunk-c']);
		});
	});

	describe('cache vs live routing strategies', () => {
		it('should simulate cache preference with high freshness weight', () => {
			// Simulate a scenario where we want to prefer fresh content
			const cacheThreshold = now - 30 * 60 * 1000; // 30 minutes ago

			const chunks = mockChunks.map((chunk) => ({
				...chunk,
				isFresh: (chunk.updatedAt ?? 0) > cacheThreshold,
			}));

			const result = routeByFreshness(chunks, { epsilon: 0.1 });

			// Fresh chunks should generally rank higher
			const freshIndices = result
				.map((chunk, index) => ({ chunk, index }))
				.filter(({ chunk }) => (chunk as any).isFresh)
				.map(({ index }) => index);

			const avgFreshIndex = freshIndices.reduce((a, b) => a + b, 0) / freshIndices.length;
			expect(avgFreshIndex).toBeLessThan(result.length / 2);
		});
	});
});
