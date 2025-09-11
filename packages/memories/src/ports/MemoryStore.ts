import type { Memory, MemoryId } from '../domain/types.js';

export interface VectorQuery {
	vector: number[];
	topK: number;
	filterTags?: string[];
	// Optional original query text to enable second-stage reranking
	queryText?: string;
}

export interface TextQuery {
	text: string;
	topK: number;
	filterTags?: string[];
}

export interface MemoryStore {
	upsert(m: Memory, namespace?: string): Promise<Memory>;
	get(id: MemoryId, namespace?: string): Promise<Memory | null>;
	delete(id: MemoryId, namespace?: string): Promise<void>;
	searchByText(q: TextQuery, namespace?: string): Promise<Memory[]>;
	searchByVector(q: VectorQuery, namespace?: string): Promise<Memory[]>;
	purgeExpired(nowISO: string, namespace?: string): Promise<number>;
}
