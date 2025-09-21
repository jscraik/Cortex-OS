import { describe, expect, it } from 'vitest';
import type { Chunk, Embedder, Store } from '../src/lib/index.js';
import { ingestHierarchical } from '../src/pipeline/ingest-hierarchical.js';
import { RAGPipeline } from '../src/rag-pipeline.js';

class StaticEmbedder implements Embedder {
	constructor(private readonly vec: number[]) {}
	async embed(queries: string[]): Promise<number[][]> {
		return queries.map(() => this.vec);
	}
}

function createMemoryStore(): Store {
	const items: Array<Chunk & { embedding?: number[] }> = [];
	return {
		async upsert(chunks: Chunk[]) {
			for (const c of chunks) {
				const i = items.findIndex((x) => x.id === c.id);
				if (i >= 0) items[i] = { ...items[i], ...c };
				else items.push(c);
			}
		},
		async query(embedding: number[], k = 5) {
			// Simple cosine-like scoring assuming same length
			return items
				.filter((x) => Array.isArray(x.embedding))
				.map((x) => {
					const a = embedding,
						b = x.embedding as number[];
					let dot = 0,
						na = 0,
						nb = 0;
					for (let i = 0; i < a.length; i++) {
						dot += a[i] * b[i];
						na += a[i] * a[i];
						nb += b[i] * b[i];
					}
					const score = dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
					return { ...x, score };
				})
				.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
				.slice(0, k);
		},
	};
}

describe('Hierarchical ingest + pipeline', () => {
	it('ingests hierarchical chunks and expands context on retrieval', async () => {
		const E = new StaticEmbedder([1, 0, 0, 0]);
		const S = createMemoryStore();
		const text = `# Title\n\nSection A\n\nPara one.\n\nPara two.`;

		await ingestHierarchical({ source: 'docA', text, embedder: E, store: S });

		const pipeline = new RAGPipeline({
			embedder: E,
			store: S,
			retrieval: { hierarchical: { expandContext: true, maxLevels: 2 } },
		});
		const bundle = await pipeline.retrieve('q', 1);
		expect(bundle.text).toMatch(/Title|Section/);
	});
});
