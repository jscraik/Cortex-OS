import type { Memory } from '../domain/types.js';
import type { Embedder } from '../ports/Embedder.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

// Minimal local RAG type compatibility (structural)
export interface Chunk {
	id: string;
	text: string;
	source?: string;
	embedding: number[];
	metadata?: Record<string, unknown>;
	updatedAt?: number;
}

interface RAGStoreLike {
	upsert(chunks: Chunk[]): Promise<void>;
	query(embedding: number[], k?: number): Promise<Array<Chunk & { score?: number }>>;
}

/**
 * Adapts the MemoryStore interface to work with RAG Store interface
 */
export class MemoryStoreRAGAdapter implements RAGStoreLike {
	constructor(private readonly memoryStore: MemoryStore) {}

	async upsert(chunks: Chunk[]): Promise<void> {
		// Convert chunks to memories and store them
		const memories: Memory[] = chunks.map((chunk) => ({
			id: chunk.id,
			kind: 'artifact', // RAG chunks are artifacts
			text: chunk.text,
			vector: chunk.embedding,
			tags: chunk.source ? [`source:${chunk.source}`] : [],
			createdAt: new Date(chunk.updatedAt || Date.now()).toISOString(),
			updatedAt: new Date().toISOString(),
			provenance: {
				source: 'system',
				evidence: chunk.source ? [{ uri: chunk.source }] : undefined,
			},
			metadata: {
				...chunk.metadata,
				ragChunk: true,
				source: chunk.source,
			},
		}));

		// Store all memories
		for (const memory of memories) {
			await this.memoryStore.upsert(memory);
		}
	}

	async query(embedding: number[], k = 5): Promise<Array<Chunk & { score?: number }>> {
		// Use vector search to find similar memories
		const results = await this.memoryStore.searchByVector({ vector: embedding, topK: k });

		// Convert memories back to chunks
		return results.map((memory) => ({
			id: memory.id,
			text: memory.text || '',
			source: memory.tags?.find((tag) => tag.startsWith('source:'))?.replace('source:', ''),
			updatedAt: new Date(memory.createdAt).getTime(),
			metadata: memory.metadata || {},
			embedding: memory.vector ?? [],
			score: this.extractScore(memory),
		}));
	}

	private extractScore(memory: Memory): number {
		// Extract score from metadata or calculate from vector similarity
		if (memory.metadata?.score !== undefined) {
			return memory.metadata.score as number;
		}
		return 1.0; // Default score if not available
	}
}

/**
 * Adapts RAG embedders to work with memories
 */
export class RAGEmbedderAdapter {
	constructor(private readonly embedder: Embedder) {}

	async embedText(text: string): Promise<number[]> {
		const [embedding] = await this.embedder.embed([text]);
		return embedding;
	}

	async embedTexts(texts: string[]): Promise<number[][]> {
		return await this.embedder.embed(texts);
	}
}

/**
 * RAG integration utilities for memories
 */
export class RAGIntegration {
	constructor(
		private readonly memoryStore: MemoryStore,
		private readonly embedder?: Embedder,
	) {}

	/**
	 * Create a RAG-compatible store adapter
	 */
	createStoreAdapter(): RAGStoreLike {
		return new MemoryStoreRAGAdapter(this.memoryStore);
	}

	/**
	 * Create an embedder adapter if embedder is available
	 */
	createEmbedderAdapter(): RAGEmbedderAdapter | null {
		return this.embedder ? new RAGEmbedderAdapter(this.embedder) : null;
	}

	/**
	 * Perform semantic search using RAG-style query
	 */
	async semanticSearch(
		query: string,
		options: {
			limit?: number;
			threshold?: number;
			namespace?: string;
			useReranking?: boolean;
		} = {},
	): Promise<Array<Memory & { score?: number }>> {
		if (!this.embedder) {
			throw new Error('Embedder is required for semantic search');
		}

		const embedderAdapter = this.createEmbedderAdapter();
		if (!embedderAdapter) {
			throw new Error('Embedder is required for semantic search');
		}
		const queryEmbedding = await embedderAdapter.embedText(query);

		// Perform vector search
		const results = await this.memoryStore.searchByVector({
			vector: queryEmbedding,
			topK: options.limit || 10,
		});

		// Optionally apply reranking if available
		if (options.useReranking && results.length > 0) {
			return await this.rerankResults(query, results);
		}

		return results;
	}

	/**
	 * Perform hybrid search combining text and semantic similarity
	 */
	async hybridSearch(
		query: string,
		options: {
			alpha?: number; // Weight for semantic vs text (0-1)
			limit?: number;
			namespace?: string;
			recencyBoost?: boolean;
		} = {},
	): Promise<Array<Memory & { score?: number }>> {
		if (!this.embedder) {
			// Fall back to text-only search
			const textResults = await this.memoryStore.searchByText({
				text: query,
				topK: options.limit || 10,
			});
			return textResults.map((m) => ({ ...m, score: 1.0 }));
		}

		const embedderAdapter = this.createEmbedderAdapter();
		if (!embedderAdapter) {
			// Fall back to text-only search handled below
			const textOnly = await this.memoryStore.searchByText({
				text: query,
				topK: options.limit || 10,
			});
			return textOnly.map((m) => ({ ...m, score: 1.0 }));
		}
		const queryEmbedding = await embedderAdapter.embedText(query);

		// Use hybrid search if available (SQLite adapter supports it)
		const store = this.memoryStore as unknown as {
			searchHybrid?: (
				query: string,
				embedding: number[],
				opts: { alpha?: number; limit?: number; namespace?: string; recencyBoost?: boolean },
			) => Promise<Array<Memory & { score?: number }>>;
		};
		if (typeof store.searchHybrid === 'function') {
			return await store.searchHybrid(query, queryEmbedding, {
				alpha: options.alpha || 0.5,
				limit: options.limit || 10,
				namespace: options.namespace,
				recencyBoost: options.recencyBoost,
			});
		}

		// Manual hybrid search combining results
		const [textResults, vectorResults] = await Promise.all([
			this.memoryStore.searchByText({ text: query, topK: options.limit || 10 }),
			this.memoryStore.searchByVector({ vector: queryEmbedding, topK: options.limit || 10 }),
		]);

		// Combine results with scoring
		const combined = new Map<string, Memory & { score?: number }>();
		const alpha = options.alpha || 0.5;

		// Add text results
		for (const result of textResults) {
			combined.set(result.id, { ...result, score: (1 - alpha) * 0.5 });
		}

		// Add vector results
		for (const result of vectorResults) {
			const existing = combined.get(result.id);
			const score = existing ? alpha * 0.5 + (existing.score || 0) : alpha * 0.5;
			combined.set(result.id, { ...result, score });
		}

		return Array.from(combined.values())
			.sort((a, b) => (b.score || 0) - (a.score || 0))
			.slice(0, options.limit || 10);
	}

	/**
	 * Store RAG chunks as memories
	 */
	async storeChunks(
		chunks: Chunk[],
		options: {
			namespace?: string;
			tags?: string[];
		} = {},
	): Promise<void> {
		// Create memories directly to use namespace
		const memories: Memory[] = chunks.map((chunk) => ({
			id: chunk.id,
			kind: 'artifact',
			text: chunk.text,
			vector: chunk.embedding,
			tags: [...(chunk.source ? [`source:${chunk.source}`] : []), ...(options.tags || [])],
			createdAt: new Date(chunk.updatedAt || Date.now()).toISOString(),
			updatedAt: new Date().toISOString(),
			provenance: {
				source: 'system',
				evidence: chunk.source ? [{ uri: chunk.source }] : undefined,
			},
			metadata: {
				...chunk.metadata,
				ragChunk: true,
				source: chunk.source,
			},
		}));

		// Store all memories with namespace
		for (const memory of memories) {
			await this.memoryStore.upsert(memory, options.namespace);
		}
	}

	/**
	 * Rerank results using cross-encoder or other reranking methods
	 */
	private async rerankResults(
		query: string,
		results: Memory[],
	): Promise<Array<Memory & { score?: number }>> {
		// Try to use Model Gateway for reranking if available
		const gatewayUrl = process.env.MODEL_GATEWAY_URL || 'http://localhost:8081';

		try {
			const endpoint = `${gatewayUrl.replace(/\/$/, '')}/rerank`;
			const documents = results.map((r) => r.text || '');

			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ query, documents }),
			});

			if (res.ok) {
				const body = (await res.json()) as { scores: number[]; model: string };
				return results.map((memory, i) => ({
					...memory,
					score: body.scores[i] || 0,
				}));
			}
		} catch {
			// Fall back to original ordering
		}

		return results.map((memory, i) => ({
			...memory,
			score: 1.0 - i / results.length, // Simple linear decay
		}));
	}
}
