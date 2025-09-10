import { describe, expect, it } from 'vitest';
import { type Embedder, RAGPipeline } from '../src/index';
import { memoryStore } from '../src/store/memory';

describe('RAGPipeline.ingest', () => {
	it('throws when embeddings length mismatches chunks', async () => {
		const badEmbedder: Embedder = {
			async embed(texts) {
				return texts.slice(1).map((t) => [t.length]);
			},
		};

		const pipeline = new RAGPipeline({
			embedder: badEmbedder,
			store: memoryStore(),
		});
		const chunks = [
			{ id: '1', text: 'a' },
			{ id: '2', text: 'b' },
		];

		await expect(pipeline.ingest(chunks)).rejects.toThrow(
			/Embedding count \(1\) does not match chunk count \(2\)/,
		);
	});
});
