import { describe, expect, it } from 'vitest';
import { CitationBundler } from './citation-bundler.js';
import type { Chunk } from './types.js';

describe('CitationBundler', () => {
	const mockChunks: Array<Chunk & { score?: number }> = [
		{
			id: 'chunk-1',
			text: 'Climate change is caused by greenhouse gases.',
			source: 'climate-doc-1',
			score: 0.9,
		},
		{
			id: 'chunk-2',
			text: 'Carbon dioxide levels have increased significantly.',
			source: 'climate-doc-2',
			score: 0.8,
		},
		{
			id: 'chunk-3',
			text: 'The Paris Agreement aims to limit warming.',
			source: 'climate-doc-3',
			score: 0.7,
		},
	];

	describe('basic bundling', () => {
		it('should bundle chunks into citations', () => {
			const bundler = new CitationBundler();
			const result = bundler.bundle(mockChunks);

			expect(result.text).toBe(mockChunks.map((c) => c.text).join('\n'));
			expect(result.citations).toHaveLength(3);
			expect(result.citations[0]).toMatchObject({
				id: 'chunk-1',
				source: 'climate-doc-1',
				text: 'Climate change is caused by greenhouse gases.',
				score: 0.9,
			});
		});

		it('should handle empty chunks with no evidence path', () => {
			const bundler = new CitationBundler();
			const result = bundler.bundle([]);

			expect(result.text).toBe('');
			expect(result.citations).toHaveLength(0);
			expect(result.noEvidence).toBe(true);
		});
	});

	describe('per-claim citations', () => {
		it('should attach citations to specific claims when provided', () => {
			const bundler = new CitationBundler();
			const claims = [
				'Greenhouse gases cause climate change',
				'CO2 levels are rising',
			];

			const result = bundler.bundleWithClaims(mockChunks, claims);

			expect(result.claimCitations).toBeDefined();
			expect(result.claimCitations).toHaveLength(2);
			if (result.claimCitations) {
				expect(result.claimCitations[0]).toMatchObject({
					claim: 'Greenhouse gases cause climate change',
					citations: expect.arrayContaining([
						expect.objectContaining({ id: 'chunk-1' }),
					]),
				});
			}
		});

		it('should mark claims without supporting evidence', () => {
			const bundler = new CitationBundler();
			const claims = [
				'Greenhouse gases cause climate change',
				'Solar panels are made of cheese', // No supporting evidence
			];

			const result = bundler.bundleWithClaims(mockChunks, claims);

			expect(result.claimCitations).toBeDefined();
			expect(result.claimCitations).toHaveLength(2);
			if (result.claimCitations) {
				expect(result.claimCitations[1]).toMatchObject({
					claim: 'Solar panels are made of cheese',
					citations: [],
					noEvidence: true,
				});
			}
		});
	});

	describe('deduplication and grouping', () => {
		it('should deduplicate citations from same source', () => {
			const duplicateChunks = [
				...mockChunks,
				{
					id: 'chunk-4',
					text: 'Another fact about greenhouse gases.',
					source: 'climate-doc-1', // Same source as chunk-1
					score: 0.6,
				},
			];

			const bundler = new CitationBundler();
			const result = bundler.bundleWithDeduplication(duplicateChunks);

			// Should group citations by source
			expect(result.sourceGroups).toBeDefined();
			if (result.sourceGroups) {
				expect(result.sourceGroups).toHaveProperty('climate-doc-1');
				expect(result.sourceGroups['climate-doc-1']).toHaveLength(2);
			}
		});

		it('should maintain deterministic ordering', () => {
			const bundler = new CitationBundler();
			const result1 = bundler.bundle(mockChunks);
			const result2 = bundler.bundle([...mockChunks]); // Copy to ensure same data

			expect(result1.citations).toEqual(result2.citations);
		});
	});
});
