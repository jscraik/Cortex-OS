import type { MemoryStore } from '../ports/MemoryStore.js';
import type { Memory } from '../domain/types.js';
import { randomUUID } from 'node:crypto';

/**
 * MCP handlers that integrate with MemoryStore implementations
 */

interface HandlerContext {
	store: MemoryStore;
	namespace?: string;
}

export class MemoryStoreHandler {
	constructor(private ctx: HandlerContext) {}

	/**
	 * Store a new memory
	 */
	async store(params: {
		kind: string;
		text: string;
		tags?: string[];
		metadata?: Record<string, unknown>;
	}): Promise<{
		stored: boolean;
		id: string;
		kind: string;
		tags: string[];
		textLength: number;
		metadataKeys: number;
	}> {
		const memory: Memory = {
			id: randomUUID(),
			kind: params.kind,
			text: params.text,
			tags: params.tags || [],
			metadata: params.metadata || {},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			provenance: { source: 'mcp-tool' },
		};

		await this.ctx.store.upsert(memory, this.ctx.namespace);

		return {
			stored: true,
			id: memory.id,
			kind: memory.kind,
			tags: memory.tags,
			textLength: memory.text.length,
			metadataKeys: Object.keys(memory.metadata || {}).length,
		};
	}

	/**
	 * Get a memory by ID
	 */
	async get(params: { id: string }): Promise<Memory | null> {
		return await this.ctx.store.get(params.id, this.ctx.namespace);
	}

	/**
	 * Search memories by text
	 */
	async search(params: {
		query: string;
		limit?: number;
		kind?: string;
		tags?: string[];
	}): Promise<{
		query: string;
		results: Array<Memory & { score?: number }>;
		totalFound: number;
	}> {
		const results = await this.ctx.store.searchByText(
			{
				text: params.query,
				topK: params.limit || 10,
				filterTags: params.tags,
			},
			this.ctx.namespace
		);

		// Filter by kind if specified
		const filtered = params.kind
			? results.filter(r => r.kind === params.kind)
			: results;

		return {
			query: params.query,
			results: filtered.slice(0, params.limit || 10),
			totalFound: filtered.length,
		};
	}

	/**
	 * Update a memory
	 */
	async update(params: {
		id: string;
		text?: string;
		tags?: string[];
		metadata?: Record<string, unknown>;
	}): Promise<{
		id: string;
		updated: boolean;
		changes: {
			text: boolean;
			tags: boolean;
			metadata: boolean;
		};
	}> {
		const existing = await this.ctx.store.get(params.id, this.ctx.namespace);
		if (!existing) {
			throw new Error(`Memory with ID ${params.id} not found`);
		}

		const updated: Memory = {
			...existing,
			...(params.text !== undefined && { text: params.text }),
			...(params.tags !== undefined && { tags: params.tags }),
			...(params.metadata !== undefined && { metadata: params.metadata }),
			updatedAt: new Date().toISOString(),
		};

		await this.ctx.store.upsert(updated, this.ctx.namespace);

		return {
			id: params.id,
			updated: true,
			changes: {
				text: params.text !== undefined,
				tags: params.tags !== undefined,
				metadata: params.metadata !== undefined,
			},
		};
	}

	/**
	 * Delete a memory
	 */
	async delete(params: { id: string }): Promise<{ id: string; deleted: boolean }> {
		await this.ctx.store.delete(params.id, this.ctx.namespace);
		return {
			id: params.id,
			deleted: true,
		};
	}

	/**
	 * List memories with pagination
	 */
	async list(params: {
		namespace?: string;
		limit?: number;
		cursor?: string;
		tags?: string[];
	}): Promise<{
		items: Memory[];
		nextCursor?: string;
	}> {
		const offset = params.cursor ? parseInt(params.cursor, 10) : 0;
		const items = await this.ctx.store.list(
			params.namespace || this.ctx.namespace,
			params.limit || 20,
			offset
		);

		const filtered = params.tags && params.tags.length > 0
			? items.filter(item =>
				params.tags!.some(tag => item.tags?.includes(tag))
			)
			: items;

		return {
			items: filtered.slice(0, params.limit || 20),
			nextCursor: filtered.length > (params.limit || 20)
				? String(offset + (params.limit || 20))
				: undefined,
		};
	}

	/**
	 * Get memory statistics
	 */
	async stats(params: { includeDetails?: boolean }): Promise<{
		totalItems: number;
		totalSize: number;
		itemsByKind: Record<string, number>;
		lastActivity: string;
		details?: {
			storageBackend: string;
			indexedFields: string[];
			averageItemSize: number;
		};
	}> {
		// Get all items to compute stats
		const items = await this.ctx.store.list(this.ctx.namespace);

		const itemsByKind: Record<string, number> = {};
		let totalSize = 0;

		for (const item of items) {
			itemsByKind[item.kind] = (itemsByKind[item.kind] || 0) + 1;
			totalSize += JSON.stringify(item).length;
		}

		return {
			totalItems: items.length,
			totalSize,
			itemsByKind,
			lastActivity: new Date().toISOString(),
			...(params.includeDetails && {
				details: {
					storageBackend: 'memory', // TODO: detect actual backend
					indexedFields: ['kind', 'tags', 'createdAt'],
					averageItemSize: items.length > 0 ? Math.round(totalSize / items.length) : 0,
				},
			}),
		};
	}
}

export function createMemoryStoreHandler(store: MemoryStore, namespace?: string): MemoryStoreHandler {
	return new MemoryStoreHandler({ store, namespace });
}