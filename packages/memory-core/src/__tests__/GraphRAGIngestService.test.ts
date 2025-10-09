import { describe, expect, it, vi } from 'vitest';
import type { SparseVector } from '../retrieval/QdrantHybrid.js';
import {
	type GraphRAGIngestRequest,
	GraphRAGIngestService,
} from '../services/GraphRAGIngestService.js';

describe('GraphRAGIngestService', () => {
	const simpleDense = async (text: string): Promise<number[]> =>
		Array.from({ length: 4 }, (_, i) => (text.length + i) % 5);
	const simpleSparse = async (text: string): Promise<SparseVector> => ({
		indices: [0],
		values: [Math.min(1, text.length / 10)],
	});

	it('ingests a document, removing previous chunks and persisting new payloads', async () => {
		const persistence = {
			ensureDocument: vi.fn(async (_request: GraphRAGIngestRequest) => ({
				nodeId: 'node-1',
				nodeKey: 'doc-1',
				previousChunkIds: ['chunk-old-1'],
			})),
			replaceChunkRefs: vi.fn(async () => {}),
		};
		const store = {
			init: vi.fn(async () => {}),
			add: vi.fn(async () => {}),
			remove: vi.fn(async () => {}),
			close: vi.fn(async () => {}),
		};
		const neo4j = {
			upsertDocument: vi.fn(async () => {}),
			close: vi.fn(async () => {}),
		};
		let idCounter = 0;
		const service = new GraphRAGIngestService({
			persistence,
			store,
			neo4j,
			chunkSize: 256,
			idFactory: () => `chunk-${++idCounter}`,
			clock: () => 1_730_000_000_000,
		});

		await service.initialize(simpleDense, simpleSparse);
		const result = await service.ingest({
			documentId: 'doc-1',
			source: 'docs/runbook.md',
			text: 'brAInwav runtime wiring validation payload',
			hierarchical: true,
		});

		expect(store.remove).toHaveBeenCalledWith(['chunk-old-1']);
		expect(store.add).toHaveBeenCalledWith([
			expect.objectContaining({
				id: 'chunk-1',
				nodeId: 'node-1',
				metadata: expect.objectContaining({
					path: 'docs/runbook.md',
					nodeType: expect.any(String),
				}),
			}),
		]);
		expect(persistence.replaceChunkRefs).toHaveBeenCalledWith('node-1', [
			expect.objectContaining({ qdrantId: 'chunk-1', path: 'docs/runbook.md' }),
		]);
		expect(neo4j.upsertDocument).toHaveBeenCalledWith(
			expect.objectContaining({ documentId: 'doc-1', nodeId: 'node-1' }),
		);
		expect(result).toEqual({ documentId: 'doc-1', chunks: 1, metadata: undefined });
	});

	it('splits large paragraphs into multiple chunks respecting chunk size', async () => {
		const persistence = {
			ensureDocument: vi.fn(async () => ({
				nodeId: 'node-2',
				nodeKey: 'doc-2',
				previousChunkIds: [],
			})),
			replaceChunkRefs: vi.fn(async () => {}),
		};
		const store = {
			init: vi.fn(async () => {}),
			add: vi.fn(async () => {}),
			remove: vi.fn(async () => {}),
			close: vi.fn(async () => {}),
		};
		const service = new GraphRAGIngestService({
			persistence,
			store,
			chunkSize: 12,
			idFactory: () => `chunk-${Math.random().toString(36).slice(2, 6)}`,
			clock: () => 1_730_000_000_500,
		});

		await service.initialize(simpleDense, simpleSparse);
		await service.ingest({
			documentId: 'doc-2',
			source: 'docs/spec.md',
			text: 'Paragraph one is rather long and should be split.\n\nParagraph two also deserves attention.',
			hierarchical: true,
		});

		expect(store.add).toHaveBeenCalled();
		const addCalls = (store.add as unknown as { mock: { calls: unknown[][] } }).mock.calls;
		const payload = addCalls[0][0] as Array<{ content: string }>;
		expect(payload.length).toBeGreaterThan(1);
		payload.forEach((entry) => {
			expect(entry.content.length).toBeLessThanOrEqual(12);
		});
	});
});
