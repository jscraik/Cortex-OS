/**
 * Memory Resource Provider
 *
 * Handles memory-related resource access including individual
 * memory items and search functionality with proper error handling.
 */

import { createMemoryProviderFromEnv, type MemorySearchResult } from '@cortex-os/memory-core';
import type { ResourceContent } from '../types/mcp-2025.js';

// Memory provider instance
let memoryProvider: any = null;

/**
 * Get memory provider instance (lazy initialization)
 */
function getMemoryProvider() {
	if (!memoryProvider) {
		memoryProvider = createMemoryProviderFromEnv();
	}
	return memoryProvider;
}

/**
 * Read individual memory by ID
 */
export async function readMemoryById(id: string, signal?: AbortSignal): Promise<ResourceContent> {
	const provider = getMemoryProvider();

	try {
		// Check for cancellation
		signal?.throwIfAborted();

		const memory = await provider.get(id);
		if (!memory) {
			throw new Error(`Memory with ID "${id}" not found`);
		}

		// Check for cancellation again
		signal?.throwIfAborted();

		const result: ResourceContent = {
			uri: `memory://cortex-local/${id}`,
			mimeType: 'application/json',
			blob: JSON.stringify(
				{
					id,
					title: memory.content?.slice(0, 100) ?? `Memory ${id}`,
					content: memory.content || '',
					url: `memory://cortex-local/${id}`,
					metadata: {
						source: 'brAInwav-cortex-memory',
						tags: memory.tags || [],
						importance: memory.importance,
						domain: memory.domain,
						created_at: memory.created_at,
						updated_at: memory.updated_at,
					},
				},
				null,
				2,
			),
		};

		return result;		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`[brAInwav] Failed to read memory ${id}: ${message}`);
	}
}

/**
 * Search memories with query parameters
 */
export async function searchMemory(
	query: string,
	limit: number = 10,
): Promise<ResourceContent> {
	const provider = getMemoryProvider();

	try {
		const results = await provider.search({
			query,
		});

		const searchResults = results.map((memory: MemorySearchResult, index: number) => ({
			id: memory.id,
			title: memory.content?.slice(0, 100) ?? `Memory ${index + 1}`,
			content: memory.content || '',
			score: memory.score,
			url: `memory://cortex-local/${memory.id}`,
			metadata: {
				source: 'brAInwav-cortex-memory',
				tags: memory.tags,
				importance: memory.importance,
				domain: memory.domain,
			},
		}));

		const result: ResourceContent = {
			uri: `memory://cortex-local/search?query=${encodeURIComponent(query)}&limit=${limit}`,
			mimeType: 'application/json',
			blob: JSON.stringify(
				{
					query,
					limit,
					count: searchResults.length,
					results: searchResults,
				},
				null,
				2,
			),
		};

		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`[brAInwav] Failed to search memories: ${message}`);
	}
}
