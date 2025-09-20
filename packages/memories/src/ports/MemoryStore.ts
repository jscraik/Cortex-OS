import type { Memory } from '../domain/types.js';

export interface VectorQuery {
	// Vector embedding for similarity search
	vector?: number[];
	// Maximum number of results to return
	topK?: number;
	// Minimum similarity threshold (0-1)
	threshold?: number;
	// Filter to memories with specific tags
	filterTags?: string[];
	// Optional original query text to enable second-stage reranking
	queryText?: string;

	// @deprecated Use 'vector' instead
	embedding?: number[];
	// @deprecated Use 'topK' instead
	limit?: number;
}

export interface TextQuery {
	// Text search query
	text: string;
	// Maximum number of results to return
	topK?: number;
	// Filter to memories with specific tags
	filterTags?: string[];

	// @deprecated Use 'topK' instead
	limit?: number;
}

export interface MemoryStore {
	upsert(m: Memory, namespace?: string): Promise<Memory>;
	get(id: string, namespace?: string): Promise<Memory | null>;
	delete(id: string, namespace?: string): Promise<void>;
	searchByText(q: TextQuery, namespace?: string): Promise<Memory[]>;
	searchByVector(q: VectorQuery, namespace?: string): Promise<(Memory & { score: number })[]>;
	purgeExpired(nowISO: string, namespace?: string): Promise<number>;
}
