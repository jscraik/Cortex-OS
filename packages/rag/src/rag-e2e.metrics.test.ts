import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chunk, Document, Embedder, Store } from './lib/index.js';
import { rerankDocs } from './lib/rerank-docs.js';
import type { Qwen3Reranker } from './pipeline/qwen3-reranker.js';
import { RAGPipeline } from './rag-pipeline.js';

// Mock observability to capture metrics
const obs = vi.hoisted(() => {
	return {
		generateRunId: vi.fn(() => 'RUN'),
		recordLatency: vi.fn(),
		recordOperation: vi.fn(),
	};
});

vi.mock('@cortex-os/observability', () => ({
	generateRunId: obs.generateRunId,
	recordLatency: obs.recordLatency,
	recordOperation: obs.recordOperation,
}));

class StubEmbedder implements Embedder {
	async embed(queries: string[]): Promise<number[][]> {
		// Deterministic 3-dim vectors for simplicity
		return queries.map((q, i) => [q.length % 3, (i + 1) % 3, 1]);
	}
}

// Simple in-memory store that uses provided embeddings
function inMemoryVectorStore(): Store {
	const items: Array<Chunk & { embedding?: number[] }> = [];
	return {
		async upsert(chunks: Chunk[]) {
			for (const c of chunks) {
				const i = items.findIndex((x) => x.id === c.id);
				if (i >= 0) items[i] = { ...c } as Chunk;
				else items.push({ ...c } as Chunk);
			}
		},
		async query(embedding: number[], k = 5) {
			const sim = (a: number[], b: number[]) => {
				if (!a || !b || a.length !== b.length) return 0;
				let dot = 0,
					na = 0,
					nb = 0;
				for (let i = 0; i < a.length; i++) {
					dot += a[i] * b[i];
					na += a[i] * a[i];
					nb += b[i] * b[i];
				}
				const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
				return dot / denom;
			};
			return items
				.filter((x) => Array.isArray(x.embedding))
				.map((x) => ({ ...x, score: sim(embedding, x.embedding as number[]) }))
				.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
				.slice(0, k);
		},
	};
}

describe('RAG e2e metrics smoke', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('emits metrics across ingest → retrieve → rerank with shared correlation', async () => {
		const pipeline = new RAGPipeline({
			embedder: new StubEmbedder(),
			store: inMemoryVectorStore(),
			security: { allowedEmbeddingDims: [3] },
		});

		const chunks: Chunk[] = [
			{ id: '1', text: 'alpha beta gamma', source: 's1' },
			{ id: '2', text: 'delta epsilon zeta', source: 's2' },
		];

		await pipeline.ingest(chunks);

		// Retrieve
		const bundle = await pipeline.retrieve('query terms', 2);
		expect(bundle.citations.length).toBeGreaterThanOrEqual(0);

		// Rerank with correlation id shared from pipeline run id (mock returns RUN)
		const docs: Document[] = bundle.citations.map((c) => ({ id: c.id, content: c.text ?? '' }));
		const stubReranker: Pick<Qwen3Reranker, 'rerank'> = {
			rerank: async (
				_q: string,
				arr: Array<{ id: string; text: string }>,
				topK: number,
			): Promise<Array<{ id: string; text: string; score?: number }>> =>
				arr.slice(0, topK).map((d, i) => ({ id: d.id, text: d.text, score: 1 - i * 0.1 })),
		};
		const reranked = await rerankDocs(
			stubReranker as unknown as Qwen3Reranker,
			'query terms',
			docs,
			2,
			{ correlationId: 'RUN' },
		);
		expect(reranked.length).toBeGreaterThan(0);

		// Validate that metrics were emitted in all phases
		// ingest
		expect(obs.recordLatency).toHaveBeenCalledWith(
			'rag.ingest.total_ms',
			expect.any(Number),
			expect.objectContaining({ component: 'rag' }),
		);
		expect(obs.recordOperation).toHaveBeenCalledWith('rag.ingest', true, 'RUN', expect.any(Object));
		// embedder + store correlated
		expect(obs.recordOperation).toHaveBeenCalledWith(
			'rag.embedder',
			true,
			'RUN',
			expect.any(Object),
		);
		expect(obs.recordOperation).toHaveBeenCalledWith('rag.store', true, 'RUN', expect.any(Object));
		// reranker correlated via provided correlationId
		expect(obs.recordOperation).toHaveBeenCalledWith(
			'rag.reranker',
			true,
			'RUN',
			expect.any(Object),
		);
		// basic latency presence for reranker
		expect(obs.recordLatency).toHaveBeenCalledWith(
			'rag.reranker',
			expect.any(Number),
			expect.objectContaining({ component: 'rag' }),
		);
	});
});
