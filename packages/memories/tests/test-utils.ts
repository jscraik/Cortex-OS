import { expect, vi } from 'vitest';
import type { Memory } from '../src/domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../src/ports/MemoryStore.js';

// Test utilities
export class TestMemoryStore implements MemoryStore {
	private readonly memories = new Map<string, Memory>();

	async upsert(m: Memory, _namespace = 'default'): Promise<Memory> {
		const key = `${_namespace}:${m.id}`;
		const memory = { ...m, updatedAt: new Date().toISOString() };
		this.memories.set(key, memory);
		return memory;
	}

	async get(id: string, namespace = 'default'): Promise<Memory | null> {
		const key = `${namespace}:${id}`;
		return this.memories.get(key) || null;
	}

	async delete(id: string, namespace = 'default'): Promise<void> {
		const key = `${namespace}:${id}`;
		this.memories.delete(key);
	}

	async searchByText(query: TextQuery, namespace = 'default'): Promise<Memory[]> {
		const results: Memory[] = [];
		const limit = (query.topK ?? query.limit) || 10;

		for (const [key, memory] of this.memories.entries()) {
			if (!key.startsWith(`${namespace}:`)) continue;
			if (memory.text?.toLowerCase().includes(query.text.toLowerCase())) {
				results.push(memory);
				if (results.length >= limit) break;
			}
		}
		return results;
	}

	async searchByVector(query: VectorQuery, namespace = 'default'): Promise<Memory[]> {
		// Simple implementation for testing
		const results: Array<Memory & { score?: number }> = [];
		const limit = (query.topK ?? query.limit) || 10;

		for (const [key, memory] of this.memories.entries()) {
			if (!key.startsWith(`${namespace}:`)) continue;
			if (memory.vector) {
				// Simple dot product similarity
				const qvec = query.vector ?? query.embedding ?? [];
				const similarity = memory.vector.reduce((sum, val, i) => sum + val * (qvec[i] || 0), 0);
				results.push({ ...memory, score: similarity });
			}
		}

		// Apply threshold if provided
		const threshold = query.threshold || 0;
		return results
			.filter((r) => (r.score || 0) >= threshold)
			.sort((a, b) => (b.score || 0) - (a.score || 0))
			.slice(0, limit);
	}

	async purgeExpired(nowISO: string, namespace = 'default'): Promise<number> {
		let count = 0;
		const now = new Date(nowISO).getTime();

		for (const [key, memory] of this.memories.entries()) {
			if (!key.startsWith(`${namespace}:`)) continue;
			if (memory.ttl && new Date(memory.ttl).getTime() < now) {
				this.memories.delete(key);
				count++;
			}
		}
		return count;
	}

	// Helper for tests
	clear() {
		this.memories.clear();
	}

	// Helper to get all memories
	getAll() {
		return Array.from(this.memories.values());
	}
}

// Test data factory
export const createMemory = (overrides: Partial<Memory> = {}): Memory => ({
	id: overrides.id || `memory-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
	kind: overrides.kind || 'note',
	text: overrides.text || 'Test memory content',
	vector: overrides.vector,
	tags: overrides.tags || [],
	ttl: overrides.ttl,
	createdAt: overrides.createdAt || new Date().toISOString(),
	updatedAt: overrides.updatedAt || new Date().toISOString(),
	provenance: overrides.provenance || { source: 'system' },
	policy: overrides.policy,
	embeddingModel: overrides.embeddingModel,
	metadata: overrides.metadata,
});

export const createExpiredMemory = (): Memory => {
	const past = new Date();
	past.setHours(past.getHours() - 1);
	return createMemory({ ttl: past.toISOString(), text: 'Expired memory' });
};

// Mock utilities
export function createMockClock() {
	const now = new Date('2024-01-01T00:00:00.000Z');
	return {
		now: () => now,
		advance: (ms: number) => {
			now.setTime(now.getTime() + ms);
		},
		set: (date: Date) => {
			now.setTime(date.getTime());
		},
	};
}

export function createMockEmbedder() {
	return {
		embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
	};
}

// Assertion helpers
export function expectMemoryToEqual(actual: Memory, expected: Partial<Memory>) {
	expect(actual.id).toBe(expected.id);
	expect(actual.kind).toBe(expected.kind);
	expect(actual.text).toBe(expected.text);
	if (expected.metadata) {
		expect(actual.metadata).toEqual(expected.metadata);
	}
}

export function expectMemoriesToEqual(actual: Memory[], expected: Partial<Memory>[]) {
	expect(actual).toHaveLength(expected.length);
	for (let i = 0; i < actual.length; i++) {
		expectMemoryToEqual(actual[i], expected[i]);
	}
}
