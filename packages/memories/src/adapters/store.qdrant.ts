import type { Memory } from '../domain/types.js';
import { legacyMemoryAdapterRemoved } from '../legacy.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

const removed = () => legacyMemoryAdapterRemoved('QdrantMemoryStore');

export interface QdrantStoreOptions {
	url?: string;
	apiKey?: string;
	collection?: string;
	vectorSize?: number;
	distance?: 'Cosine' | 'Euclid' | 'Dot';
	onDisk?: boolean;
	hnswM?: number;
	hnswEfConstruct?: number;
}

export class QdrantMemoryStore implements MemoryStore {
	constructor(_options?: QdrantStoreOptions) {
		removed();
	}

	async upsert(_m: Memory, _namespace?: string): Promise<Memory> {
		return removed();
	}

	async get(_id: string, _namespace?: string): Promise<Memory | null> {
		return removed();
	}

	async delete(_id: string, _namespace?: string): Promise<void> {
		removed();
	}

	async searchByText(_q: TextQuery, _namespace?: string): Promise<Memory[]> {
		return removed();
	}

	async searchByVector(
		_q: VectorQuery,
		_namespace?: string,
	): Promise<(Memory & { score: number })[]> {
		return removed();
	}

	async purgeExpired(_nowISO: string, _namespace?: string): Promise<number> {
		return removed();
	}

	async list(_namespace?: string, _limit?: number, _offset?: number): Promise<Memory[]> {
		return removed();
	}

	async healthCheck(): Promise<boolean> {
		removed();
	}
}

export const QDRANT_MEMORY_STORE_REMOVED = true;
