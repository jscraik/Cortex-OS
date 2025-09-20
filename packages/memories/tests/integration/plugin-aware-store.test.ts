import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { PluginAwareMemoryStore } from '../../src/adapters/store.plugin-aware.js';
import type { Memory, MemoryStore } from '../../src/domain/types.js';
import { createMemory } from '../test-utils.js';

describe('PluginAwareMemoryStore Integration', () => {
	let baseStore: InMemoryStore;
	let store: PluginAwareMemoryStore;
	let namespace: string;

	beforeEach(() => {
		baseStore = new InMemoryStore();
		store = new PluginAwareMemoryStore(baseStore);
		namespace = 'test-' + Math.random().toString(36).substring(7);
	});

	afterEach(async () => {
		// Clean up
		const allMemories = await store.list(namespace);
		for (const memory of allMemories) {
			await store.delete(memory.id, namespace);
		}
	});

	describe('Plugin Registration', () => {
		it('should register plugins successfully', async () => {
			const plugin = {
				name: 'test-plugin',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => memory
				}
			};

			await store.registerPlugin(plugin);

			const registeredPlugins = store.getRegisteredPlugins();
			expect(registeredPlugins).toHaveLength(1);
			expect(registeredPlugins[0].name).toBe('test-plugin');
		});

		it('should reject plugins without names', async () => {
			const plugin = {
				version: '1.0.0',
				hooks: {}
			};

			await expect(store.registerPlugin(plugin)).rejects.toThrow('Plugin name is required');
		});

		it('should reject duplicate plugin names', async () => {
			const plugin1 = {
				name: 'duplicate',
				version: '1.0.0',
				hooks: {}
			};

			const plugin2 = {
				name: 'duplicate',
				version: '2.0.0',
				hooks: {}
			};

			await store.registerPlugin(plugin1);
			await expect(store.registerPlugin(plugin2)).rejects.toThrow('Plugin duplicate already registered');
		});

		it('should unregister plugins', async () => {
			const plugin = {
				name: 'removable',
				version: '1.0.0',
				hooks: {}
			};

			await store.registerPlugin(plugin);
			expect(store.getRegisteredPlugins()).toHaveLength(1);

			await store.unregisterPlugin('removable');
			expect(store.getRegisteredPlugins()).toHaveLength(0);
		});
	});

	describe('Plugin Execution Order', () => {
		it('should execute plugins in registration order', async () => {
			const executionOrder: string[] = [];

			const plugin1 = {
				name: 'first',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => {
						executionOrder.push('first');
						return memory;
					}
				}
			};

			const plugin2 = {
				name: 'second',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => {
						executionOrder.push('second');
						return memory;
					}
				}
			};

			await store.registerPlugin(plugin1);
			await store.registerPlugin(plugin2);

			const memory = createMemory({ text: 'Test order' });
			await store.upsert(memory, namespace);

			expect(executionOrder).toEqual(['first', 'second']);
		});

		it('should support before and after hooks', async () => {
			const beforeHooks: string[] = [];
			const afterHooks: string[] = [];

			const plugin = {
				name: 'lifecycle',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => {
						beforeHooks.push('before');
						return { ...memory, metadata: { ...memory.metadata, processed: true } };
					},
					afterUpsert: async (memory: Memory) => {
						afterHooks.push('after');
						return memory;
					}
				}
			};

			await store.registerPlugin(plugin);

			const memory = createMemory({ text: 'Test hooks' });
			await store.upsert(memory, namespace);

			expect(beforeHooks).toEqual(['before']);
			expect(afterHooks).toEqual(['after']);
		});
	});

	describe('Plugin Error Isolation', () => {
		it('should continue execution when one plugin fails', async () => {
			const plugin1 = {
				name: 'failing',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => {
						throw new Error('Plugin failure');
					}
				}
			};

			const plugin2 = {
				name: 'working',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => {
						return { ...memory, metadata: { ...memory.metadata, success: true } };
					}
				}
			};

			await store.registerPlugin(plugin1);
			await store.registerPlugin(plugin2);

			const memory = createMemory({ text: 'Test error isolation' });
			const result = await store.upsert(memory, namespace);

			// Should still succeed despite plugin failure
			expect(result.metadata?.success).toBe(true);
		});

		it('should collect errors from failed plugins', async () => {
			const plugin = {
				name: 'error-collector',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => {
						throw new Error('Expected error');
					}
				}
			};

			await store.registerPlugin(plugin);

			const memory = createMemory({ text: 'Test error collection' });
			const result = await store.upsert(memory, namespace);

			expect(result.metadata?.pluginErrors).toHaveLength(1);
			expect(result.metadata?.pluginErrors[0].plugin).toBe('error-collector');
			expect(result.metadata?.pluginErrors[0].error).toBe('Expected error');
		});
	});

	describe('Plugin Lifecycle Hooks', () => {
		it('should support all hook types', async () => {
			const hookCalls: string[] = [];

			const plugin = {
				name: 'full-lifecycle',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => {
						hookCalls.push('beforeUpsert');
						return memory;
					},
					afterUpsert: async (memory: Memory) => {
						hookCalls.push('afterUpsert');
						return memory;
					},
					beforeGet: async (id: string) => {
						hookCalls.push('beforeGet');
						return id;
					},
					afterGet: async (memory: Memory | null) => {
						hookCalls.push('afterGet');
						return memory;
					},
					beforeDelete: async (id: string) => {
						hookCalls.push('beforeDelete');
						return id;
					},
					afterDelete: async (id: string) => {
						hookCalls.push('afterDelete');
						return id;
					},
					beforeSearch: async (query: any) => {
						hookCalls.push('beforeSearch');
						return query;
					},
					afterSearch: async (results: Memory[]) => {
						hookCalls.push('afterSearch');
						return results;
					}
				}
			};

			await store.registerPlugin(plugin);

			// Test upsert hooks
			const memory = createMemory({ text: 'Test hooks' });
			await store.upsert(memory, namespace);

			// Test get hooks
			await store.get(memory.id, namespace);

			// Test search hooks
			await store.searchByText({ text: 'test' }, namespace);

			// Test delete hooks
			await store.delete(memory.id, namespace);

			// Verify all hooks were called
			expect(hookCalls).toEqual([
				'beforeUpsert',
				'afterUpsert',
				'beforeGet',
				'afterGet',
				'beforeSearch',
				'afterSearch',
				'beforeDelete',
				'afterDelete'
			]);
		});

		it('should allow plugins to modify memory data', async () => {
			const plugin = {
				name: 'modifier',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => {
						return {
							...memory,
							text: memory.text.toUpperCase(),
							metadata: {
								...memory.metadata,
								modified: true,
								timestamp: new Date().toISOString()
							}
						};
					}
				}
			};

			await store.registerPlugin(plugin);

			const memory = createMemory({ text: 'modify me' });
			const result = await store.upsert(memory, namespace);

			expect(result.text).toBe('MODIFY ME');
			expect(result.metadata?.modified).toBe(true);
			expect(result.metadata?.timestamp).toBeDefined();
		});
	});

	describe('Plugin Configuration', () => {
		it('should support plugin-specific configuration', async () => {
			const configCalls: any[] = [];

			const plugin = {
				name: 'configurable',
				version: '1.0.0',
				config: {
					enabled: true,
					threshold: 0.8
				},
				hooks: {
					beforeUpsert: async (memory: Memory, context?: any) => {
						configCalls.push(context?.pluginConfig);
						return memory;
					}
				}
			};

			await store.registerPlugin(plugin, {
				custom: 'value',
				override: true
			});

			const memory = createMemory({ text: 'Test config' });
			await store.upsert(memory, namespace);

			expect(configCalls).toHaveLength(1);
			expect(configCalls[0]).toEqual({
				enabled: true,
				threshold: 0.8,
				custom: 'value',
				override: true
			});
		});

		it('should allow runtime plugin configuration updates', async () => {
			const plugin = {
				name: 'dynamic',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory, context?: any) => {
						if (context?.pluginConfig?.enabled === false) {
							throw new Error('Plugin disabled');
						}
						return memory;
					}
				}
			};

			await store.registerPlugin(plugin, { enabled: true });

			const memory1 = createMemory({ text: 'Test enabled' });
			await expect(store.upsert(memory1, namespace)).resolves.toBeDefined();

			// Update configuration
			await store.updatePluginConfig('dynamic', { enabled: false });

			const memory2 = createMemory({ text: 'Test disabled' });
			const result = await store.upsert(memory2, namespace);

			expect(result.metadata?.pluginErrors).toHaveLength(1);
			expect(result.metadata?.pluginErrors[0].error).toBe('Plugin disabled');
		});
	});

	describe('Plugin Performance', () => {
		it('should track plugin execution metrics', async () => {
			const slowPlugin = {
				name: 'slow',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => {
						// Simulate slow operation
						await new Promise(resolve => setTimeout(resolve, 10));
						return memory;
					}
				}
			};

			await store.registerPlugin(slowPlugin);

			const memory = createMemory({ text: 'Test performance' });
			const start = Date.now();
			await store.upsert(memory, namespace);
			const duration = Date.now() - start;

			const metrics = store.getPluginMetrics();
			expect(metrics.slow.executionTime).toBeGreaterThan(0);
			expect(metrics.slow.executionCount).toBe(1);
		});

		it('should support async plugin operations', async () => {
			const asyncResults: number[] = [];

			const plugin = {
				name: 'async',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory: Memory) => {
						// Simulate async operation
						const result = await Promise.resolve(42);
						asyncResults.push(result);
						return memory;
					}
				}
			};

			await store.registerPlugin(plugin);

			const memory = createMemory({ text: 'Test async' });
			await store.upsert(memory, namespace);

			expect(asyncResults).toEqual([42]);
		});
	});
});