import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Memory, TextQuery } from '../../src/domain/types.js';
import { PluginAwareMemoryStore } from '../../src/plugins/plugin-system.js';
import type { MemoryPlugin, StoreContext } from '../../src/plugins/types.js';
import { createMemory, TestMemoryStore } from '../test-utils.js';

describe('Plugin System', () => {
	let baseStore: TestMemoryStore;
	let pluginStore: PluginAwareMemoryStore;
	let testMemory: Memory;

	beforeEach(() => {
		baseStore = new TestMemoryStore();
		pluginStore = new PluginAwareMemoryStore(baseStore);
		testMemory = createMemory({
			text: 'Test memory for plugin system',
			tags: ['test', 'plugin'],
		});
	});

	describe('Plugin Registration', () => {
		it('should register plugins successfully', () => {
			// Given
			const plugin: MemoryPlugin = {
				name: 'test-plugin',
				version: '1.0.0',
			};

			// When
			pluginStore.register(plugin);

			// Then
			expect(pluginStore.plugins.has('test-plugin')).toBe(true);
		});

		it('should throw error when registering plugin with duplicate name', () => {
			// Given
			const plugin1: MemoryPlugin = {
				name: 'duplicate',
				version: '1.0.0',
			};
			const plugin2: MemoryPlugin = {
				name: 'duplicate',
				version: '2.0.0',
			};

			// When
			pluginStore.register(plugin1);

			// Then
			expect(() => pluginStore.register(plugin2)).toThrow(
				'Plugin with name "duplicate" already registered',
			);
		});
	});

	describe('Plugin Execution Order', () => {
		it('should execute plugins in registration order', async () => {
			// Given
			const executionOrder: string[] = [];
			const plugin1: MemoryPlugin = {
				name: 'plugin1',
				version: '1.0.0',
				onBeforeStore: vi.fn().mockImplementation(async (memory) => {
					executionOrder.push('plugin1-before');
					return memory;
				}),
				onAfterStore: vi.fn().mockImplementation(async () => {
					executionOrder.push('plugin1-after');
				}),
			};
			const plugin2: MemoryPlugin = {
				name: 'plugin2',
				version: '1.0.0',
				onBeforeStore: vi.fn().mockImplementation(async (memory) => {
					executionOrder.push('plugin2-before');
					return memory;
				}),
				onAfterStore: vi.fn().mockImplementation(async () => {
					executionOrder.push('plugin2-after');
				}),
			};

			pluginStore.register(plugin1);
			pluginStore.register(plugin2);

			// When
			await pluginStore.upsert(testMemory);

			// Then
			expect(executionOrder).toEqual([
				'plugin1-before',
				'plugin2-before',
				'plugin1-after',
				'plugin2-after',
			]);
		});
	});

	describe('Plugin Error Isolation', () => {
		it('should continue executing other plugins when one fails', async () => {
			// Given
			const failingPlugin: MemoryPlugin = {
				name: 'failing',
				version: '1.0.0',
				onBeforeStore: vi.fn().mockRejectedValue(new Error('Plugin failed')),
			};
			const workingPlugin: MemoryPlugin = {
				name: 'working',
				version: '1.0.0',
				onBeforeStore: vi.fn().mockImplementation(async (memory) => ({
					...memory,
					text: `${memory.text} (processed)`,
				})),
			};

			pluginStore.register(failingPlugin);
			pluginStore.register(workingPlugin);

			// When
			const result = await pluginStore.upsert(testMemory);

			// Then
			expect(result.text).toBe('Test memory for plugin system (processed)');
			expect(workingPlugin.onBeforeStore).toHaveBeenCalled();
		});

		it('should not fail store operation when after hook throws', async () => {
			// Given
			const errorPlugin: MemoryPlugin = {
				name: 'error',
				version: '1.0.0',
				onAfterStore: vi.fn().mockRejectedValue(new Error('After hook failed')),
			};

			pluginStore.register(errorPlugin);

			// When/Then
			await expect(pluginStore.upsert(testMemory)).resolves.not.toThrow();
		});
	});

	describe('Plugin Hooks', () => {
		it('should call onBeforeStore with correct context', async () => {
			// Given
			const receivedMemory: Memory[] = [];
			const receivedContext: StoreContext[] = [];
			const plugin: MemoryPlugin = {
				name: 'test',
				version: '1.0.0',
				onBeforeStore: async (memory: Memory, context: StoreContext) => {
					receivedMemory.push(memory);
					receivedContext.push(context);
					return memory;
				},
			};

			pluginStore.register(plugin);

			// When
			await pluginStore.upsert(testMemory, 'test-namespace');

			// Then
			expect(receivedMemory).toHaveLength(1);
			expect(receivedMemory[0]).toBeDefined();
			expect(receivedMemory[0].id).toBe(testMemory.id);
			expect(receivedContext[0]).toMatchObject({
				namespace: 'test-namespace',
				timestamp: expect.any(Number),
			});
		});

		it('should allow plugins to modify memory before storage', async () => {
			// Given
			const plugin: MemoryPlugin = {
				name: 'modifier',
				version: '1.0.0',
				onBeforeStore: vi.fn().mockImplementation(async (memory) => ({
					...memory,
					text: `${memory.text} [MODIFIED]`,
					tags: [...memory.tags, 'modified'],
				})),
			};

			pluginStore.register(plugin);

			// When
			const result = await pluginStore.upsert(testMemory);

			// Then
			expect(result.text).toBe('Test memory for plugin system [MODIFIED]');
			expect(result.tags).toContain('modified');
		});

		it('should call onAfterStore with stored memory', async () => {
			// Given
			const mockHook = vi.fn();
			const plugin: MemoryPlugin = {
				name: 'test',
				version: '1.0.0',
				onAfterStore: mockHook,
			};

			pluginStore.register(plugin);

			// When
			const result = await pluginStore.upsert(testMemory);

			// Then
			expect(mockHook).toHaveBeenCalledTimes(1);
			expect(mockHook.mock.calls[0][0]).toBe(result);
		});
	});

	describe('Query Hooks', () => {
		it('should call onBeforeRetrieve with query', async () => {
			// Given
			const mockHook = vi.fn();
			const plugin: MemoryPlugin = {
				name: 'test',
				version: '1.0.0',
				onBeforeRetrieve: mockHook,
			};

			pluginStore.register(plugin);
			const query: TextQuery = { text: 'test', limit: 10 };

			// When
			await pluginStore.searchByText(query);

			// Then
			expect(mockHook).toHaveBeenCalledWith(query, {
				namespace: 'default',
				timestamp: expect.any(Number),
			});
		});

		it('should call onAfterRetrieve with results', async () => {
			// Given
			const mockHook = vi.fn();
			const plugin: MemoryPlugin = {
				name: 'test',
				version: '1.0.0',
				onAfterRetrieve: mockHook.mockImplementation(async (results) =>
					results.map((r) => ({ ...r, text: `${r.text} [PROCESSED]` })),
				),
			};

			pluginStore.register(plugin);
			await baseStore.upsert(testMemory);
			const query: TextQuery = { text: 'test' };

			// When
			const results = await pluginStore.searchByText(query);

			// Then
			expect(results[0].text).toBe('Test memory for plugin system [PROCESSED]');
		});
	});

	describe('Purge Hooks', () => {
		it('should call onBeforePurge before purging', async () => {
			// Given
			const mockHook = vi.fn().mockResolvedValue(true);
			const plugin: MemoryPlugin = {
				name: 'test',
				version: '1.0.0',
				onBeforePurge: mockHook,
			};

			pluginStore.register(plugin);

			// When
			await pluginStore.purgeExpired(new Date().toISOString());

			// Then
			expect(mockHook).toHaveBeenCalled();
		});

		it('should skip purge if onBeforePurge returns false', async () => {
			// Given
			const mockHook = vi.fn().mockResolvedValue(false);
			const plugin: MemoryPlugin = {
				name: 'test',
				version: '1.0.0',
				onBeforePurge: mockHook,
			};

			pluginStore.register(plugin);

			// When
			await pluginStore.purgeExpired(new Date().toISOString());

			// Then
			// Verify that baseStore.purgeExpired was not called
			expect(baseStore.getAll()).toHaveLength(0);
		});
	});
});
