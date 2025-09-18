import type { Memory, MemoryId } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export type LayeredOptions = {
	defaultScope?: 'session' | 'user' | 'org';
};

/**
 * LayeredMemoryStore composes a short-term and long-term store.
 * Routing rules:
 * - policy.scope === 'session' => short-term
 * - otherwise => long-term (default)
 * - If no policy provided, uses `defaultScope` (defaults to 'user' => long-term)
 */
export class LayeredMemoryStore implements MemoryStore {
	private readonly shortTerm: MemoryStore;
	private readonly longTerm: MemoryStore;
	private readonly defaultScope: 'session' | 'user' | 'org';

	constructor(shortTerm: MemoryStore, longTerm: MemoryStore, opts?: LayeredOptions) {
		this.shortTerm = shortTerm;
		this.longTerm = longTerm;
		this.defaultScope = opts?.defaultScope ?? 'user';
	}

	private selectStoreForMemory(m: Memory): MemoryStore {
		const scope = m.policy?.scope ?? this.defaultScope;
		return scope === 'session' ? this.shortTerm : this.longTerm;
	}

	async upsert(m: Memory, namespace?: string): Promise<Memory> {
		const store = this.selectStoreForMemory(m);
		return store.upsert(m, namespace);
	}

	async get(id: MemoryId, namespace?: string): Promise<Memory | null> {
		// Prefer long-term, then short-term
		const fromLong = await this.longTerm.get(id, namespace);
		if (fromLong) return fromLong;
		return this.shortTerm.get(id, namespace);
	}

	async delete(id: MemoryId, namespace?: string): Promise<void> {
		// Delete from both to avoid dangling copies
		await this.longTerm.delete(id, namespace);
		await this.shortTerm.delete(id, namespace);
	}

	async searchByText(q: TextQuery, namespace?: string): Promise<Memory[]> {
		const [shortRes, longRes] = await Promise.all([
			this.shortTerm.searchByText(q, namespace),
			this.longTerm.searchByText(q, namespace),
		]);
		// Merge, preserving long-term priority, then short-term, unique by id
		const merged: Memory[] = [];
		const seen = new Set<string>();
		for (const m of [...longRes, ...shortRes]) {
			if (!seen.has(m.id)) {
				merged.push(m);
				seen.add(m.id);
			}
			if (merged.length >= q.topK) break;
		}
		return merged.slice(0, q.topK);
	}

	async searchByVector(q: VectorQuery, namespace?: string): Promise<Memory[]> {
		const [shortRes, longRes] = await Promise.all([
			this.shortTerm.searchByVector(q, namespace),
			this.longTerm.searchByVector(q, namespace),
		]);
		const merged: Memory[] = [];
		const seen = new Set<string>();
		for (const m of [...longRes, ...shortRes]) {
			if (!seen.has(m.id)) {
				merged.push(m);
				seen.add(m.id);
			}
			if (merged.length >= q.topK) break;
		}
		return merged.slice(0, q.topK);
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		const [shortPurged, longPurged] = await Promise.all([
			this.shortTerm.purgeExpired(nowISO, namespace),
			this.longTerm.purgeExpired(nowISO, namespace),
		]);
		return shortPurged + longPurged;
	}
}
