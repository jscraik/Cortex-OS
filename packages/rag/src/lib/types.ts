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
