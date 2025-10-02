/**
 * Tests for McpToolRegistry
 */

import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
	type McpToolRegistration,
	McpToolRegistry,
} from '../../../services/mcp/McpToolRegistry.js';

describe('McpToolRegistry', () => {
	let registry: McpToolRegistry;

	beforeEach(() => {
		registry = new McpToolRegistry();
	});

	afterEach(async () => {
		await registry.clear();
	});

	describe('Tool Registration', () => {
		it('should register a tool successfully', async () => {
			const toolRegistration = createTestToolRegistration();

			await registry.registerTool(toolRegistration);

			const retrievedTool = registry.getTool(toolRegistration.metadata.id);
			expect(retrievedTool).toBeDefined();
			expect(retrievedTool?.metadata.name).toBe(toolRegistration.metadata.name);
		});

		it('should throw error when registering duplicate tool ID', async () => {
			const toolRegistration = createTestToolRegistration();

			await registry.registerTool(toolRegistration);

			await expect(registry.registerTool(toolRegistration)).rejects.toThrow(
				/Tool with ID .* already exists/,
			);
		});

		it('should throw error when registering duplicate tool name', async () => {
			const toolRegistration1 = createTestToolRegistration();
			const toolRegistration2 = createTestToolRegistration();
			toolRegistration2.metadata.id = randomUUID();

			await registry.registerTool(toolRegistration1);

			await expect(registry.registerTool(toolRegistration2)).rejects.toThrow(
				/Tool with name .* already exists/,
			);
		});

		it('should emit toolRegistered event', async () => {
			const toolRegistration = createTestToolRegistration();
			const eventSpy = vi.fn();

			registry.on('toolRegistered', eventSpy);

			await registry.registerTool(toolRegistration);

			expect(eventSpy).toHaveBeenCalledWith(toolRegistration);
		});
	});

	describe('Tool Retrieval', () => {
		it('should get tool by ID', async () => {
			const toolRegistration = createTestToolRegistration();

			await registry.registerTool(toolRegistration);

			const retrievedTool = registry.getTool(toolRegistration.metadata.id);
			expect(retrievedTool).toEqual(toolRegistration);
		});

		it('should get tool by name', async () => {
			const toolRegistration = createTestToolRegistration();

			await registry.registerTool(toolRegistration);

			const retrievedTool = registry.getToolByName(toolRegistration.metadata.name);
			expect(retrievedTool).toEqual(toolRegistration);
		});

		it('should return undefined for non-existent tool', () => {
			const tool = registry.getTool('non-existent-id');
			expect(tool).toBeUndefined();

			const toolByName = registry.getToolByName('non-existent-name');
			expect(toolByName).toBeUndefined();
		});
	});

	describe('Tool Listing', () => {
		beforeEach(async () => {
			// Register test tools
			const tools = [
				createTestToolRegistration({ name: 'tool1', category: 'category1' }),
				createTestToolRegistration({ name: 'tool2', category: 'category2' }),
				createTestToolRegistration({ name: 'tool3', category: 'category1' }),
			];

			for (const tool of tools) {
				await registry.registerTool(tool);
			}
		});

		it('should list all tools', () => {
			const tools = registry.listTools();
			expect(tools).toHaveLength(3);
		});

		it('should filter tools by category', () => {
			const tools = registry.listTools({ category: 'category1' });
			expect(tools).toHaveLength(2);
			expect(tools.every((tool) => tool.metadata.category === 'category1')).toBe(true);
		});

		it('should filter tools by status', async () => {
			const allTools = registry.listTools();
			await registry.updateToolStatus(allTools[0].metadata.id, 'inactive');

			const activeTools = registry.listTools({ status: 'active' });
			expect(activeTools).toHaveLength(2);

			const inactiveTools = registry.listTools({ status: 'inactive' });
			expect(inactiveTools).toHaveLength(1);
		});

		it('should apply limit and offset', () => {
			const tools = registry.listTools({ limit: 2, offset: 1 });
			expect(tools).toHaveLength(2);
		});

		it('should filter tools by tags', async () => {
			const toolWithTags = createTestToolRegistration({
				name: 'tagged-tool',
				tags: ['test', 'search'],
			});
			await registry.registerTool(toolWithTags);

			const tools = registry.listTools({ tags: ['test'] });
			expect(tools).toHaveLength(1);
			expect(tools[0].metadata.name).toBe('tagged-tool');
		});
	});

	describe('Tool Status Management', () => {
		it('should update tool status', async () => {
			const toolRegistration = createTestToolRegistration();
			await registry.registerTool(toolRegistration);

			await registry.updateToolStatus(toolRegistration.metadata.id, 'inactive');

			const updatedTool = registry.getTool(toolRegistration.metadata.id);
			expect(updatedTool?.metadata.status).toBe('inactive');
		});

		it('should emit toolStatusChanged event', async () => {
			const toolRegistration = createTestToolRegistration();
			await registry.registerTool(toolRegistration);

			const eventSpy = vi.fn();
			registry.on('toolStatusChanged', eventSpy);

			await registry.updateToolStatus(toolRegistration.metadata.id, 'error');

			expect(eventSpy).toHaveBeenCalledWith({
				tool: expect.any(Object),
				oldStatus: 'active',
				newStatus: 'error',
			});
		});

		it('should throw error when updating non-existent tool status', async () => {
			await expect(registry.updateToolStatus('non-existent-id', 'inactive')).rejects.toThrow(
				/Tool with ID .* not found/,
			);
		});
	});

	describe('Tool Usage Tracking', () => {
		it('should record tool usage', async () => {
			const toolRegistration = createTestToolRegistration();
			await registry.registerTool(toolRegistration);

			registry.recordToolUsage(toolRegistration.metadata.id);

			const updatedTool = registry.getTool(toolRegistration.metadata.id);
			expect(updatedTool?.metadata.usageCount).toBe(1);
			expect(updatedTool?.metadata.lastUsed).toBeDefined();
		});

		it('should emit toolUsed event', async () => {
			const toolRegistration = createTestToolRegistration();
			await registry.registerTool(toolRegistration);

			const eventSpy = vi.fn();
			registry.on('toolUsed', eventSpy);

			registry.recordToolUsage(toolRegistration.metadata.id);

			expect(eventSpy).toHaveBeenCalledWith(toolRegistration);
		});
	});

	describe('Tool Search', () => {
		beforeEach(async () => {
			const tools = [
				createTestToolRegistration({ name: 'search-tool', description: 'Search for information' }),
				createTestToolRegistration({ name: 'analyze-tool', description: 'Analyze data patterns' }),
				createTestToolRegistration({ name: 'image-processor', tags: ['image', 'vision'] }),
			];

			for (const tool of tools) {
				await registry.registerTool(tool);
			}
		});

		it('should search tools by name', () => {
			const results = registry.searchTools('search');
			expect(results).toHaveLength(1);
			expect(results[0].metadata.name).toBe('search-tool');
		});

		it('should search tools by description', () => {
			const results = registry.searchTools('data');
			expect(results).toHaveLength(1);
			expect(results[0].metadata.name).toBe('analyze-tool');
		});

		it('should search tools by tags', () => {
			const results = registry.searchTools('image');
			expect(results).toHaveLength(1);
			expect(results[0].metadata.name).toBe('image-processor');
		});

		it('should be case insensitive', () => {
			const results = registry.searchTools('SEARCH');
			expect(results).toHaveLength(1);
		});
	});

	describe('Tool Unregistration', () => {
		it('should unregister tool successfully', async () => {
			const toolRegistration = createTestToolRegistration();
			await registry.registerTool(toolRegistration);

			await registry.unregisterTool(toolRegistration.metadata.id);

			const tool = registry.getTool(toolRegistration.metadata.id);
			expect(tool).toBeUndefined();
		});

		it('should emit toolUnregistered event', async () => {
			const toolRegistration = createTestToolRegistration();
			await registry.registerTool(toolRegistration);

			const eventSpy = vi.fn();
			registry.on('toolUnregistered', eventSpy);

			await registry.unregisterTool(toolRegistration.metadata.id);

			expect(eventSpy).toHaveBeenCalledWith(toolRegistration);
		});

		it('should throw error when unregistering non-existent tool', async () => {
			await expect(registry.unregisterTool('non-existent-id')).rejects.toThrow(
				/Tool with ID .* not found/,
			);
		});
	});

	describe('Statistics', () => {
		it('should provide registry statistics', async () => {
			const tools = [
				createTestToolRegistration({ name: 'tool1', category: 'category1', transport: 'stdio' }),
				createTestToolRegistration({ name: 'tool2', category: 'category2', transport: 'http' }),
				createTestToolRegistration({ name: 'tool3', category: 'category1', transport: 'stdio' }),
			];

			for (const tool of tools) {
				await registry.registerTool(tool);
			}

			// Record some usage
			registry.recordToolUsage(tools[0].metadata.id);
			registry.recordToolUsage(tools[0].metadata.id);

			const stats = registry.getStats();

			expect(stats.totalTools).toBe(3);
			expect(stats.toolsByCategory.category1).toBe(2);
			expect(stats.toolsByCategory.category2).toBe(1);
			expect(stats.toolsByTransport.stdio).toBe(2);
			expect(stats.toolsByTransport.http).toBe(1);
			expect(stats.mostUsedTools[0].name).toBe('tool1');
			expect(stats.mostUsedTools[0].usageCount).toBe(2);
		});
	});

	describe('Categories and Tags', () => {
		it('should return all categories', async () => {
			const tools = [
				createTestToolRegistration({ category: 'category1' }),
				createTestToolRegistration({ category: 'category2' }),
				createTestToolRegistration({ category: 'category1' }),
			];

			for (const tool of tools) {
				await registry.registerTool(tool);
			}

			const categories = registry.getCategories();
			expect(categories).toEqual(['category1', 'category2']);
		});

		it('should return all tags', async () => {
			const tools = [
				createTestToolRegistration({ tags: ['tag1', 'tag2'] }),
				createTestToolRegistration({ tags: ['tag2', 'tag3'] }),
				createTestToolRegistration({ tags: ['tag1'] }),
			];

			for (const tool of tools) {
				await registry.registerTool(tool);
			}

			const tags = registry.getTags();
			expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
		});
	});

	describe('Server Tool Management', () => {
		it('should get tools for specific server', async () => {
			const tool1 = createTestToolRegistration({ serverName: 'server1' });
			const tool2 = createTestToolRegistration({ serverName: 'server2' });

			await registry.registerTool(tool1);
			await registry.registerTool(tool2);

			const server1Tools = registry.getToolsForServer('server1');
			expect(server1Tools).toHaveLength(1);
			expect(server1Tools[0].metadata.name).toBe(tool1.metadata.name);

			const server2Tools = registry.getToolsForServer('server2');
			expect(server2Tools).toHaveLength(1);
			expect(server2Tools[0].metadata.name).toBe(tool2.metadata.name);
		});

		it('should return empty array for non-existent server', () => {
			const tools = registry.getToolsForServer('non-existent-server');
			expect(tools).toHaveLength(0);
		});
	});

	describe('Registry Clear', () => {
		it('should clear all tools', async () => {
			const tools = [createTestToolRegistration(), createTestToolRegistration()];

			for (const tool of tools) {
				await registry.registerTool(tool);
			}

			expect(registry.listTools()).toHaveLength(2);

			await registry.clear();

			expect(registry.listTools()).toHaveLength(0);
		});

		it('should emit registryCleared event', async () => {
			const eventSpy = vi.fn();
			registry.on('registryCleared', eventSpy);

			await registry.clear();

			expect(eventSpy).toHaveBeenCalled();
		});
	});
});

// Helper functions
function createTestToolRegistration(
	overrides: Partial<McpToolRegistration['metadata']> = {},
): McpToolRegistration {
	const id = overrides.id || randomUUID();
	const name = overrides.name || `test-tool-${id.substring(0, 8)}`;

	return {
		metadata: {
			id,
			name,
			version: '1.0.0',
			description: `Test tool ${name}`,
			category: overrides.category || 'test',
			tags: overrides.tags || ['test'],
			author: 'test',
			transport: 'stdio',
			serverName: overrides.serverName || 'test-server',
			status: 'active',
			registeredAt: new Date().toISOString(),
			usageCount: 0,
			permissions: ['read'],
			...overrides,
		},
		schema: {
			name,
			description: `Test tool schema for ${name}`,
			inputSchema: z.object({
				input: z.string(),
			}),
			outputSchema: z.object({
				result: z.string(),
			}),
		},
		handler: async () => ({ result: 'test' }),
	};
}
