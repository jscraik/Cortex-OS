import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chunk, Embedder, Store } from './lib/index.js';
import { RAGPipeline } from './rag-pipeline.js';

// Mock implementations
class MockEmbedder implements Embedder {
	async embed(queries: string[]): Promise<number[][]> {
		return queries.map(() => [0.1, 0.2, 0.3]);
	}
}

class MockStore implements Store {
	private chunks: Array<Chunk & { embedding?: number[]; score?: number }> = [
		{
			id: 'chunk-1',
			text: 'Climate change is caused by greenhouse gases like carbon dioxide.',
			source: 'climate-doc-1',
			embedding: [0.1, 0.2, 0.3],
			score: 0.9,
		},
		{
			id: 'chunk-2',
			text: 'Carbon dioxide levels have increased significantly since 1950.',
			source: 'climate-doc-2',
			embedding: [0.15, 0.25, 0.35],
			score: 0.8,
		},
	];

	async upsert(_chunks: Chunk[]): Promise<void> {
		// Mock implementation
	}

	async query(
		_embedding: number[],
		k = 5,
	): Promise<Array<Chunk & { score?: number }>> {
		return this.chunks.slice(0, k);
	}
}

describe('RAGPipeline enhanced features', () => {
	let pipeline: RAGPipeline;

	beforeEach(() => {
		pipeline = new RAGPipeline({
			embedder: new MockEmbedder(),
			store: new MockStore(),
		});
	});

	describe('basic retrieval with no evidence path', () => {
		it('should handle empty results with noEvidence flag', async () => {
			// Override store to return empty results
			const emptyStore = new MockStore();
			emptyStore.query = vi.fn().mockResolvedValue([]);

			const pipelineWithEmpty = new RAGPipeline({
				embedder: new MockEmbedder(),
				store: emptyStore,
			});

			const result = await pipelineWithEmpty.retrieve('test query');

			expect(result.noEvidence).toBe(true);
			expect(result.citations).toHaveLength(0);
			expect(result.text).toBe('');
		});

		it('should return citations for successful retrieval', async () => {
			const result = await pipeline.retrieve('climate change');

			expect(result.noEvidence).toBeUndefined();
			expect(result.citations).toHaveLength(2);
			expect(result.citations[0].text).toContain('greenhouse gases');
		});
	});

	describe('per-claim citations', () => {
		it('should attach citations to specific claims', async () => {
			const claims = [
				'Greenhouse gases cause climate change',
				'Carbon dioxide levels are rising',
			];

			const result = await pipeline.retrieveWithClaims(
				'climate science',
				claims,
			);

			expect(result.claimCitations).toHaveLength(2);
			expect(result.claimCitations?.[0]).toMatchObject({
				claim: 'Greenhouse gases cause climate change',
				citations: expect.arrayContaining([
					expect.objectContaining({
						text: expect.stringContaining('greenhouse gases'),
					}),
				]),
			});
		});

		it('should mark claims without evidence', async () => {
			const claims = [
				'Greenhouse gases cause climate change',
				'The moon is made of cheese', // No supporting evidence
			];

			const result = await pipeline.retrieveWithClaims(
				'climate science',
				claims,
			);

			expect(result.claimCitations?.[1]).toMatchObject({
				claim: 'The moon is made of cheese',
				citations: [],
				noEvidence: true,
			});
		});
	});

	describe('deduplication and grouping', () => {
		it('should group citations by source', async () => {
			const result = await pipeline.retrieveWithDeduplication('climate');

			expect(result.sourceGroups).toBeDefined();
			expect(result.sourceGroups?.['climate-doc-1']).toHaveLength(1);
			expect(result.sourceGroups?.['climate-doc-2']).toHaveLength(1);
		});

		it('should maintain score-based ordering within groups', async () => {
			const result = await pipeline.retrieveWithDeduplication('climate');

			Object.values(result.sourceGroups!).forEach((group) => {
				for (let i = 1; i < group.length; i++) {
					const prevScore = group[i - 1].score || 0;
					const currScore = group[i].score || 0;
					expect(prevScore).toBeGreaterThanOrEqual(currScore);
				}
			});
		});
	});
});
