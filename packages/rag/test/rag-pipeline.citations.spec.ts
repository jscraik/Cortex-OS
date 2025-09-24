import { describe, expect, it } from 'vitest';
import { RAGPipeline } from '../src/rag-pipeline.js';
import { memoryStore } from '../src/store/memory.js';

class StubEmbedder {
	async embed(texts: string[]): Promise<number[][]> {
		// simple deterministic embeddings of length 3
		return texts.map((t) => [t.length % 5, 1, 0]);
	}
}

describe('RAGPipeline.retrieve returns citation bundles', () => {
	it('returns text plus citations metadata', async () => {
		const E = new StubEmbedder() as any;
		const S = memoryStore();
		const pipeline = new RAGPipeline({ embedder: E, store: S });

		await pipeline.ingest([
			{ id: 'c1', text: 'alpha content', source: 'doc1', updatedAt: 10 },
			{ id: 'c2', text: 'beta content', source: 'doc2', updatedAt: 20 },
		]);

		const bundle = await pipeline.retrieve('alpha');
		expect(typeof bundle.text).toBe('string');
		expect(Array.isArray(bundle.citations)).toBe(true);
		expect(bundle.citations[0]).toHaveProperty('id');
		expect(bundle.citations[0]).toHaveProperty('source');
	});
});
