import type { Memory } from '../../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../../ports/MemoryStore.js';
import { RestApiClient } from './rest-adapter.js';
import type { RestApiAdapter, RestApiConfig } from './types.js';

/**
 * MemoryStore adapter for REST API
 */
export class RestApiMemoryStore implements MemoryStore {
	private adapter: RestApiAdapter;
	private readonly namespace: string;

	constructor(configOrAdapter: RestApiConfig | RestApiAdapter, namespace = 'default') {
		this.namespace = namespace;

		if ('config' in configOrAdapter) {
			this.adapter = configOrAdapter;
		} else {
			this.adapter = new RestApiClient(configOrAdapter);
		}
	}

	/**
	 * Get the underlying REST API adapter
	 */
	getAdapter(): RestApiAdapter {
		return this.adapter;
	}

	/**
	 * Check health of the REST API
	 */
	async checkHealth() {
		return this.adapter.healthCheck();
	}

	async upsert(memory: Memory, namespace = this.namespace): Promise<Memory> {
		try {
			// Try to get the memory first
			const existing = await this.adapter.getMemory({
				id: memory.id,
				namespace,
			});

			if (existing && existing.memory) {
				// Update existing memory
				const response = await this.adapter.updateMemory({
					memory: {
						...memory,
						id: existing.memory.id, // Ensure we use the existing ID
					},
					namespace,
				});

				return response.memory;
			} else {
				// Create new memory
				const response = await this.adapter.createMemory({
					memory: {
						...memory,
						// Generate new ID if not provided
						id: memory.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
					},
					namespace,
				});

				return response.memory;
			}
		} catch (error) {
			// If get fails (e.g., 404), try to create directly
			if (
				error &&
				typeof error === 'object' &&
				'status' in error &&
				(error as any).status === 404
			) {
				const response = await this.adapter.createMemory({
					memory: {
						...memory,
						// Generate new ID if not provided
						id: memory.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
					},
					namespace,
				});

				return response.memory;
			}

			throw error;
		}
	}

	async get(id: string, namespace = this.namespace): Promise<Memory | null> {
		const response = await this.adapter.getMemory({
			id,
			namespace,
		});

		return response?.memory ?? null;
	}

	async delete(id: string, namespace = this.namespace): Promise<void> {
		await this.adapter.deleteMemory({
			id,
			namespace,
		});
	}

	async searchByText(query: TextQuery, namespace = this.namespace): Promise<Memory[]> {
		const response = await this.adapter.searchMemories({
			query,
			namespace,
		});

		return response.memories;
	}

	async searchByVector(query: VectorQuery, namespace = this.namespace): Promise<Memory[]> {
		const response = await this.adapter.searchMemories({
			query,
			namespace,
		});

		return response.memories;
	}

	async purgeExpired(nowISO: string, namespace = this.namespace): Promise<number> {
		const response = await this.adapter.purgeMemories({
			nowISO,
			namespace,
		});

		return response.count;
	}

	/**
	 * Close the store adapter
	 */
	async close(): Promise<void> {
		await this.adapter.close();
	}
}
