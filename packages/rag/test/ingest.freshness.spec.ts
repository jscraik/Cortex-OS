import { describe, expect, it } from 'vitest';
import { ingestText } from '../src/pipeline/ingest.js';
import { memoryStore } from '../src/store/memory.js';

class StubEmbedder {
	async embed(texts: string[]): Promise<number[][]> {
		// deterministic 2D vector based on length
		return texts.map((t) => [t.length % 7, (t.length * 3) % 11]);
	}
}

describe('ingestText freshness metadata', () => {
	it('ingests successfully and returns retrievable chunks', async () => {
		const store = memoryStore();
		const embedder = new StubEmbedder();
		await ingestText({
			source: 'doc.md',
			text: 'hello world\nthis is a test',
			embedder: embedder as any,
			store,
			chunkSize: 5,
			overlap: 0,
		});
		// Query using an arbitrary vector of correct length
		const hits = await store.query([1, 1], 10);
		expect(hits.length).toBeGreaterThan(0);
	});
});
