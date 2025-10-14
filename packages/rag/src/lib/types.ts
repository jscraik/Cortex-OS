// Core library types shared across RAG modules

export interface Embedder {
	// Returns one embedding vector per input string
	embed(queries: string[]): Promise<number[][]>;
}

export interface Chunk {
	id: string;
	text: string;
	source?: string;
	// Unix ms timestamp when the source/chunk was last updated
	updatedAt?: number;
	// Optional free-form metadata for future routing/policies
	metadata?: Record<string, unknown>;
	embedding?: number[];
	score?: number;
}

// REF‑RAG metadata that can be attached to chunks
export interface RefRagChunkMetadata {
	/** Dual embeddings for tri-band context */
	dualEmbeddings?: {
		/** Standard embedding for similarity search */
		standard: number[];
		/** Compressed embedding for Band B virtual tokens */
		compressed?: number[];
		/** Compression metadata */
		compression?: {
			method: 'projection' | 'quantization' | 'hybrid';
			originalDimensions: number;
			compressedDimensions: number;
			compressionRatio: number;
		};
	};
	/** Extracted structured facts for Band C */
	structuredFacts?: StructuredFact[];
	/** Fact extraction metadata */
	factExtraction?: {
		timestamp: number;
		method: 'regex' | 'parser' | 'ml';
		confidence: number;
		factCount: number;
	};
	/** Risk classification for this chunk */
	riskClass?: 'low' | 'medium' | 'high' | 'critical';
	/** Content analysis metadata */
	contentAnalysis?: {
		hasNumbers: boolean;
		hasQuotes: boolean;
		hasCode: boolean;
		hasDates: boolean;
		hasEntities: boolean;
		domains: string[];
		entities: string[];
	};
	/** Quality and relevance metrics */
	qualityMetrics?: {
		freshnessScore: number;
		diversityScore: number;
		completenessScore: number;
		accuracyScore: number;
	};
}

// Structured fact interface (simplified version for lib/types)
export interface StructuredFact {
	id: string;
	type: 'number' | 'quote' | 'code' | 'date' | 'entity' | 'measurement';
	value: string | number | boolean;
	context: string;
	chunkId: string;
	confidence: number;
	metadata?: {
		unit?: string;
		precision?: number;
		source?: string;
		[C: string]: unknown;
	};
}

export interface Citation {
	id: string;
	source?: string;
	text: string;
	score?: number;
}

export interface CitationBundle {
	text: string;
	citations: Citation[];
}

export interface Store {
	upsert(chunks: Chunk[]): Promise<void>;
	query(embedding: number[], k?: number): Promise<Array<Chunk & { score?: number }>>;
}

export interface Pipeline {
	ingest(chunks: Chunk[]): Promise<void>;
	retrieve(query: string, topK?: number): Promise<CitationBundle>;
}

export interface Document {
	id: string;
	content: string;
	metadata?: Record<string, unknown>;
	embedding?: number[];
	similarity?: number;
}

// Reliability primitives configuration (optional per edge)
export interface RetryPolicy {
	maxAttempts: number;
	baseDelayMs?: number;
}

export interface BreakerPolicy {
	failureThreshold: number;
	resetTimeoutMs: number;
}

export interface ReliabilityPolicy {
	retry?: RetryPolicy;
	breaker?: BreakerPolicy;
}
