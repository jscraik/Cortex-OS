import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { type Plugin, PluginAwareMemoryStore } from '../../src/adapters/store.plugin.js';
import { createMemory } from '../test-utils.js';

describe('PluginAwareMemoryStore Integration', () => {
	let store: InMemoryStore;
	let pluginStore: PluginAwareMemoryStore;
	const namespace = 'test-plugin';

	beforeEach(async () => {
		store = new InMemoryStore();
		pluginStore = new PluginAwareMemoryStore(store);
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
			// Create a simple test plugin
			const testPlugin: Plugin = {
				id: 'test-plugin',
				name: 'Test Plugin',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory) => {
						return { ...memory, metadata: { ...memory.metadata, processedBy: 'test-plugin' } };
					},
				},
			};

			// This should not throw
			await expect(pluginStore.registerPlugin(testPlugin)).resolves.not.toThrow();
		});

		it('should fail to register plugin with duplicate ID', async () => {
			const testPlugin: Plugin = {
				id: 'duplicate-plugin',
				name: 'Test Plugin',
				version: '1.0.0',
				hooks: {},
			};

			// Register first time
			await pluginStore.registerPlugin(testPlugin);

			// Try to register again with same ID
			await expect(pluginStore.registerPlugin(testPlugin)).rejects.toThrow(
				'Plugin duplicate-plugin already registered',
			);
		});

		it('should fail to register plugin with invalid hooks', async () => {
			const invalidPlugin: Plugin = {
				id: 'invalid-plugin',
				name: 'Invalid Plugin',
				version: '1.0.0',
				hooks: {
					// @ts-expect-error - Testing invalid hook
					invalidHook: async (memory) => memory,
				},
			};

			await expect(pluginStore.registerPlugin(invalidPlugin)).rejects.toThrow(
				'Invalid hook: invalidHook',
			);
		});

		it('should list registered plugins', async () => {
			const plugin1: Plugin = {
				id: 'plugin-1',
				name: 'Plugin 1',
				version: '1.0.0',
				hooks: {},
			};

			const plugin2: Plugin = {
				id: 'plugin-2',
				name: 'Plugin 2',
				version: '1.0.0',
				hooks: {},
			};

			await pluginStore.registerPlugin(plugin1);
			await pluginStore.registerPlugin(plugin2);

			const plugins = pluginStore.listPlugins();
			expect(plugins).toHaveLength(2);
			expect(plugins.find((p) => p.id === 'plugin-1')).toBeDefined();
			expect(plugins.find((p) => p.id === 'plugin-2')).toBeDefined();
		});

		it('should unregister plugins', async () => {
			const testPlugin: Plugin = {
				id: 'removable-plugin',
				name: 'Removable Plugin',
				version: '1.0.0',
				hooks: {},
			};

			await pluginStore.registerPlugin(testPlugin);
			expect(pluginStore.listPlugins()).toHaveLength(1);

			await pluginStore.unregisterPlugin('removable-plugin');
			expect(pluginStore.listPlugins()).toHaveLength(0);
		});

		it('should handle unregistering non-existent plugin', async () => {
			await expect(pluginStore.unregisterPlugin('non-existent')).resolves.not.toThrow();
		});
	});

	describe('Plugin Execution', () => {
		it('should execute beforeUpsert hooks in registration order', async () => {
			const executionOrder: string[] = [];

			const plugin1: Plugin = {
				id: 'first-plugin',
				name: 'First Plugin',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory) => {
						executionOrder.push('first');
						return { ...memory, metadata: { ...memory.metadata, order: 1 } };
					},
				},
			};

			const plugin2: Plugin = {
				id: 'second-plugin',
				name: 'Second Plugin',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory) => {
						executionOrder.push('second');
						return { ...memory, metadata: { ...memory.metadata, order: 2 } };
					},
				},
			};

			// Register in reverse order to test execution order
			await pluginStore.registerPlugin(plugin2);
			await pluginStore.registerPlugin(plugin1);

			const memory = createMemory({ text: 'Test memory' });
			await pluginStore.upsert(memory, namespace);

			// Should execute in registration order (second was registered first, then first)
			expect(executionOrder).toEqual(['second', 'first']);
		});

		it('should execute afterUpsert hooks in reverse registration order', async () => {
			const executionOrder: string[] = [];

			const plugin1: Plugin = {
				id: 'first-plugin',
				name: 'First Plugin',
				version: '1.0.0',
				hooks: {
					afterUpsert: async (memory) => {
						executionOrder.push('first');
						return memory;
					},
				},
			};

			const plugin2: Plugin = {
				id: 'second-plugin',
				name: 'Second Plugin',
				version: '1.0.0',
				hooks: {
					afterUpsert: async (memory) => {
						executionOrder.push('second');
						return memory;
					},
				},
			};

			await pluginStore.registerPlugin(plugin2);
			await pluginStore.registerPlugin(plugin1);

			const memory = createMemory({ text: 'Test memory' });
			await pluginStore.upsert(memory, namespace);

			// Should execute in reverse registration order (first was registered last, so executes first in reverse)
			expect(executionOrder).toEqual(['first', 'second']);
		});

		it('should handle plugin errors gracefully', async () => {
			const errorPlugin: Plugin = {
				id: 'error-plugin',
				name: 'Error Plugin',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async () => {
						throw new Error('Plugin error');
					},
				},
			};

			const goodPlugin: Plugin = {
				id: 'good-plugin',
				name: 'Good Plugin',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory) => {
						return { ...memory, metadata: { ...memory.metadata, processed: true } };
					},
				},
			};

			await pluginStore.registerPlugin(errorPlugin);
			await pluginStore.registerPlugin(goodPlugin);

			const memory = createMemory({ text: 'Test memory' });

			// Should not throw, but error plugin should not affect the result
			const result = await pluginStore.upsert(memory, namespace);
			expect(result.metadata?.processed).toBe(true);
		});

		it('should support all hook types', async () => {
			const hookCalls: string[] = [];

			const testPlugin: Plugin = {
				id: 'all-hooks-plugin',
				name: 'All Hooks Plugin',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory) => {
						hookCalls.push('beforeUpsert');
						return memory;
					},
					afterUpsert: async (memory) => {
						hookCalls.push('afterUpsert');
						return memory;
					},
					beforeGet: async (id) => {
						hookCalls.push('beforeGet');
						return id;
					},
					afterGet: async (memory) => {
						hookCalls.push('afterGet');
						return memory;
					},
					beforeDelete: async (id) => {
						hookCalls.push('beforeDelete');
						return id;
					},
					afterDelete: async (id) => {
						hookCalls.push('afterDelete');
						return id;
					},
					beforeSearch: async (query) => {
						hookCalls.push('beforeSearch');
						return query;
					},
					afterSearch: async (results) => {
						hookCalls.push('afterSearch');
						return results;
					},
				},
			};

			await pluginStore.registerPlugin(testPlugin);

			// Test upsert hooks
			const memory = createMemory({ text: 'Test memory' });
			await pluginStore.upsert(memory, namespace);

			// Test get hooks
			await pluginStore.get(memory.id, namespace);

			// Test search hooks
			await pluginStore.searchByText({ text: 'test', topK: 10 }, namespace);

			// Test delete hooks
			await pluginStore.delete(memory.id, namespace);

			// All hooks should have been called
			expect(hookCalls).toEqual([
				'beforeUpsert',
				'afterUpsert',
				'beforeGet',
				'afterGet',
				'beforeSearch',
				'afterSearch',
				'beforeDelete',
				'afterDelete',
			]);
		});
	});

	describe('Plugin Lifecycle', () => {
		it('should call plugin lifecycle hooks', async () => {
			const lifecycleEvents: string[] = [];

			const testPlugin: Plugin = {
				id: 'lifecycle-plugin',
				name: 'Lifecycle Plugin',
				version: '1.0.0',
				hooks: {},
				onRegister: async () => {
					lifecycleEvents.push('registered');
				},
				onUnregister: async () => {
					lifecycleEvents.push('unregistered');
				},
			};

			await pluginStore.registerPlugin(testPlugin);
			expect(lifecycleEvents).toContain('registered');

			await pluginStore.unregisterPlugin('lifecycle-plugin');
			expect(lifecycleEvents).toContain('unregistered');
		});

		it('should handle plugin dependencies', async () => {
			const dependencyPlugin: Plugin = {
				id: 'dependency-plugin',
				name: 'Dependency Plugin',
				version: '1.0.0',
				hooks: {},
			};

			const dependentPlugin: Plugin = {
				id: 'dependent-plugin',
				name: 'Dependent Plugin',
				version: '1.0.0',
				dependencies: ['dependency-plugin'],
				hooks: {},
			};

			// Should fail to register dependent plugin before dependency
			await expect(pluginStore.registerPlugin(dependentPlugin)).rejects.toThrow(
				'Missing dependencies: dependency-plugin',
			);

			// Register dependency first
			await pluginStore.registerPlugin(dependencyPlugin);

			// Now should succeed
			await expect(pluginStore.registerPlugin(dependentPlugin)).resolves.not.toThrow();
		});
	});

	describe('Performance Considerations', () => {
		it('should handle plugin execution efficiently', async () => {
			// Create many plugins
			const plugins: Plugin[] = [];
			for (let i = 0; i < 100; i++) {
				plugins.push({
					id: `perf-plugin-${i}`,
					name: `Performance Plugin ${i}`,
					version: '1.0.0',
					hooks: {
						beforeUpsert: async (memory) => {
							return { ...memory, metadata: { ...memory.metadata, [`plugin${i}`]: true } };
						},
					},
				});
			}

			// Register all plugins
			for (const plugin of plugins) {
				await pluginStore.registerPlugin(plugin);
			}

			const memory = createMemory({ text: 'Performance test' });
			const start = Date.now();

			const result = await pluginStore.upsert(memory, namespace);

			const duration = Date.now() - start;
			expect(duration).toBeLessThan(100); // Should be fast

			// All plugins should have added their metadata (100 plugins + existing metadata)
			expect(Object.keys(result.metadata || {}).length).toBeGreaterThanOrEqual(100);
		});

		it('should provide plugin execution metrics', async () => {
			const metricsPlugin: Plugin = {
				id: 'metrics-plugin',
				name: 'Metrics Plugin',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async (memory) => {
						// Simulate some work
						await new Promise((resolve) => setTimeout(resolve, 10));
						return memory;
					},
				},
			};

			await pluginStore.registerPlugin(metricsPlugin);

			const memory = createMemory({ text: 'Metrics test' });
			await pluginStore.upsert(memory, namespace);

			const metrics = pluginStore.getPluginMetrics();
			expect(metrics['metrics-plugin']).toBeDefined();
			expect(metrics['metrics-plugin'].executionCount).toBeGreaterThan(0);
			expect(metrics['metrics-plugin'].totalTime).toBeGreaterThan(0);
		});
	});
});
