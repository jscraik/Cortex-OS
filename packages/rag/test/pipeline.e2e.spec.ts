import { describe, expect, it } from 'vitest';
import { RAGPipeline } from '../src/rag-pipeline';
import { memoryStore } from '../src/store/memory';

class StubEmbedder {
	async embed(texts: string[]): Promise<number[][]> {
		// simple deterministic embeddings of length 4
		return texts.map((t) => [t.length % 7, 1, 2, 3]);
	}
}

describe('Pipeline E2E (ingest -> retrieve -> bundle)', () => {
	it('produces a citation bundle with sources', async () => {
		const E = new StubEmbedder() as any;
		const S = memoryStore();
		const pipeline = new RAGPipeline({
			embedder: E,
			store: S,
			freshnessEpsilon: 0.02,
		});

		await pipeline.ingest([
			{
				id: 'a',
				text: 'Cortex-OS overview',
				source: 'readme.md',
				updatedAt: Date.now() - 1000,
			},
			{
				id: 'b',
				text: 'Agent communication patterns',
				source: 'arch.md',
				updatedAt: Date.now(),
			},
		]);

		const out = await pipeline.retrieve('communication');
		expect(out.citations.length).toBeGreaterThan(0);
		expect(out.citations[0].text.length).toBeGreaterThan(0);
	});
});
