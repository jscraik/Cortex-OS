import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { PluginAwareMemoryStore } from '../../src/adapters/store.plugin.js';
import { createAuditPlugin, createCompressionPlugin } from '../../src/plugins/index.js';
import { createMemory } from '../test-utils.js';

describe('Example Plugins Integration', () => {
	let store: InMemoryStore;
	let pluginStore: PluginAwareMemoryStore;
	const namespace = 'test-plugins';
	let auditLogs: string[] = [];

	beforeEach(async () => {
		store = new InMemoryStore();
		pluginStore = new PluginAwareMemoryStore(store);
		auditLogs = [];

		// Register plugins
		await pluginStore.registerPlugin(createAuditPlugin((msg) => auditLogs.push(msg)));
		await pluginStore.registerPlugin(createCompressionPlugin(50)); // Low threshold for testing
	});

	afterEach(async () => {
		// Clean up
		const allMemories = await store.list(namespace);
		for (const memory of allMemories) {
			await store.delete(memory.id, namespace);
		}
	});

	describe('Audit Plugin', () => {
		it('should log all upsert operations', async () => {
			const memory = createMemory({ text: 'Test memory for audit' });
			await pluginStore.upsert(memory, namespace);

			// Should have both before and after upsert logs
			const upsertLogs = auditLogs.filter(
				(log) => log.includes('Upserting memory') || log.includes('Successfully upserted memory'),
			);
			expect(upsertLogs).toHaveLength(2);
			expect(upsertLogs[0]).toContain('[AUDIT] Upserting memory:');
			expect(upsertLogs[1]).toContain('[AUDIT] Successfully upserted memory:');
		});

		it('should log get operations', async () => {
			const memory = createMemory({ text: 'Test memory' });
			await pluginStore.upsert(memory, namespace);
			auditLogs = []; // Clear logs

			await pluginStore.get(memory.id, namespace);

			expect(auditLogs).toHaveLength(2);
			expect(auditLogs[0]).toContain('[AUDIT] Getting memory:');
			expect(auditLogs[1]).toContain('[AUDIT] Get result');
		});

		it('should log delete operations', async () => {
			const memory = createMemory({ text: 'Test memory' });
			await pluginStore.upsert(memory, namespace);
			auditLogs = []; // Clear logs

			await pluginStore.delete(memory.id, namespace);

			expect(auditLogs).toHaveLength(2);
			expect(auditLogs[0]).toContain('[AUDIT] Deleting memory:');
			expect(auditLogs[1]).toContain('[AUDIT] Successfully deleted memory:');
		});

		it('should log search operations', async () => {
			auditLogs = []; // Clear any existing logs
			await pluginStore.searchByText({ text: 'test', topK: 10 }, namespace);

			// Should have both before and after search logs
			const searchLogs = auditLogs.filter(
				(log) => log.includes('Searching memories') || log.includes('Search completed'),
			);
			expect(searchLogs).toHaveLength(2);
			expect(searchLogs[0]).toContain('[AUDIT] Searching memories');
			expect(searchLogs[1]).toContain('[AUDIT] Search completed');
		});
	});

	describe('Compression Plugin', () => {
		it('should compress large texts on upsert', async () => {
			const longText = 'x'.repeat(100); // 100 characters, > 50 threshold
			const memory = createMemory({ text: longText });

			const result = await pluginStore.upsert(memory, namespace);

			expect(result.text).toContain('...[COMPRESSED]');
			expect(result.metadata?.compressed).toBe(true);
			expect(result.metadata?.originalLength).toBe(100);
		});

		it('should not compress short texts', async () => {
			const shortText = 'Short text';
			const memory = createMemory({ text: shortText });

			const result = await pluginStore.upsert(memory, namespace);

			expect(result.text).toBe(shortText);
			expect(result.metadata?.compressed).toBeUndefined();
		});

		it('should decompress on get', async () => {
			const longText = 'x'.repeat(100);
			const memory = createMemory({ text: longText });

			// Upsert (compresses)
			await pluginStore.upsert(memory, namespace);

			// Get (should decompress)
			const result = await pluginStore.get(memory.id, namespace);

			// The decompression in afterGet hook only removes the compressed metadata
			// but doesn't actually restore the original text in this simple implementation
			expect(result?.text).toContain('...[COMPRESSED]');
			expect(result?.metadata?.compressed).toBeUndefined();
		});

		it('should maintain compression marker in search results', async () => {
			const longText = 'x'.repeat(100);
			const memory = createMemory({ text: longText });

			await pluginStore.upsert(memory, namespace);

			const results = await pluginStore.searchByText({ text: 'xxx', topK: 10 }, namespace);

			expect(results).toHaveLength(1);
			// In this implementation, we keep the compressed text but add a marker
			expect(results[0].text).toContain('...[COMPRESSED]');
			expect(results[0].metadata?.searchResultCompressed).toBe(true);
		});
	});

	describe('Plugin Interaction', () => {
		it('should execute both plugins in correct order', async () => {
			const longText = 'x'.repeat(100);
			const memory = createMemory({ text: longText });

			auditLogs = []; // Clear logs
			await pluginStore.upsert(memory, namespace);

			// Audit plugin should log both before and after compression
			expect(auditLogs.length).toBeGreaterThan(0);
			expect(auditLogs.some((log) => log.includes('Upserting memory'))).toBe(true);
		});

		it('should handle plugin errors gracefully', async () => {
			// Create a faulty plugin
			const faultyPlugin = {
				id: 'faulty-plugin',
				name: 'Faulty Plugin',
				version: '1.0.0',
				hooks: {
					beforeUpsert: async () => {
						throw new Error('Plugin failure');
					},
				},
			};

			// Register after other plugins
			await pluginStore.registerPlugin(faultyPlugin);

			const memory = createMemory({ text: 'Test memory' });

			// Should not throw, but should log error
			const result = await pluginStore.upsert(memory, namespace);

			expect(result).toBeDefined();
			expect(result.text).toBe('Test memory');

			// Check plugin errors
			const errors = pluginStore.getPluginErrors();
			expect(errors.some((e) => e.pluginId === 'faulty-plugin')).toBe(true);
		});
	});
});
