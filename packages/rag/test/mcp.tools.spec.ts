import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Document } from '../src/lib/types.js';

const handleRAGMock = vi.fn(async () => 'mock-rag-response');

vi.mock('../src/index.js', () => ({
	handleRAG: handleRAGMock,
}));

describe('document ingestion tool', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns structured ingestion metadata for valid content', async () => {
		const { ragIngestTool } = await import('../src/mcp/tools');
		const content = 'Knowledge worth sharing';
		const response = await ragIngestTool.handler({
			content,
			source: 'doc-42',
			metadata: { tags: ['science'] },
		});

		expect(response.content).toHaveLength(1);
		const payload = JSON.parse(response.content[0]?.text ?? '{}');
		expect(payload).toMatchObject({
			status: 'ingested',
			contentLength: content.length,
			source: 'doc-42',
			metadata: { tags: ['science'] },
		});
		expect(payload.timestamp).toBe(new Date().toISOString());
	});

	it('rejects payloads that fail schema validation', async () => {
		const { ragIngestTool } = await import('../src/mcp/tools');
		await expect(ragIngestTool.handler({ content: '' })).rejects.toThrow(
			/at least 1 character/i,
		);
	});
});

describe('semantic search tool', () => {
	beforeEach(() => {
		vi.resetModules();
		handleRAGMock.mockReset();
	});

	it('forwards validated payload to handleRAG and returns text content', async () => {
		const mockPayload = '{"answer":"42"}';
		handleRAGMock.mockResolvedValueOnce(mockPayload);
		const { ragQueryTool } = await import('../src/mcp/tools');

		const response = await ragQueryTool.handler({
			query: 'climate change evidence',
			topK: 7,
			maxTokens: 512,
			timeoutMs: 1200,
		});

		expect(handleRAGMock).toHaveBeenCalledTimes(1);
		const [input] = handleRAGMock.mock.calls[0] ?? [];
		expect(input).toMatchObject({
			config: {
				maxTokens: 512,
				timeoutMs: 1200,
				memory: {
					maxItems: 70,
					maxBytes: 2048,
				},
			},
			query: { query: 'climate change evidence', topK: 7 },
			json: true,
		});

		expect(response.content).toEqual([{ type: 'text', text: mockPayload }]);
	});

	it('applies default configuration when optional fields are omitted', async () => {
		handleRAGMock.mockResolvedValueOnce('ok');
		const { ragQueryTool } = await import('../src/mcp/tools');

		await ragQueryTool.handler({ query: 'ocean acidity trends' });

		const [input] = handleRAGMock.mock.calls[0] ?? [];
		expect(input?.config).toMatchObject({
			maxTokens: 1024,
			timeoutMs: 30000,
			memory: {
				maxItems: 50,
				maxBytes: 4096,
			},
		});
		expect(input?.query).toMatchObject({
			query: 'ocean acidity trends',
			topK: 5,
		});
	});
});

describe('document retrieval tool', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('scores documents, fills missing embeddings, and respects topK', async () => {
		const embedMock = vi.fn(async (texts: string[]) =>
			texts.map(() => [0.5, 0.5]),
		);
		const embedder = { embed: embedMock } as const;
		const { retrieveDocs } = await import('../src/lib/retrieve-docs');

		const documents: Document[] = [
			{ id: '1', content: 'A climate report', embedding: [1, 0] },
			{ id: '2', content: 'Biodiversity field notes' },
			{ id: '3', content: 'Archived policy memo', embedding: [0, 1] },
		];

		const result = await retrieveDocs(embedder as any, [1, 0], documents, 2);

		expect(embedMock).toHaveBeenCalledTimes(1);
		expect(embedMock).toHaveBeenCalledWith(['Biodiversity field notes']);
		expect(result).toHaveLength(2);
		expect(result[0]?.id).toBe('1');
		expect(result[0]?.similarity).toBeGreaterThanOrEqual(
			result[1]?.similarity ?? 0,
		);
		expect(result[1]?.embedding).toEqual([0.5, 0.5]);
	});
});

describe('document reranking tool', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('maps reranker output back to documents while preserving metadata', async () => {
		const rerankMock = vi.fn(async () => [
			{ id: 'b', text: 'Doc B content', score: 0.91 },
			{ id: 'a', text: 'Doc A content', score: 0.56 },
		]);
		const reranker = { rerank: rerankMock } as const;
		const { rerankDocs } = await import('../src/lib/rerank-docs');

		const documents: Document[] = [
			{ id: 'a', content: 'Doc A content', metadata: { source: 'alpha' } },
			{ id: 'b', content: 'Doc B content', metadata: { source: 'beta' } },
			{ id: 'c', content: 'Doc C content', metadata: { source: 'gamma' } },
		];

		const result = await rerankDocs(
			reranker as any,
			'renewable energy',
			documents,
			2,
		);

		expect(rerankMock).toHaveBeenCalledWith(
			'renewable energy',
			[
				{ id: 'a', text: 'Doc A content' },
				{ id: 'b', text: 'Doc B content' },
				{ id: 'c', text: 'Doc C content' },
			],
			2,
		);
		expect(result).toEqual([
			{
				id: 'b',
				content: 'Doc B content',
				metadata: { source: 'beta' },
				similarity: 0.91,
			},
			{
				id: 'a',
				content: 'Doc A content',
				metadata: { source: 'alpha' },
				similarity: 0.56,
			},
		]);
	});
});

describe('citation bundler tool', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('groups citations by source and sorts entries by score', async () => {
		const { CitationBundler } = await import('../src/lib/citation-bundler');
		const bundler = new CitationBundler();
		const result = bundler.bundleWithDeduplication([
			{ id: '1', text: 'Primary evidence', source: 'doc-A', score: 0.92 },
			{ id: '2', text: 'Secondary note', source: 'doc-A', score: 0.41 },
			{ id: '3', text: 'Corroborating data', source: 'doc-B', score: 0.87 },
		]);

		expect(result.citations).toHaveLength(3);
		expect(result.sourceGroups).toBeDefined();
		expect(result.sourceGroups?.['doc-A']?.map((c) => c.id)).toEqual([
			'1',
			'2',
		]);
		expect(result.sourceGroups?.['doc-A']?.[0]?.score ?? 0).toBeGreaterThan(
			result.sourceGroups?.['doc-A']?.[1]?.score ?? 0,
		);
	});
});
