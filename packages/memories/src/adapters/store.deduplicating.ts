import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export interface DeduplicationConfig {
	/** Threshold for exact text matching (0-1) */
	exactMatchThreshold?: number;
	/** Threshold for fuzzy text matching (0-1) */
	fuzzyMatchThreshold?: number;
	/** Threshold for vector similarity (0-1) */
	vectorSimilarityThreshold?: number;
	/** Enable fuzzy text matching */
	enableFuzzyMatching?: boolean;
	/** Enable vector similarity matching */
	enableVectorSimilarity?: boolean;
	/** Strategy for merging metadata */
	mergeStrategy?: 'merge' | 'newest' | 'oldest';
	/** Batch size for similarity checks */
	batchSize?: number;
	/** Cache size for similarity results */
	cacheSize?: number;
	/** Minimum text length for fuzzy matching */
	minFuzzyLength?: number;
	/** Whether to ignore case in comparisons */
	ignoreCase?: boolean;
	/** Whether to ignore punctuation in comparisons */
	ignorePunctuation?: boolean;
	/** Whether to normalize whitespace */
	normalizeWhitespace?: boolean;
}

export interface DeduplicationMetadata {
	occurrences?: number;
	lastSeen?: string;
	firstSeen?: string;
}

export interface DeduplicationStats {
	totalInserts: number;
	duplicatesDetected: number;
	exactMatches: number;
	fuzzyMatches: number;
	vectorMatches: number;
	cacheHits: number;
	cacheMisses: number;
}

export class DeduplicatingMemoryStore implements MemoryStore {
	private config: Required<DeduplicationConfig>;
	private stats: DeduplicationStats;
	private similarityCache = new Map<string, number>();

	constructor(
		private readonly store: MemoryStore,
		config: DeduplicationConfig = {},
	) {
		this.config = {
			exactMatchThreshold: 1.0,
			fuzzyMatchThreshold: 0.95,
			vectorSimilarityThreshold: 0.9,
			enableFuzzyMatching: true,
			enableVectorSimilarity: true,
			mergeStrategy: 'merge',
			batchSize: 50,
			cacheSize: 1000,
			minFuzzyLength: 3,
			ignoreCase: true,
			ignorePunctuation: false,
			normalizeWhitespace: true,
			...config,
		};

		this.stats = {
			totalInserts: 0,
			duplicatesDetected: 0,
			exactMatches: 0,
			fuzzyMatches: 0,
			vectorMatches: 0,
			cacheHits: 0,
			cacheMisses: 0,
		};
	}

	async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
		this.stats.totalInserts++;

		// Check for duplicates
		const duplicate = await this.findDuplicate(memory, namespace);

		if (duplicate) {
			this.stats.duplicatesDetected++;

			// Merge with existing memory
			const merged = this.mergeMemories(duplicate, memory);
			return await this.store.upsert(merged, namespace);
		}

		// No duplicate found, create new memory
		return await this.store.upsert(memory, namespace);
	}

	async get(id: string, namespace = 'default'): Promise<Memory | null> {
		return this.store.get(id, namespace);
	}

	async delete(id: string, namespace = 'default'): Promise<void> {
		return this.store.delete(id, namespace);
	}

	async searchByText(q: TextQuery, namespace = 'default'): Promise<Memory[]> {
		const results = await this.store.searchByText(q, namespace);

		// Deduplicate results based on text similarity
		return this.deduplicateResults(results);
	}

	async searchByVector(
		q: VectorQuery,
		namespace = 'default',
	): Promise<(Memory & { score: number })[]> {
		const results = await this.store.searchByVector(q, namespace);

		// Deduplicate results based on vector similarity
		return this.deduplicateVectorResults(results);
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		return this.store.purgeExpired(nowISO, namespace);
	}

	async list(namespace = 'default', limit?: number, offset?: number): Promise<Memory[]> {
		return this.store.list(namespace, limit, offset);
	}

	// Public methods for stats and config
	getStats(): DeduplicationStats {
		return { ...this.stats };
	}

	updateConfig(config: Partial<DeduplicationConfig>): void {
		this.config = { ...this.config, ...config };
	}

	clearCache(): void {
		this.similarityCache.clear();
	}

	// Private helper methods
	private async findDuplicate(memory: Memory, namespace: string): Promise<Memory | null> {
		// First check for exact matches
		const exactMatch = await this.findExactMatch(memory, namespace);
		if (exactMatch) {
			this.stats.exactMatches++;
			return exactMatch;
		}

		// Check for fuzzy matches if enabled
		if (this.config.enableFuzzyMatching && memory.text && memory.text.length >= this.config.minFuzzyLength) {
			const fuzzyMatch = await this.findFuzzyMatch(memory, namespace);
			if (fuzzyMatch) {
				this.stats.fuzzyMatches++;
				return fuzzyMatch;
			}
		}

		// Check for vector similarity if enabled and memory has vector
		if (this.config.enableVectorSimilarity && memory.vector) {
			const vectorMatch = await this.findVectorMatch(memory, namespace);
			if (vectorMatch) {
				this.stats.vectorMatches++;
				return vectorMatch;
			}
		}

		return null;
	}

	private async findExactMatch(memory: Memory, namespace: string): Promise<Memory | null> {
		const normalizedText = this.normalizeText(memory.text);

		// Get all memories and check for exact matches
		// In production, this should be optimized with an index
		const allMemories = await this.store.list(namespace);

		for (const existing of allMemories) {
			if (!existing.text) continue;
			const existingNormalized = this.normalizeText(existing.text);
			if (normalizedText === existingNormalized) {
				return existing;
			}
		}

		return null;
	}

	private async findFuzzyMatch(memory: Memory, namespace: string): Promise<Memory | null> {
		if (!memory.text) return null;
		const normalizedText = this.normalizeText(memory.text);

		// Get recent memories to check (in production, use a more efficient strategy)
		const allMemories = await this.store.list(namespace);

		for (const existing of allMemories) {
			// Skip if already found exact match
			if (!existing.text) continue;
			if (this.normalizeText(existing.text) === normalizedText) {
				continue;
			}

			// Check cache first
			const cacheKey = `${memory.id}:${existing.id}`;
			if (this.similarityCache.has(cacheKey)) {
				this.stats.cacheHits++;
				const similarity = this.similarityCache.get(cacheKey)!;
				if (similarity >= this.config.fuzzyMatchThreshold) {
					return existing;
				}
				continue;
			}

			this.stats.cacheMisses++;

			// Calculate text similarity
			const similarity = this.calculateTextSimilarity(
				normalizedText,
				this.normalizeText(existing.text),
			);

			// Cache result
			this.similarityCache.set(cacheKey, similarity);
			if (this.similarityCache.size > this.config.cacheSize) {
				// Simple LRU eviction
				const firstKey = this.similarityCache.keys().next().value;
				if (firstKey) {
					this.similarityCache.delete(firstKey);
				}
			}

			if (similarity >= this.config.fuzzyMatchThreshold) {
				return existing;
			}
		}

		return null;
	}

	private async findVectorMatch(memory: Memory, namespace: string): Promise<Memory | null> {
		if (!memory.vector) return null;

		// Use vector search to find similar memories
		const results = await this.store.searchByVector(
			{
				vector: memory.vector,
				topK: 10,
			},
			namespace,
		);

		for (const result of results) {
			// Check if this is actually a different memory
			if (result.id !== memory.id && result.score >= this.config.vectorSimilarityThreshold) {
				return result;
			}
		}

		return null;
	}

	private calculateTextSimilarity(text1: string, text2: string): number {
		// Simple Levenshtein distance based similarity
		// In production, consider using more sophisticated algorithms
		const distance = this.levenshteinDistance(text1, text2);
		const maxLength = Math.max(text1.length, text2.length);

		if (maxLength === 0) return 1.0;

		return 1.0 - distance / maxLength;
	}

	private levenshteinDistance(str1: string, str2: string): number {
		const matrix = Array(str2.length + 1)
			.fill(null)
			.map(() => Array(str1.length + 1).fill(null));

		for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
		for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

		for (let j = 1; j <= str2.length; j++) {
			for (let i = 1; i <= str1.length; i++) {
				const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
				matrix[j][i] = Math.min(
					matrix[j][i - 1] + 1,
					matrix[j - 1][i] + 1,
					matrix[j - 1][i - 1] + indicator,
				);
			}
		}

		return matrix[str2.length][str1.length];
	}

	private normalizeText(text: string): string {
		let normalized = text;

		if (this.config.ignoreCase) {
			normalized = normalized.toLowerCase();
		}

		if (this.config.normalizeWhitespace) {
			normalized = normalized.replace(/\s+/g, ' ').trim();
		}

		if (this.config.ignorePunctuation) {
			normalized = normalized.replace(/[^\w\s]/g, '');
		}

		return normalized;
	}

	private mergeMemories(existing: Memory, newMemory: Memory): Memory {
		const deduplicationMeta = existing.metadata?.deduplication || {};

		// Update deduplication metadata
		const updatedDeduplication = {
			...deduplicationMeta,
			occurrences: ((deduplicationMeta as DeduplicationMetadata).occurrences || 1) + 1,
			lastSeen: newMemory.createdAt,
			firstSeen: (deduplicationMeta as DeduplicationMetadata).firstSeen || existing.createdAt,
		};

		// Merge metadata based on strategy
		let mergedMetadata: Record<string, unknown>;

		switch (this.config.mergeStrategy) {
			case 'newest':
				mergedMetadata = {
					...newMemory.metadata,
					deduplication: updatedDeduplication,
				};
				break;

			case 'oldest':
				mergedMetadata = {
					...existing.metadata,
					deduplication: updatedDeduplication,
				};
				break;
			default:
				mergedMetadata = this.mergeMetadataFields(
					updatedDeduplication,
					existing.metadata,
					newMemory.metadata,
				);
				break;
		}

		// Determine which createdAt to use based on merge strategy
		let finalCreatedAt: string;
		switch (this.config.mergeStrategy) {
			case 'newest':
				finalCreatedAt = newMemory.createdAt;
				break;
			case 'oldest':
				finalCreatedAt = existing.createdAt;
				break;
			default:
				// For merge strategy, use the newer timestamp
				finalCreatedAt =
					Date.parse(existing.createdAt) < Date.parse(newMemory.createdAt)
						? newMemory.createdAt
						: existing.createdAt;
				break;
		}

		return {
			...existing,
			id: existing.id, // Keep the existing ID
			text: newMemory.text, // Keep the newest text
			vector: newMemory.vector || existing.vector, // Prefer new vector
			metadata: mergedMetadata,
			updatedAt: newMemory.createdAt,
			createdAt: finalCreatedAt,
		};
	}

	private mergeMetadataFields(
		deduplication: DeduplicationMetadata,
		existing: Record<string, unknown> = {},
		newMeta: Record<string, unknown> = {},
	): Record<string, unknown> {
		const merged: Record<string, unknown> = { deduplication };

		// Merge all fields from both metadata objects
		const allKeys = new Set([...Object.keys(existing), ...Object.keys(newMeta)]);

		for (const key of allKeys) {
			if (key === 'deduplication') continue;

			const existingValue = existing[key];
			const newValue = newMeta[key];

			if (existingValue === undefined) {
				merged[key] = newValue;
			} else if (newValue === undefined) {
				merged[key] = existingValue;
			} else {
				// Both values exist - merge intelligently
				merged[key] = this.mergeFieldValues(existingValue, newValue);
			}
		}

		return merged;
	}

	private mergeFieldValues(existing: unknown, newValue: unknown): unknown {
		// Handle arrays by concatenating and deduplicating
		if (Array.isArray(existing) && Array.isArray(newValue)) {
			return [...new Set([...existing, ...newValue])];
		}

		// Handle objects by merging
		if (
			typeof existing === 'object' &&
			typeof newValue === 'object' &&
			existing !== null &&
			newValue !== null
		) {
			return { ...existing, ...newValue };
		}

		// For primitive values, prefer the new value
		return newValue;
	}

	private deduplicateResults(results: Memory[]): Memory[] {
		const seen = new Set<string>();
		const deduplicated: Memory[] = [];

		for (const memory of results) {
			if (!memory.text) continue;
			const key = this.normalizeText(memory.text);

			if (!seen.has(key)) {
				seen.add(key);
				deduplicated.push(memory);
			}
		}

		return deduplicated;
	}

	private deduplicateVectorResults(
		results: (Memory & { score: number })[],
	): (Memory & { score: number })[] {
		const seen = new Set<string>();
		const deduplicated: (Memory & { score: number })[] = [];

		// Sort by score descending
		results.sort((a, b) => b.score - a.score);

		for (const memory of results) {
			if (!memory.text) continue;
			const key = this.normalizeText(memory.text);

			if (!seen.has(key)) {
				seen.add(key);
				deduplicated.push(memory);
			}
		}

		return deduplicated;
	}
}
