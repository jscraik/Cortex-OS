/**
 * Memory System implementation with 3-tier architecture
 * Working Memory (short-term), Contextual Memory (semantic), Episodic Memory (conversational)
 */

import type {
	ConversationHistory,
	MemorySystem as IMemorySystem,
	MemoryFilter,
	MemoryItem,
	Message,
	VectorStore,
} from '../types';

/**
 * Simple in-memory vector store implementation
 * In production, this would use a proper vector database
 */
class InMemoryVectorStore implements VectorStore {
	private items: Map<string, MemoryItem> = new Map();
	private embeddings: Map<string, number[]> = new Map();

	async add(items: MemoryItem[]): Promise<void> {
		for (const item of items) {
			this.items.set(item.id, item);
			// Generate a simple embedding (in real implementation, use proper embedding model)
			this.embeddings.set(item.id, this.generateSimpleEmbedding(item.content));
		}
	}

	async search(query: string, limit = 10): Promise<MemoryItem[]> {
		const queryEmbedding = this.generateSimpleEmbedding(query);
		const results: { item: MemoryItem; score: number }[] = [];

		for (const [id, item] of this.items) {
			const embedding = this.embeddings.get(id);
			if (embedding) {
				const score = this.cosineSimilarity(queryEmbedding, embedding);
				results.push({ item, score });
			}
		}

		return results
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map((r) => r.item);
	}

	async delete(ids: string[]): Promise<void> {
		for (const id of ids) {
			this.items.delete(id);
			this.embeddings.delete(id);
		}
	}

	async clear(): Promise<void> {
		this.items.clear();
		this.embeddings.clear();
	}

	private generateSimpleEmbedding(text: string): number[] {
		// Simple word frequency-based embedding
		const words = text.toLowerCase().split(/\s+/);
		const embedding = new Array(100).fill(0);

		for (const word of words) {
			const index = this.hashWord(word) % 100;
			embedding[index] += 1;
		}

		// Normalize
		const magnitude = Math.sqrt(
			embedding.reduce((sum, val) => sum + val * val, 0),
		);
		return magnitude > 0 ? embedding.map((val) => val / magnitude) : embedding;
	}

	private hashWord(word: string): number {
		let hash = 0;
		for (let i = 0; i < word.length; i++) {
			hash = (hash << 5) - hash + word.charCodeAt(i);
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}

	private cosineSimilarity(a: number[], b: number[]): number {
		if (a.length !== b.length) return 0;

		let dotProduct = 0;
		let magnitudeA = 0;
		let magnitudeB = 0;

		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i];
			magnitudeA += a[i] * a[i];
			magnitudeB += b[i] * b[i];
		}

		magnitudeA = Math.sqrt(magnitudeA);
		magnitudeB = Math.sqrt(magnitudeB);

		if (magnitudeA === 0 || magnitudeB === 0) return 0;

		return dotProduct / (magnitudeA * magnitudeB);
	}
}

/**
 * Simple in-memory conversation history
 */
class InMemoryConversationHistory implements ConversationHistory {
	private conversations: Map<string, Message[]> = new Map();
	private globalMessages: Message[] = [];

	async add(message: Message): Promise<void> {
		// Add to global history
		this.globalMessages.push(message);

		// Add to conversation-specific history
		if (message.id) {
			// Using message.id as conversationId for now
			if (!this.conversations.has(message.id)) {
				this.conversations.set(message.id, []);
			}
			this.conversations.get(message.id)?.push(message);
		}
	}

	async get(conversationId: string, limit = 50): Promise<Message[]> {
		const messages = this.conversations.get(conversationId) || [];
		return messages.slice(-limit);
	}

	async search(query: string, filters?: MemoryFilter): Promise<Message[]> {
		const results: Message[] = [];
		const searchTerms = query.toLowerCase().split(/\s+/);

		// Search through all messages
		const allMessages = [...this.globalMessages];

		for (const message of allMessages) {
			let matchScore = 0;
			const content = message.content.toLowerCase();

			// Simple keyword matching
			for (const term of searchTerms) {
				if (content.includes(term)) {
					matchScore++;
				}
			}

			if (matchScore > 0) {
				results.push(message);
			}
		}

		// Apply filters
		if (filters?.timeRange) {
			const startTime = new Date(filters.timeRange.start).getTime();
			const endTime = new Date(filters.timeRange.end).getTime();

			return results.filter((msg) => {
				const msgTime = new Date(msg.timestamp).getTime();
				return msgTime >= startTime && msgTime <= endTime;
			});
		}

		return results;
	}

	async clear(conversationId?: string): Promise<void> {
		if (conversationId) {
			this.conversations.delete(conversationId);
		} else {
			this.conversations.clear();
			this.globalMessages = [];
		}
	}
}

/**
 * Memory System coordinating all three memory types
 */
export class MemorySystem implements IMemorySystem {
	working: Map<string, MemoryItem>;
	contextual: VectorStore;
	episodic: ConversationHistory;

	private workingMemoryTTL: number; // in milliseconds
	private contextualMemoryTTL: number;
	private episodicMemoryTTL: number;
	private maxWorkingMemoryItems: number;

	constructor(
		config: {
			workingMemoryTTL?: string; // e.g., "5m", "1h"
			contextualMemoryTTL?: string;
			episodicMemoryTTL?: string;
			maxWorkingMemoryItems?: number;
		} = {},
	) {
		this.working = new Map();
		this.contextual = new InMemoryVectorStore();
		this.episodic = new InMemoryConversationHistory();

		// Parse TTL values
		this.workingMemoryTTL = this.parseTTL(config.workingMemoryTTL || '5m');
		this.contextualMemoryTTL = this.parseTTL(
			config.contextualMemoryTTL || '1h',
		);
		this.episodicMemoryTTL = this.parseTTL(config.episodicMemoryTTL || '30d');
		this.maxWorkingMemoryItems = config.maxWorkingMemoryItems || 100;

		// Start cleanup timer
		this.startCleanupTimer();
	}

	/**
	 * Add item to working memory
	 */
	addToWorkingMemory(
		content: string,
		tags: string[] = [],
		metadata?: Record<string, unknown>,
	): string {
		const id = this.generateId();
		const item: MemoryItem = {
			id,
			type: 'working',
			content,
			tags,
			timestamp: new Date().toISOString(),
			ttl: new Date(Date.now() + this.workingMemoryTTL).toISOString(),
			metadata,
		};

		this.working.set(id, item);

		// Enforce size limit
		if (this.working.size > this.maxWorkingMemoryItems) {
			const oldestKey = this.working.keys().next().value;
			this.working.delete(oldestKey);
		}

		return id;
	}

	/**
	 * Add item to contextual memory
	 */
	async addToContextualMemory(
		content: string,
		tags: string[] = [],
		metadata?: Record<string, unknown>,
	): Promise<string> {
		const id = this.generateId();
		const item: MemoryItem = {
			id,
			type: 'contextual',
			content,
			tags,
			timestamp: new Date().toISOString(),
			ttl: new Date(Date.now() + this.contextualMemoryTTL).toISOString(),
			metadata,
		};

		await this.contextual.add([item]);
		return id;
	}

	/**
	 * Add message to episodic memory
	 */
	async addToEpisodicMemory(message: Message): Promise<void> {
		await this.episodic.add(message);
	}

	/**
	 * Search across all memory types
	 */
	async search(
		query: string,
		options: {
			types?: ('working' | 'contextual' | 'episodic')[];
			limit?: number;
			filters?: MemoryFilter;
		} = {},
	): Promise<MemoryItem[]> {
		const { types = ['working', 'contextual', 'episodic'], limit = 20 } =
			options;
		const results: MemoryItem[] = [];

		// Search working memory
		if (types.includes('working')) {
			for (const item of this.working.values()) {
				if (this.isExpired(item)) continue;
				if (item.content.toLowerCase().includes(query.toLowerCase())) {
					results.push(item);
				}
			}
		}

		// Search contextual memory
		if (types.includes('contextual')) {
			const contextualResults = await this.contextual.search(query, limit);
			results.push(
				...contextualResults.filter((item) => !this.isExpired(item)),
			);
		}

		// Search episodic memory
		if (types.includes('episodic')) {
			const episodicResults = await this.episodic.search(
				query,
				options.filters,
			);
			results.push(
				...episodicResults.map((msg) => ({
					id: msg.id,
					type: 'episodic' as const,
					content: `${msg.role}: ${msg.content}`,
					tags: [msg.role],
					timestamp: msg.timestamp,
					metadata: { role: msg.role },
				})),
			);
		}

		// Sort by relevance (timestamp for now, could be improved with actual relevance scoring)
		return results
			.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			)
			.slice(0, limit);
	}

	/**
	 * Get working memory items
	 */
	getWorkingMemory(): MemoryItem[] {
		const items: MemoryItem[] = [];
		for (const item of this.working.values()) {
			if (!this.isExpired(item)) {
				items.push(item);
			}
		}
		return items;
	}

	/**
	 * Clear expired items from all memory types
	 */
	async cleanup(): Promise<void> {
		const now = Date.now();

		// Clean working memory
		for (const [id, item] of this.working) {
			if (this.isExpired(item)) {
				this.working.delete(id);
			}
		}

		// Clean contextual memory
		const contextualItems: MemoryItem[] = [];
		for (const item of this.working.values()) {
			if (item.type === 'contextual') {
				contextualItems.push(item);
			}
		}
		const expiredContextual = contextualItems.filter((item) =>
			this.isExpired(item),
		);
		if (expiredContextual.length > 0) {
			await this.contextual.delete(expiredContextual.map((item) => item.id));
		}

		// Clean episodic memory (based on TTL)
		const _cutoffTime = new Date(now - this.episodicMemoryTTL).toISOString();
		// This would require a more sophisticated implementation for actual deletion
	}

	/**
	 * Get memory statistics
	 */
	getStats() {
		return {
			working: {
				count: this.working.size,
				size: JSON.stringify([...this.working.values()]).length,
			},
			contextual: {
				count: 'N/A', // Would need to implement count in vector store
			},
			episodic: {
				conversations: this.episodic.conversations?.size || 0,
				totalMessages: this.episodic.globalMessages?.length || 0,
			},
		};
	}

	/**
	 * Export all memories (for persistence)
	 */
	export(): {
		working: MemoryItem[];
		contextual: MemoryItem[];
		episodic: Message[];
	} {
		return {
			working: Array.from(this.working.values()),
			contextual: [], // Would need to implement export in vector store
			episodic: this.episodic.globalMessages || [],
		};
	}

	/**
	 * Import memories (from persistence)
	 */
	async import(data: {
		working: MemoryItem[];
		contextual: MemoryItem[];
		episodic: Message[];
	}): Promise<void> {
		// Import working memory
		for (const item of data.working) {
			this.working.set(item.id, item);
		}

		// Import contextual memory
		if (data.contextual.length > 0) {
			await this.contextual.add(data.contextual);
		}

		// Import episodic memory
		for (const message of data.episodic) {
			await this.episodic.add(message);
		}
	}

	// ===== Private Methods =====

	private parseTTL(ttl: string): number {
		const match = ttl.match(/^(\d+)([smhd])$/);
		if (!match) {
			throw new Error(`Invalid TTL format: ${ttl}`);
		}

		const value = parseInt(match[1], 10);
		const unit = match[2];

		switch (unit) {
			case 's':
				return value * 1000;
			case 'm':
				return value * 60 * 1000;
			case 'h':
				return value * 60 * 60 * 1000;
			case 'd':
				return value * 24 * 60 * 60 * 1000;
			default:
				throw new Error(`Unknown TTL unit: ${unit}`);
		}
	}

	private isExpired(item: MemoryItem): boolean {
		if (!item.ttl) return false;
		return new Date(item.ttl).getTime() < Date.now();
	}

	private generateId(): string {
		return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private startCleanupTimer(): void {
		// Run cleanup every minute
		setInterval(() => {
			this.cleanup().catch(console.error);
		}, 60 * 1000);
	}
}
