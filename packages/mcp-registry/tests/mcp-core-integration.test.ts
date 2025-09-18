/**
 * MCP Core integration test for registry tools
 *
 * Demonstrates how the registry tools integrate with mcp-core's ToolRegistry
 */

import { ToolRegistry } from '@cortex-os/mcp-core';
import { describe, expect, it } from 'vitest';
import { registryListTool, registryMcpTools, registryRegisterTool } from '../src/mcp/tools.js';

describe('MCP Core Integration', () => {
	it('should register all registry tools with MCP Core ToolRegistry', () => {
		const toolRegistry = new ToolRegistry();

		// Register all registry MCP tools
		registryMcpTools.forEach((tool) => {
			// Convert our tool format to MCP Core format
			const mcpTool = {
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
				execute: async (input: unknown) => {
					const response = await tool.handler(input);
					if (response.isError) {
						const errorContent = JSON.parse(response.content[0].text);
						throw new Error(`${errorContent.error}: ${errorContent.message}`);
					}
					return JSON.parse(response.content[0].text);
				},
			};

			toolRegistry.register(mcpTool);
		});

		// Verify all tools are registered
		const registeredTools = toolRegistry.list();
		expect(registeredTools).toHaveLength(5);

		const toolNames = registeredTools.map((tool) => tool.name).sort();
		expect(toolNames).toEqual([
			'registry.get',
			'registry.list',
			'registry.register',
			'registry.stats',
			'registry.unregister',
		]);
	});

	it('should execute registry tools through MCP Core ToolRegistry', async () => {
		const toolRegistry = new ToolRegistry();

		// Register the list tool
		const mcpListTool = {
			name: registryListTool.name,
			description: registryListTool.description,
			inputSchema: registryListTool.inputSchema,
			execute: async (input: unknown) => {
				const response = await registryListTool.handler(input);
				if (response.isError) {
					const errorContent = JSON.parse(response.content[0].text);
					throw new Error(`${errorContent.error}: ${errorContent.message}`);
				}
				return JSON.parse(response.content[0].text);
			},
		};

		toolRegistry.register(mcpListTool);

		// Execute the tool through the registry
		const result = (await toolRegistry.execute('registry.list', {
			limit: 10,
		})) as {
			servers: unknown[];
			total: number;
			filtered: number;
			returned: number;
		};

		expect(result).toBeDefined();
		expect(result.servers).toBeDefined();
		expect(result.total).toBeDefined();
		expect(result.filtered).toBeDefined();
		expect(result.returned).toBeDefined();
	});

	it('should handle tool validation errors through MCP Core', async () => {
		const toolRegistry = new ToolRegistry();

		// Register the register tool
		const mcpRegisterTool = {
			name: registryRegisterTool.name,
			description: registryRegisterTool.description,
			inputSchema: registryRegisterTool.inputSchema,
			execute: async (input: unknown) => {
				const response = await registryRegisterTool.handler(input);
				if (response.isError) {
					const errorContent = JSON.parse(response.content[0].text);
					throw new Error(`${errorContent.error}: ${errorContent.message}`);
				}
				return JSON.parse(response.content[0].text);
			},
		};

		toolRegistry.register(mcpRegisterTool);

		// Try to execute with invalid input
		await expect(
			toolRegistry.execute('registry.register', { invalidField: 'value' }),
		).rejects.toThrow();
	});

	it('should provide proper MCP tool metadata', () => {
		registryMcpTools.forEach((tool) => {
			// Verify required MCP tool properties
			expect(tool.name).toBeDefined();
			expect(tool.name).toMatch(/^registry\./);
			expect(tool.description).toBeDefined();
			expect(tool.description.length).toBeGreaterThan(10);
			expect(tool.inputSchema).toBeDefined();
			expect(tool.handler).toBeDefined();
			expect(typeof tool.handler).toBe('function');

			// Verify optional properties
			if (tool.aliases) {
				expect(Array.isArray(tool.aliases)).toBe(true);
				expect(tool.aliases.length).toBeGreaterThan(0);
			}

			if (tool.invoke) {
				expect(typeof tool.invoke).toBe('function');
			}
		});
	});

	it('should provide consistent response format across all tools', async () => {
		// Test all tools for consistent response structure
		const consistencyTests = [
			{ tool: registryListTool, input: {} },
			{
				tool: registryRegisterTool,
				input: {
					server: {
						name: 'test-consistency',
						transport: 'stdio',
						command: 'test',
					},
				},
			},
		];

		for (const { tool, input } of consistencyTests) {
			const response = await tool.handler(input);

			// All responses should have these properties
			expect(response.content).toBeDefined();
			expect(Array.isArray(response.content)).toBe(true);
			expect(response.content.length).toBeGreaterThan(0);
			expect(response.content[0].type).toBe('text');
			expect(response.content[0].text).toBeDefined();

			expect(response.metadata).toBeDefined();
			expect(response.metadata.correlationId).toBeDefined();
			expect(response.metadata.timestamp).toBeDefined();
			expect(response.metadata.tool).toBe(tool.name);

			// Content should be valid JSON
			expect(() => JSON.parse(response.content[0].text)).not.toThrow();

			// Error flag should be boolean when present
			if (response.isError !== undefined) {
				expect(typeof response.isError).toBe('boolean');
			}
		}
	});
});
