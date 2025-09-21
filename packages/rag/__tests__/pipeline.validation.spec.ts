import { describe, expect, it } from 'vitest';
import type { Chunk, Embedder, Store } from '../src/lib/index.js';
import { RAGPipeline } from '../src/rag-pipeline.js';

class FixedDimEmbedder implements Embedder {
	constructor(private dim: number) {}
	async embed(queries: string[]): Promise<number[][]> {
		return queries.map(() => Array.from({ length: this.dim }, (_, i) => i * 0.001));
	}
}

class NoopStore implements Store {
	async upsert(_chunks: Chunk[]): Promise<void> {
		/* noop */
	}
	async query(_embedding: number[], k = 5): Promise<Array<Chunk & { score?: number }>> {
		const _touch = _embedding; // keep reference to satisfy unused
		const _touch2 = k;
		return [];
	}
}

describe('RAGPipeline security validation wiring', () => {
	it('rejects content exceeding max size on ingestText', async () => {
		const pipeline = new RAGPipeline({
			embedder: new FixedDimEmbedder(768),
			store: new NoopStore(),
			security: { maxContentChars: 10, allowedEmbeddingDims: [768] },
		});
		await expect(pipeline.ingestText('src', 'x'.repeat(11))).rejects.toThrow('exceeds');
	});

	it('rejects invalid embedding dimension from embedder', async () => {
		const badEmbedder = new FixedDimEmbedder(123); // not allowed
		const pipeline = new RAGPipeline({
			embedder: badEmbedder,
			store: new NoopStore(),
			security: { allowedEmbeddingDims: [768, 1536], maxContentChars: 1000 },
		});
		const chunks: Chunk[] = [{ id: 'c1', source: 's', text: 'ok' }];
		await expect(pipeline.ingest(chunks)).rejects.toThrow('Invalid embedding dimension');
	});

	it('validates query content size and embedding dim during retrieve', async () => {
		const pipeline = new RAGPipeline({
			embedder: new FixedDimEmbedder(768),
			store: new NoopStore(),
			security: { allowedEmbeddingDims: [768], maxContentChars: 5 },
		});

		await expect(pipeline.retrieve('x'.repeat(6))).rejects.toThrow('exceeds');

		const ok = await pipeline.retrieve('short');
		expect(ok).toBeDefined();
	});
});
