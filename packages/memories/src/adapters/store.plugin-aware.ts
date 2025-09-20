import type { Memory, MemoryMetadata } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export interface Plugin {
	name: string;
	version: string;
	description?: string;
	config?: Record<string, any>;
	hooks: PluginHooks;
}

export interface PluginHooks {
	beforeUpsert?: (memory: Memory, context?: PluginContext) => Promise<Memory> | Memory;
	afterUpsert?: (memory: Memory, context?: PluginContext) => Promise<Memory> | Memory;
	beforeGet?: (id: string, context?: PluginContext) => Promise<string> | string;
	afterGet?: (memory: Memory | null, context?: PluginContext) => Promise<Memory | null> | Memory | null;
	beforeDelete?: (id: string, context?: PluginContext) => Promise<string> | string;
	afterDelete?: (id: string, context?: PluginContext) => Promise<string> | string;
	beforeSearch?: (query: TextQuery, context?: PluginContext) => Promise<TextQuery> | TextQuery;
	afterSearch?: (results: Memory[], context?: PluginContext) => Promise<Memory[]> | Memory[];
	beforeVectorSearch?: (query: VectorQuery, context?: PluginContext) => Promise<VectorQuery> | VectorQuery;
	afterVectorSearch?: (results: (Memory & { score: number })[], context?: PluginContext) => Promise<(Memory & { score: number })[]> | (Memory & { score: number })[];
}

export interface PluginContext {
	namespace: string;
	operation: string;
	pluginConfig?: Record<string, any>;
	timestamp: string;
}

export interface PluginMetrics {
	[name: string]: {
		executionTime: number;
		executionCount: number;
		errorCount: number;
		lastExecuted: string;
	};
}

export interface PluginError {
	plugin: string;
	error: string;
	timestamp: string;
}

export class PluginAwareMemoryStore implements MemoryStore {
	private plugins = new Map<string, Plugin & { runtimeConfig?: Record<string, any> }>();
	private metrics: PluginMetrics = {};

	constructor(private readonly store: MemoryStore) {}

	async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
		const context: PluginContext = {
			namespace,
			operation: 'upsert',
			timestamp: new Date().toISOString()
		};

		let processedMemory = memory;
		const errors: PluginError[] = [];

		// Execute beforeUpsert hooks
		for (const [name, plugin] of this.plugins) {
			if (plugin.hooks.beforeUpsert) {
				const startTime = Date.now();
				context.pluginConfig = { ...plugin.config, ...plugin.runtimeConfig };

				try {
					processedMemory = await this.executeHook(
						plugin.hooks.beforeUpsert,
						processedMemory,
						context,
						name
					);
				} catch (error) {
					errors.push({
						plugin: name,
						error: error instanceof Error ? error.message : String(error),
						timestamp: new Date().toISOString()
					});
					this.recordMetric(name, 'error', Date.now() - startTime);
				}
			}
		}

		// Store the memory
		const result = await this.store.upsert(processedMemory, namespace);

		// Execute afterUpsert hooks
		for (const [name, plugin] of this.plugins) {
			if (plugin.hooks.afterUpsert) {
				const startTime = Date.now();
				context.pluginConfig = { ...plugin.config, ...plugin.runtimeConfig };

				try {
					await this.executeHook(
						plugin.hooks.afterUpsert,
						result,
						context,
						name
					);
				} catch (error) {
					errors.push({
						plugin: name,
						error: error instanceof Error ? error.message : String(error),
						timestamp: new Date().toISOString()
					});
					this.recordMetric(name, 'error', Date.now() - startTime);
				}
			}
		}

		// Add errors to metadata if any occurred
		if (errors.length > 0) {
			result.metadata = {
				...result.metadata,
				pluginErrors: errors
			};
		}

		return result;
	}

	async get(id: string, namespace = 'default'): Promise<Memory | null> {
		const context: PluginContext = {
			namespace,
			operation: 'get',
			timestamp: new Date().toISOString()
		};

		let processedId = id;

		// Execute beforeGet hooks
		for (const [name, plugin] of this.plugins) {
			if (plugin.hooks.beforeGet) {
				const startTime = Date.now();
				context.pluginConfig = { ...plugin.config, ...plugin.runtimeConfig };

				try {
					processedId = await this.executeHook(
						plugin.hooks.beforeGet,
						processedId,
						context,
						name
					);
				} catch (error) {
					// Log error but continue
					this.recordMetric(name, 'error', Date.now() - startTime);
				}
			}
		}

		// Get the memory
		let result = await this.store.get(processedId, namespace);

		// Execute afterGet hooks
		for (const [name, plugin] of this.plugins) {
			if (plugin.hooks.afterGet) {
				const startTime = Date.now();
				context.pluginConfig = { ...plugin.config, ...plugin.runtimeConfig };

				try {
					result = await this.executeHook(
						plugin.hooks.afterGet,
						result,
						context,
						name
					);
				} catch (error) {
					// Log error but continue
					this.recordMetric(name, 'error', Date.now() - startTime);
				}
			}
		}

		return result;
	}

	async delete(id: string, namespace = 'default'): Promise<void> {
		const context: PluginContext = {
			namespace,
			operation: 'delete',
			timestamp: new Date().toISOString()
		};

		let processedId = id;

		// Execute beforeDelete hooks
		for (const [name, plugin] of this.plugins) {
			if (plugin.hooks.beforeDelete) {
				const startTime = Date.now();
				context.pluginConfig = { ...plugin.config, ...plugin.runtimeConfig };

				try {
					processedId = await this.executeHook(
						plugin.hooks.beforeDelete,
						processedId,
						context,
						name
					);
				} catch (error) {
					// Log error but continue
					this.recordMetric(name, 'error', Date.now() - startTime);
				}
			}
		}

		// Delete the memory
		await this.store.delete(processedId, namespace);

		// Execute afterDelete hooks
		for (const [name, plugin] of this.plugins) {
			if (plugin.hooks.afterDelete) {
				const startTime = Date.now();
				context.pluginConfig = { ...plugin.config, ...plugin.runtimeConfig };

				try {
					await this.executeHook(
						plugin.hooks.afterDelete,
						processedId,
						context,
						name
					);
				} catch (error) {
					// Log error but continue
					this.recordMetric(name, 'error', Date.now() - startTime);
				}
			}
		}
	}

	async searchByText(q: TextQuery, namespace = 'default'): Promise<Memory[]> {
		const context: PluginContext = {
			namespace,
			operation: 'search',
			timestamp: new Date().toISOString()
		};

		let processedQuery = q;

		// Execute beforeSearch hooks
		for (const [name, plugin] of this.plugins) {
			if (plugin.hooks.beforeSearch) {
				const startTime = Date.now();
				context.pluginConfig = { ...plugin.config, ...plugin.runtimeConfig };

				try {
					processedQuery = await this.executeHook(
						plugin.hooks.beforeSearch,
						processedQuery,
						context,
						name
					);
				} catch (error) {
					// Log error but continue
					this.recordMetric(name, 'error', Date.now() - startTime);
				}
			}
		}

		// Search for memories
		let results = await this.store.searchByText(processedQuery, namespace);

		// Execute afterSearch hooks
		for (const [name, plugin] of this.plugins) {
			if (plugin.hooks.afterSearch) {
				const startTime = Date.now();
				context.pluginConfig = { ...plugin.config, ...plugin.runtimeConfig };

				try {
					results = await this.executeHook(
						plugin.hooks.afterSearch,
						results,
						context,
						name
					);
				} catch (error) {
					// Log error but continue
					this.recordMetric(name, 'error', Date.now() - startTime);
				}
			}
		}

		return results;
	}

	async searchByVector(q: VectorQuery, namespace = 'default'): Promise<(Memory & { score: number })[]> {
		const context: PluginContext = {
			namespace,
			operation: 'vectorSearch',
			timestamp: new Date().toISOString()
		};

		let processedQuery = q;

		// Execute beforeVectorSearch hooks
		for (const [name, plugin] of this.plugins) {
			if (plugin.hooks.beforeVectorSearch) {
				const startTime = Date.now();
				context.pluginConfig = { ...plugin.config, ...plugin.runtimeConfig };

				try {
					processedQuery = await this.executeHook(
						plugin.hooks.beforeVectorSearch,
						processedQuery,
						context,
						name
					);
				} catch (error) {
					// Log error but continue
					this.recordMetric(name, 'error', Date.now() - startTime);
				}
			}
		}

		// Search by vector
		let results = await this.store.searchByVector(processedQuery, namespace);

		// Execute afterVectorSearch hooks
		for (const [name, plugin] of this.plugins) {
			if (plugin.hooks.afterVectorSearch) {
				const startTime = Date.now();
				context.pluginConfig = { ...plugin.config, ...plugin.runtimeConfig };

				try {
					results = await this.executeHook(
						plugin.hooks.afterVectorSearch,
						results,
						context,
						name
					);
				} catch (error) {
					// Log error but continue
					this.recordMetric(name, 'error', Date.now() - startTime);
				}
			}
		}

		return results;
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		return this.store.purgeExpired(nowISO, namespace);
	}

	async list(namespace = 'default', limit?: number, offset?: number): Promise<Memory[]> {
		return this.store.list(namespace, limit, offset);
	}

	// Plugin management methods
	async registerPlugin(plugin: Plugin, runtimeConfig?: Record<string, any>): Promise<void> {
		if (!plugin.name) {
			throw new Error('Plugin name is required');
		}

		if (this.plugins.has(plugin.name)) {
			throw new Error(`Plugin ${plugin.name} already registered`);
		}

		this.plugins.set(plugin.name, {
			...plugin,
			runtimeConfig: { ...plugin.config, ...runtimeConfig }
		});

		// Initialize metrics
		this.metrics[plugin.name] = {
			executionTime: 0,
			executionCount: 0,
			errorCount: 0,
			lastExecuted: ''
		};
	}

	async unregisterPlugin(name: string): Promise<void> {
		if (!this.plugins.has(name)) {
			throw new Error(`Plugin ${name} not found`);
		}

		this.plugins.delete(name);
		delete this.metrics[name];
	}

	getRegisteredPlugins(): (Plugin & { runtimeConfig?: Record<string, any> })[] {
		return Array.from(this.plugins.values());
	}

	async updatePluginConfig(name: string, config: Record<string, any>): Promise<void> {
		const plugin = this.plugins.get(name);
		if (!plugin) {
			throw new Error(`Plugin ${name} not found`);
		}

		plugin.runtimeConfig = { ...plugin.config, ...plugin.runtimeConfig, ...config };
	}

	getPluginMetrics(): PluginMetrics {
		return { ...this.metrics };
	}

	// Private helper methods
	private async executeHook<T, R>(
		hook: (arg: T, context?: PluginContext) => Promise<R> | R,
		arg: T,
		context: PluginContext,
		pluginName: string
	): Promise<R> {
		const startTime = Date.now();

		let result: R;
		if (hook.constructor.name === 'AsyncFunction') {
			result = await (hook as (arg: T, context?: PluginContext) => Promise<R>)(arg, context);
		} else {
			result = (hook as (arg: T, context?: PluginContext) => R)(arg, context);
		}

		const executionTime = Date.now() - startTime;
		this.recordMetric(pluginName, 'success', executionTime);

		return result;
	}

	private recordMetric(pluginName: string, type: 'success' | 'error', executionTime: number): void {
		if (!this.metrics[pluginName]) {
			this.metrics[pluginName] = {
				executionTime: 0,
				executionCount: 0,
				errorCount: 0,
				lastExecuted: ''
			};
		}

		const metric = this.metrics[pluginName];
		metric.executionTime += executionTime;
		metric.executionCount++;
		metric.lastExecuted = new Date().toISOString();

		if (type === 'error') {
			metric.errorCount++;
		}
	}
}