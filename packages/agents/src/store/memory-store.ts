/**
 * In-Memory Store Implementation
 *
 * Simple memory store for demonstration purposes.
 * In production, this should be replaced with a proper database.
 */

import { randomUUID } from 'node:crypto';
import { createPinoLogger } from '@voltagent/logger';
import type { Memory, MemoryStore } from '../types.js';

const logger = createPinoLogger({ name: 'MemoryStore' });

/**
 * In-memory implementation of MemoryStore
 */
export class InMemoryStore implements MemoryStore {
	private readonly data = new Map<string, Memory>();
	private readonly cleanupInterval: NodeJS.Timeout;

	constructor() {
		// Clean up expired entries every hour
		this.cleanupInterval = setInterval(
			() => {
				this.cleanupExpired().catch((error) => {
					logger.error('Failed to cleanup expired memories:', error);
				});
			},
			60 * 60 * 1000,
		);
	}

	async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
		const key = `${namespace}:${memory.id}`;

		// Ensure memory has required fields
		const completeMemory: Memory = {
			...memory,
			createdAt: memory.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		this.data.set(key, completeMemory);
		logger.debug(`Stored memory ${memory.id} in namespace ${namespace}`);
		return completeMemory;
	}

	async get(id: string, namespace = 'default'): Promise<Memory | null> {
		const key = `${namespace}:${id}`;
		const memory = this.data.get(key);

		if (!memory) {
			return null;
		}

		// Check if expired
		if (memory.ttl && this.isExpired(memory)) {
			this.data.delete(key);
			return null;
		}

		return memory;
	}

	async delete(id: string, namespace = 'default'): Promise<void> {
		const key = `${namespace}:${id}`;
		this.data.delete(key);
		logger.debug(`Deleted memory ${id} from namespace ${namespace}`);
	}

	async searchByText(
		query: { topK?: number; text?: string },
		namespace = 'default',
	): Promise<Memory[]> {
		const nsPrefix = `${namespace}:`;
		const items = Array.from(this.data.entries())
			.filter(([key]) => key.startsWith(nsPrefix))
			.map(([, memory]) => memory)
			.filter((memory) => !this.isExpired(memory));

		// Filter by text if provided
		let filtered = items;
		if (query.text) {
			const searchText = query.text.toLowerCase();
			filtered = items.filter((memory) =>
				memory.text.toLowerCase().includes(searchText),
			);
		}

		// Sort by creation time (newest first)
		filtered.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

		const topK = query.topK || 100;
		return filtered.slice(0, topK);
	}

	async searchByVector(
		query: { topK?: number; vector: number[] },
		namespace = 'default',
	): Promise<Memory[]> {
		// Simple vector search - in production would use proper vector similarity
		const nsPrefix = `${namespace}:`;
		const items = Array.from(this.data.entries())
			.filter(([key]) => key.startsWith(nsPrefix))
			.map(([, memory]) => memory)
			.filter((memory) => !this.isExpired(memory) && memory.vector);

		// Simple cosine similarity (naive implementation)
		const scored = items
			.map((memory) => {
				if (!memory.vector) return { memory, score: 0 };
				const score = this.cosineSimilarity(query.vector, memory.vector);
				return { memory, score };
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score);

		const topK = query.topK || 100;
		return scored.slice(0, topK).map((item) => item.memory);
	}

	async purgeExpired(
		nowISO: string = new Date().toISOString(),
		namespace?: string,
	): Promise<number> {
		let count = 0;
		const now = new Date(nowISO);

		for (const [key, memory] of this.data.entries()) {
			if (namespace && !key.startsWith(`${namespace}:`)) {
				continue;
			}

			if (this.isExpired(memory, now)) {
				this.data.delete(key);
				count++;
			}
		}

		if (count > 0) {
			logger.info(
				`Purged ${count} expired memories from namespace ${namespace || 'all'}`,
			);
		}

		return count;
	}

	async getStats(namespace?: string): Promise<{
		total: number;
		byKind: Record<string, number>;
		byNamespace: Record<string, number>;
		expired: number;
	}> {
		const stats = {
			total: 0,
			byKind: {} as Record<string, number>,
			byNamespace: {} as Record<string, number>,
			expired: 0,
		};

		const now = new Date();

		for (const [key, memory] of this.data.entries()) {
			if (namespace && !key.startsWith(`${namespace}:`)) {
				continue;
			}

			stats.total++;

			// Count by kind
			stats.byKind[memory.kind] = (stats.byKind[memory.kind] || 0) + 1;

			// Count by namespace
			const ns = key.split(':')[0];
			stats.byNamespace[ns] = (stats.byNamespace[ns] || 0) + 1;

			// Count expired
			if (this.isExpired(memory, now)) {
				stats.expired++;
			}
		}

		return stats;
	}

	async shutdown(): Promise<void> {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		this.data.clear();
		logger.info('Memory store shutdown complete');
	}

	private isExpired(memory: Memory, now: Date = new Date()): boolean {
		if (!memory.ttl) {
			return false;
		}

		const createdAt = new Date(memory.createdAt);
		const ttlMs = this.parseTTL(memory.ttl);
		const expiryTime = new Date(createdAt.getTime() + ttlMs);

		return now > expiryTime;
	}

	private parseTTL(ttl: string): number {
		// Parse ISO-8601 duration (simplified)
		const match = ttl.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
		if (!match) {
			// Default to 1 hour
			return 60 * 60 * 1000;
		}

		const hours = Number.parseInt(match[1] || '0', 10);
		const minutes = Number.parseInt(match[2] || '0', 10);
		const seconds = Number.parseInt(match[3] || '0', 10);

		return (hours * 60 + minutes * 60 + seconds) * 1000;
	}

	private cosineSimilarity(a: number[], b: number[]): number {
		if (a.length !== b.length) return 0;

		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i];
			normA += a[i] * a[i];
			normB += b[i] * b[i];
		}

		if (normA === 0 || normB === 0) return 0;

		return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
	}
}

/**
 * Create an in-memory store
 */
export function createInMemoryStore(): InMemoryStore {
	return new InMemoryStore();
}
