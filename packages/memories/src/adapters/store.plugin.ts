import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export interface PluginHook {
	beforeUpsert?: (memory: Memory) => Promise<Memory>;
	afterUpsert?: (memory: Memory) => Promise<Memory>;
	beforeGet?: (id: string) => Promise<string>;
	afterGet?: (memory: Memory | null) => Promise<Memory | null>;
	beforeDelete?: (id: string) => Promise<string>;
	afterDelete?: (id: string) => Promise<string>;
	beforeSearch?: (query: TextQuery) => Promise<TextQuery>;
	afterSearch?: (results: Memory[]) => Promise<Memory[]>;
	beforeVectorSearch?: (query: VectorQuery) => Promise<VectorQuery>;
	afterVectorSearch?: (
		results: (Memory & { score: number })[],
	) => Promise<(Memory & { score: number })[]>;
}

export interface Plugin {
	id: string;
	name: string;
	version: string;
	description?: string;
	dependencies?: string[];
	hooks: PluginHook;
	onRegister?: () => Promise<void>;
	onUnregister?: () => Promise<void>;
}

export interface PluginMetrics {
	executionCount: number;
	totalTime: number;
	errorCount: number;
	averageTime: number;
}

export interface PluginExecutionError {
	pluginId: string;
	hook: string;
	error: Error;
	timestamp: string;
}

export class PluginAwareMemoryStore implements MemoryStore {
	private readonly plugins = new Map<string, Plugin>();
	private pluginOrder: string[] = []; // Maintain insertion order
	private readonly metrics = new Map<string, PluginMetrics>();
	private errors: PluginExecutionError[] = [];

	constructor(private readonly store: MemoryStore) { }

	async registerPlugin(plugin: Plugin): Promise<void> {
		// Check for duplicate ID
		if (this.plugins.has(plugin.id)) {
			throw new Error(`Plugin ${plugin.id} already registered`);
		}

		// Check dependencies
		if (plugin.dependencies) {
			const missingDeps = plugin.dependencies.filter((dep) => !this.plugins.has(dep));
			if (missingDeps.length > 0) {
				throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
			}
		}

		// Validate hooks
		const validHooks = [
			'beforeUpsert',
			'afterUpsert',
			'beforeGet',
			'afterGet',
			'beforeDelete',
			'afterDelete',
			'beforeSearch',
			'afterSearch',
			'beforeVectorSearch',
			'afterVectorSearch',
		];

		for (const hook of Object.keys(plugin.hooks)) {
			if (!validHooks.includes(hook)) {
				throw new Error(`Invalid hook: ${hook}`);
			}
		}

		// Initialize metrics
		this.metrics.set(plugin.id, {
			executionCount: 0,
			totalTime: 0,
			errorCount: 0,
			averageTime: 0,
		});

		// Store plugin
		this.plugins.set(plugin.id, plugin);
		this.pluginOrder.push(plugin.id);

		// Call onRegister if provided
		if (plugin.onRegister) {
			try {
				await plugin.onRegister();
			} catch (error) {
				this.logError(plugin.id, 'onRegister', error as Error);
			}
		}
	}

	async unregisterPlugin(pluginId: string): Promise<void> {
		const plugin = this.plugins.get(pluginId);
		if (!plugin) {
			return;
		}

		// Check if other plugins depend on this one
		for (const [id, p] of this.plugins) {
			if (p.dependencies?.includes(pluginId)) {
				throw new Error(`Cannot unregister plugin ${pluginId}: plugin ${id} depends on it`);
			}
		}

		// Remove plugin
		this.plugins.delete(pluginId);
		this.pluginOrder = this.pluginOrder.filter((id) => id !== pluginId);
		this.metrics.delete(pluginId);

		// Call onUnregister if provided
		if (plugin.onUnregister) {
			try {
				await plugin.onUnregister();
			} catch (error) {
				this.logError(pluginId, 'onUnregister', error as Error);
			}
		}
	}

	listPlugins(): Plugin[] {
		return Array.from(this.plugins.values());
	}

	getPluginMetrics(): Record<string, PluginMetrics> {
		return Object.fromEntries(this.metrics);
	}

	getPluginErrors(): PluginExecutionError[] {
		return [...this.errors];
	}

	clearPluginErrors(): void {
		this.errors = [];
	}

	async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
		let result = memory;

		// Execute beforeUpsert hooks in registration order
		for (const pluginId of this.pluginOrder) {
			const plugin = this.plugins.get(pluginId);
			const beforeHook = plugin?.hooks.beforeUpsert;
			if (beforeHook) {
				try {
					result = await this.executeHook(pluginId, 'beforeUpsert', () => beforeHook(result));
				} catch (error) {
					// Continue with other plugins, but log the error
					this.logError(pluginId, 'beforeUpsert', error as Error);
				}
			}
		}

		// Store the memory
		result = await this.store.upsert(result, namespace);

		// Execute afterUpsert hooks in reverse registration order
		for (const pluginId of [...this.pluginOrder].reverse()) {
			const plugin = this.plugins.get(pluginId);
			const afterHook = plugin?.hooks.afterUpsert;
			if (afterHook) {
				try {
					result = await this.executeHook(pluginId, 'afterUpsert', () => afterHook(result));
				} catch (error) {
					// Continue with other plugins, but log the error
					this.logError(pluginId, 'afterUpsert', error as Error);
				}
			}
		}

		return result;
	}

	async get(id: string, namespace = 'default'): Promise<Memory | null> {
		let resultId = id;

		// Execute beforeGet hooks in registration order
		for (const pluginId of this.pluginOrder) {
			const plugin = this.plugins.get(pluginId);
			const beforeHook = plugin?.hooks.beforeGet;
			if (beforeHook) {
				try {
					resultId = await this.executeHook(pluginId, 'beforeGet', () => beforeHook(resultId));
				} catch (error) {
					this.logError(pluginId, 'beforeGet', error as Error);
				}
			}
		}

		// Get the memory
		let result = await this.store.get(resultId, namespace);

		// Execute afterGet hooks in reverse registration order
		for (const pluginId of [...this.pluginOrder].reverse()) {
			const plugin = this.plugins.get(pluginId);
			const afterHook = plugin?.hooks.afterGet;
			if (afterHook) {
				try {
					result = await this.executeHook(pluginId, 'afterGet', () => afterHook(result));
				} catch (error) {
					this.logError(pluginId, 'afterGet', error as Error);
				}
			}
		}

		return result;
	}

	async delete(id: string, namespace = 'default'): Promise<void> {
		let resultId = id;

		// Execute beforeDelete hooks in registration order
		for (const pluginId of this.pluginOrder) {
			const plugin = this.plugins.get(pluginId);
			const beforeHook = plugin?.hooks.beforeDelete;
			if (beforeHook) {
				try {
					resultId = await this.executeHook(pluginId, 'beforeDelete', () => beforeHook(resultId));
				} catch (error) {
					this.logError(pluginId, 'beforeDelete', error as Error);
				}
			}
		}

		// Delete the memory
		await this.store.delete(resultId, namespace);

		// Execute afterDelete hooks in reverse registration order
		for (const pluginId of [...this.pluginOrder].reverse()) {
			const plugin = this.plugins.get(pluginId);
			const afterHook = plugin?.hooks.afterDelete;
			if (afterHook) {
				try {
					await this.executeHook(pluginId, 'afterDelete', () => afterHook(resultId));
				} catch (error) {
					this.logError(pluginId, 'afterDelete', error as Error);
				}
			}
		}
	}

	async searchByText(q: TextQuery, namespace = 'default'): Promise<Memory[]> {
		let resultQuery = q;

		// Execute beforeSearch hooks in registration order
		for (const pluginId of this.pluginOrder) {
			const plugin = this.plugins.get(pluginId);
			const beforeHook = plugin?.hooks.beforeSearch;
			if (beforeHook) {
				try {
					resultQuery = await this.executeHook(pluginId, 'beforeSearch', () =>
						beforeHook(resultQuery),
					);
				} catch (error) {
					this.logError(pluginId, 'beforeSearch', error as Error);
				}
			}
		}

		// Search memories
		let results = await this.store.searchByText(resultQuery, namespace);

		// Execute afterSearch hooks in reverse registration order
		for (const pluginId of [...this.pluginOrder].reverse()) {
			const plugin = this.plugins.get(pluginId);
			const afterHook = plugin?.hooks.afterSearch;
			if (afterHook) {
				try {
					results = await this.executeHook(pluginId, 'afterSearch', () => afterHook(results));
				} catch (error) {
					this.logError(pluginId, 'afterSearch', error as Error);
				}
			}
		}

		return results;
	}

	async searchByVector(
		q: VectorQuery,
		namespace = 'default',
	): Promise<(Memory & { score: number })[]> {
		let resultQuery = q;

		// Execute beforeVectorSearch hooks in registration order
		for (const pluginId of this.pluginOrder) {
			const plugin = this.plugins.get(pluginId);
			const beforeHook = plugin?.hooks.beforeVectorSearch;
			if (beforeHook) {
				try {
					resultQuery = await this.executeHook(pluginId, 'beforeVectorSearch', () =>
						beforeHook(resultQuery),
					);
				} catch (error) {
					this.logError(pluginId, 'beforeVectorSearch', error as Error);
				}
			}
		}

		// Search memories
		let results = await this.store.searchByVector(resultQuery, namespace);

		// Execute afterVectorSearch hooks in reverse registration order
		for (const pluginId of [...this.pluginOrder].reverse()) {
			const plugin = this.plugins.get(pluginId);
			const afterHook = plugin?.hooks.afterVectorSearch;
			if (afterHook) {
				try {
					results = await this.executeHook(pluginId, 'afterVectorSearch', () => afterHook(results));
				} catch (error) {
					this.logError(pluginId, 'afterVectorSearch', error as Error);
				}
			}
		}

		return results;
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		return this.store.purgeExpired(nowISO, namespace);
	}

	async list(namespace = 'default', limit?: number, offset?: number): Promise<Memory[]> {
		// Check if the underlying store has a list method
		const storeWithList = this.store as MemoryStore & {
			list?: (namespace?: string, limit?: number, offset?: number) => Promise<Memory[]>;
		};

		if (storeWithList.list) {
			return storeWithList.list(namespace, limit, offset);
		}

		// Fallback: this is a simplified implementation - in a real scenario
		// you might want to implement this by querying all memories
		throw new Error('List method not supported by underlying store');
	}

	private async executeHook<T>(
		pluginId: string,
		hookName: string,
		hookFn: () => Promise<T>,
	): Promise<T> {
		const startTime = Date.now();
		let metrics = this.metrics.get(pluginId);

		if (!metrics) {
			metrics = {
				executionCount: 0,
				totalTime: 0,
				errorCount: 0,
				averageTime: 0,
			};
			this.metrics.set(pluginId, metrics);
		}

		try {
			const result = await hookFn();

			// Update metrics
			const duration = Date.now() - startTime;
			metrics.executionCount++;
			metrics.totalTime += duration;
			metrics.averageTime = metrics.totalTime / metrics.executionCount;

			return result;
		} catch (error) {
			// Log error and update metrics
			this.logError(pluginId, hookName, error as Error);
			metrics.errorCount++;

			// Re-throw for caller to handle
			throw error;
		}
	}

	private logError(pluginId: string, hook: string, error: Error): void {
		this.errors.push({
			pluginId,
			hook,
			error,
			timestamp: new Date().toISOString(),
		});

		// Keep only last 100 errors to prevent memory leak
		if (this.errors.length > 100) {
			this.errors = this.errors.slice(-100);
		}
	}
}
