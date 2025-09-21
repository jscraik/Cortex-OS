import { describe, expect, it } from 'vitest';
import type { Chunk, Embedder, Store } from '../src/lib/index.js';
import { RAGPipeline } from '../src/rag-pipeline.js';
import { HierarchicalStore } from '../src/store/hierarchical-store.js';

class StaticEmbedder implements Embedder {
	constructor(private readonly vec: number[]) {}
	async embed(queries: string[]): Promise<number[][]> {
		return queries.map(() => this.vec);
	}
}

function cosine(a: number[], b: number[]) {
	let dot = 0,
		na = 0,
		nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
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
			return items
				.filter((x) => Array.isArray(x.embedding))
				.map((x) => ({ ...x, score: cosine(embedding, x.embedding as number[]) }))
				.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
				.slice(0, k);
		},
	};
}

describe('RAGPipeline + HierarchicalStore', () => {
	const emb = new StaticEmbedder([1, 0, 0, 0]);

	function makeChunks(): Chunk[] {
		return [
			{ id: 'doc', text: 'DocText', metadata: { level: 'document', heading: 'DocTitle' } },
			{
				id: 'sec',
				text: 'SecText',
				metadata: { level: 'section', parentId: 'doc', heading: 'Sec' },
			},
			{ id: 'p', text: 'Para', metadata: { level: 'paragraph', parentId: 'sec' } },
		];
	}

	it('includes hierarchical context when enabled', async () => {
		const base = createMemoryStore();
		const store = new HierarchicalStore(base, { defaultExpandContext: true, defaultMaxLevels: 2 });
		const pipeline = new RAGPipeline({
			embedder: emb,
			store,
			retrieval: { hierarchical: { expandContext: true, maxLevels: 2 } },
		});

		// Ingest with embeddings
		const [d, s, p] = makeChunks();
		// Query vector [1,0,0,0] => maximize paragraph, minimize doc
		const embDoc = [0, 1, 0, 0];
		const embSec = [0.1, 0.9, 0, 0];
		const embPar = [0.9, 0.1, 0, 0];
		await store.upsert([
			{ ...d, embedding: embDoc },
			{ ...s, embedding: embSec },
			{ ...p, embedding: embPar },
		]);
		// Perform retrieval through pipeline
		const bundle = await pipeline.retrieve('q', 1);
		expect(bundle.text).toContain('DocTitle');
		expect(bundle.text).toContain('DocText');
		expect(bundle.text).toContain('Sec');
		expect(bundle.text).toContain('SecText');
	});

	it('omits hierarchical context when disabled', async () => {
		const base = createMemoryStore();
		const pipeline = new RAGPipeline({ embedder: emb, store: base });
		const [d, s, p] = makeChunks();
		const embDoc = [0, 1, 0, 0];
		const embSec = [0.1, 0.9, 0, 0];
		const embPar = [0.9, 0.1, 0, 0];
		await base.upsert([
			{ ...d, embedding: embDoc },
			{ ...s, embedding: embSec },
			{ ...p, embedding: embPar },
		]);
		const bundle = await pipeline.retrieve('q', 1);
		// With no context expansion, only the paragraph text should be present
		expect(bundle.text).toContain('Para');
		expect(bundle.text).not.toContain('DocTitle');
		expect(bundle.text).not.toContain('SecText');
	});
});
