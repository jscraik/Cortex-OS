import { describe, expect, it, vi } from 'vitest';
import type { Chunk, Embedder, Store } from '../src/lib/index.js';
import { RAGPipeline } from '../src/rag-pipeline.js';

// Mock implementations
class MockEmbedder implements Embedder {
	async embed(texts: string[]): Promise<number[][]> {
		// Use 384 dimensions which is in the default allowed dims
		return texts.map(() => new Array(384).fill(0).map((_, i) => i / 384));
	}
}

class MockStore implements Store {
	public chunks: Array<Chunk & { embedding?: number[]; score?: number }> = [];

	async upsert(chunks: Chunk[]): Promise<void> {
		this.chunks.push(...chunks);
	}

	async query(_embedding: number[], k = 5): Promise<Array<Chunk & { score?: number }>> {
		return this.chunks.slice(0, k).map((c) => ({ ...c, score: 0.9 }));
	}
}

describe('RAG Pipeline Content Security Integration', () => {
	it('should sanitize malicious content during ingestion', async () => {
		const pipeline = new RAGPipeline({
			embedder: new MockEmbedder(),
			store: new MockStore(),
		});

		const maliciousChunks: Chunk[] = [
			{
				id: 'malicious-1',
				text: '<script>alert("XSS attack")</script>This is safe content.',
				source: 'malicious.html',
				metadata: {
					title: 'Clean title',
					description: 'Normal description without suspicious patterns',
					normalField: 'safe data',
				},
			},
		];

		// Should not throw and should sanitize content
		await expect(pipeline.ingest(maliciousChunks)).resolves.toBeUndefined();

		// Verify content was sanitized by checking the stored chunks
		const store = (pipeline as any).S as MockStore; // eslint-disable-line @typescript-eslint/no-explicit-any
		const storedChunks = store.chunks;

		expect(storedChunks).toHaveLength(1);
		expect(storedChunks[0].text).not.toContain('<script>');
		expect(storedChunks[0].text).not.toContain('alert("XSS attack")');
		expect(storedChunks[0].text).toContain('This is safe content');

		// Metadata should be sanitized
		expect(storedChunks[0].metadata).toBeDefined();
		expect(storedChunks[0].metadata?.title).toBe('Clean title');
		expect(storedChunks[0].metadata?.normalField).toBe('safe data');
	});

	it('should sanitize text content during ingestText', async () => {
		const pipeline = new RAGPipeline({
			embedder: new MockEmbedder(),
			store: new MockStore(),
		});

		const maliciousText = `
			<script>alert('XSS')</script>
			<style>body { display: none; }</style>
			This is normal content.
			<iframe src="javascript:alert(1)"></iframe>
		`;

		// Should not throw and should sanitize content
		await expect(pipeline.ingestText('malicious.html', maliciousText)).resolves.toBeUndefined();

		// The content should be processed and sanitized before chunking
		const store = (pipeline as any).S as MockStore; // eslint-disable-line @typescript-eslint/no-explicit-any
		const storedChunks = store.chunks;

		expect(storedChunks.length).toBeGreaterThan(0);
		storedChunks.forEach((chunk: Chunk) => {
			expect(chunk.text).not.toContain('<script>');
			expect(chunk.text).not.toContain('<style>');
			expect(chunk.text).not.toContain('<iframe>');
			expect(chunk.text).not.toContain('javascript:');
		});
	});

	it('should sanitize query input during retrieval', async () => {
		const mockEmbedder = new MockEmbedder();
		const embedSpy = vi.spyOn(mockEmbedder, 'embed');

		const pipeline = new RAGPipeline({
			embedder: mockEmbedder,
			store: new MockStore(),
		});

		const maliciousQuery = '<script>alert("XSS")</script>search term';

		await pipeline.retrieve(maliciousQuery, 5);

		// Check that the query passed to embed was sanitized
		expect(embedSpy).toHaveBeenCalled();
		const embedCall = embedSpy.mock.calls[0];
		expect(embedCall[0]).toHaveLength(1);
		expect(embedCall[0][0]).not.toContain('<script>');
		expect(embedCall[0][0]).not.toContain('alert("XSS")');
		expect(embedCall[0][0]).toContain('search term');
	});

	it('should sanitize retrieved content before returning', async () => {
		const maliciousChunk: Chunk = {
			id: 'malicious-stored',
			text: 'Safe content <script>console.log("stored")</script>',
			source: 'stored.html',
			metadata: {
				title: 'Normal title',
				safe: 'normal data',
			},
		};

		// Create a store that returns malicious content
		class MaliciousStore implements Store {
			async upsert(_chunks: Chunk[]): Promise<void> {
				// Do nothing
			}

			async query(_embedding: number[], _k = 5): Promise<Array<Chunk & { score?: number }>> {
				return [{ ...maliciousChunk, score: 0.9 }];
			}
		}

		const pipeline = new RAGPipeline({
			embedder: new MockEmbedder(),
			store: new MaliciousStore(),
		});

		const result = await pipeline.retrieve('search query', 5);

		// Check that returned citations are sanitized
		expect(result.citations).toHaveLength(1);
		expect(result.citations[0].text).not.toContain('<script>');
		expect(result.citations[0].text).not.toContain('console.log("stored")');
		expect(result.citations[0].text).toContain('Safe content');

		// The bundled text should also be sanitized
		expect(result.text).not.toContain('<script>');
		expect(result.text).not.toContain('console.log("stored")');
	});

	it('should respect custom content security configuration', async () => {
		const pipeline = new RAGPipeline({
			embedder: new MockEmbedder(),
			store: new MockStore(),
			security: {
				contentSecurity: {
					xss: {
						enabled: false, // Disable XSS protection for this test
						stripScripts: false,
						stripStyles: false,
						stripEventHandlers: false,
						allowedTags: [],
						allowedAttributes: [],
					},
					content: {
						maxLength: 10000,
						blockSuspiciousPatterns: false,
						sanitizeUrls: false,
						allowDataUrls: true,
					},
				},
			},
		});

		const contentWithScript = '<script>console.log("test")</script>Normal content';

		// With XSS protection disabled, script tags should be preserved
		await pipeline.ingestText('test.html', contentWithScript);

		const store = (pipeline as any).S as MockStore; // eslint-disable-line @typescript-eslint/no-explicit-any
		const storedChunks = store.chunks;

		expect(storedChunks.length).toBeGreaterThan(0);
		// Script tags should be preserved when XSS protection is disabled
		expect(storedChunks[0].text).toContain('<script>');
	});

	it('should block prototype pollution attempts', async () => {
		const pipeline = new RAGPipeline({
			embedder: new MockEmbedder(),
			store: new MockStore(),
		});

		const maliciousChunks: Chunk[] = [
			{
				id: 'polluted-1',
				text: 'Normal content',
				source: 'malicious.html',
				metadata: {
					__proto__: { polluted: true },
					title: 'Test',
				},
			},
		];

		// Should throw due to prototype pollution detection
		await expect(pipeline.ingest(maliciousChunks)).rejects.toThrow('Prototype pollution detected');
	});
});
