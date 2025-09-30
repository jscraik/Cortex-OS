import type { Memory } from '../domain/types.js';
import { legacyMemoryAdapterRemoved } from '../legacy.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

const removed = () => legacyMemoryAdapterRemoved('SQLiteStore');

export class SQLiteStore implements MemoryStore {
	constructor(_path: string, _dimension?: number) {
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
}

export const SQLITE_STORE_REMOVED = true;
