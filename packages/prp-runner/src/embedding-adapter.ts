/**
 * @file embedding-adapter.ts
 * @description Lightweight in-memory Embedding & Reranker adapters used for tests and local development.
 * Provides deterministic, dependency-free embeddings and simple lexical reranking so integration
 * tests can exercise higher-level logic without requiring heavy native / Python model stacks.
 */

export interface EmbeddingAdapterConfig {
	provider: string; // e.g. "sentence-transformers" | "local" | "mock"
	model?: string;
	dimensions?: number; // default 1024
}

export interface AddDocumentsResultMeta {
	text: string;
	metadata?: Record<string, any>;
	addedAt: string;
	embedding: number[]; // stored for similarity search
}

export interface SimilaritySearchOptions {
	text: string;
	topK?: number;
	threshold?: number; // cosine similarity threshold (0-1)
}

export interface SimilaritySearchResult {
	id: string;
	text: string;
	similarity: number;
	metadata?: Record<string, any>;
}

export interface EmbeddingAdapterStats {
	provider: string;
	dimensions: number;
	totalDocuments: number;
}

/**
 * Deterministic hash-based embedding generator (no external deps).
 * Produces unit-normalised vectors so cosine similarity behaves reasonably.
 */
function embedDeterministic(text: string, dimensions: number): number[] {
	const vec = new Array<number>(dimensions).fill(0);
	// Simple rolling hash accumulation over characters
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		// Spread signal across a few positions for each char
		const idx1 = (c + i) % dimensions;
		const idx2 = (c * 31 + i * 17) % dimensions;
		vec[idx1] += (c % 13) / 13; // bounded contribution
		vec[idx2] += (c % 7) / 7;
	}
	// L2 normalise
	let norm = 0;
	for (let i = 0; i < dimensions; i++) norm += vec[i] * vec[i];
	norm = Math.sqrt(norm) || 1;
	for (let i = 0; i < dimensions; i++) vec[i] /= norm;
	return vec;
}

function cosine(a: number[], b: number[]): number {
	let dot = 0;
	for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
	return dot; // already unit vectors
}

export class EmbeddingAdapter {
	private config: Required<EmbeddingAdapterConfig>;
	private documents: Map<string, AddDocumentsResultMeta> = new Map();
	private idCounter = 0;

	constructor(config: EmbeddingAdapterConfig) {
		this.config = {
			provider: config.provider,
			model: config.model || 'deterministic-test-model',
			dimensions: config.dimensions || 1024,
		};
	}

	/**
	 * Generate embeddings for single string or list of strings.
	 */
	async generateEmbeddings(input: string | string[]): Promise<number[][]> {
		const texts = Array.isArray(input) ? input : [input];
		return texts.map((t) => embedDeterministic(t, this.config.dimensions));
	}

	/**
	 * Add documents into the in-memory vector store.
	 */
	async addDocuments(
		documents: string[],
		metadata?: Record<string, any>[],
		ids?: string[],
	): Promise<string[]> {
		const assigned: string[] = [];
		for (let i = 0; i < documents.length; i++) {
			const id = ids?.[i] || `doc-${++this.idCounter}`;
			const embedding = embedDeterministic(
				documents[i],
				this.config.dimensions,
			);
			this.documents.set(id, {
				text: documents[i],
				metadata: metadata?.[i],
				addedAt: new Date().toISOString(),
				embedding,
			});
			assigned.push(id);
		}
		return assigned;
	}

	/**
	 * Perform similarity search over stored documents (cosine similarity on unit vectors).
	 */
	async similaritySearch(
		options: SimilaritySearchOptions,
	): Promise<SimilaritySearchResult[]> {
		const { text, topK = 5, threshold = 0 } = options;
		if (this.documents.size === 0) return [];
		const queryVec = embedDeterministic(text, this.config.dimensions);
		const scored: SimilaritySearchResult[] = [];
		for (const [id, meta] of this.documents.entries()) {
			const sim = cosine(queryVec, meta.embedding);
			if (sim >= threshold) {
				scored.push({
					id,
					text: meta.text,
					similarity: sim,
					metadata: meta.metadata,
				});
			}
		}
		scored.sort((a, b) => b.similarity - a.similarity);
		return scored.slice(0, topK);
	}

	getStats(): EmbeddingAdapterStats {
		return {
			provider: this.config.provider,
			dimensions: this.config.dimensions,
			totalDocuments: this.documents.size,
		};
	}

	async clearDocuments(): Promise<void> {
		this.documents.clear();
	}

	async shutdown(): Promise<void> {
		await this.clearDocuments();
	}
}

// ---------------- Reranker Adapter -----------------
export interface RerankerAdapterConfig {
	provider: string; // "transformers" | "local" | "mock"
}

export interface RerankResult {
	originalIndex: number;
	score: number;
}

export interface RerankerAdapter {
	rerank(
		query: string,
		documents: string[],
		topK: number,
	): Promise<RerankResult[]>;
	shutdown?(): Promise<void> | void;
}

class SimpleLexicalReranker implements RerankerAdapter {
	constructor(private config: RerankerAdapterConfig) {}

	async rerank(
		query: string,
		documents: string[],
		topK: number,
	): Promise<RerankResult[]> {
		const qTokens = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
		const scored = documents.map((doc, idx) => {
			const dTokens = new Set(doc.toLowerCase().split(/\W+/).filter(Boolean));
			let overlap = 0;
			for (const t of qTokens) if (dTokens.has(t)) overlap++;
			const score = overlap / (qTokens.size || 1);
			return { originalIndex: idx, score };
		});
		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, topK);
	}
}

/** Factory to create an embedding adapter for provider name. */
export function createEmbeddingAdapter(provider: string): EmbeddingAdapter {
	// For now all providers use deterministic adapter. Provider name retained for stats.
	return new EmbeddingAdapter({ provider, dimensions: 1024 });
}

/** Factory to create a reranker adapter for provider name. */
export function createRerankerAdapter(provider: string): RerankerAdapter {
	return new SimpleLexicalReranker({ provider });
}

// Re-export types for existing imports
