/**
 * @file MCP Integration Tests
 * @description Integration tests for MCP tools in cortex-marketplace
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../app.js';
import { validateInput, SearchServersInputSchema, GetServerInputSchema } from './tools.js';
import type { FastifyInstance } from 'fastify';

describe('MCP Integration Tests', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = build({
			logger: false,
			registries: {
				test: 'http://localhost:3001/test-registry.json',
			},
			cacheDir: '/tmp/test-cache',
			cacheTtl: 1000,
		});

		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('MCP Tools API', () => {
		it('should list available MCP tools', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/mcp/tools',
			});

			expect(response.statusCode).toBe(200);
			const data = JSON.parse(response.body);

			expect(data).toMatchObject({
				success: true,
				count: expect.any(Number),
				tools: expect.any(Array),
			});

			// Verify we have the expected tools
			const toolNames = data.tools.map((tool: { name: string }) => tool.name);
			expect(toolNames).toContain('marketplace.search_servers');
			expect(toolNames).toContain('marketplace.get_server');
			expect(toolNames).toContain('marketplace.list_categories');
			expect(toolNames).toContain('marketplace.get_stats');
		});

		it('should provide tool details including aliases', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/mcp/tools',
			});

			const data = JSON.parse(response.body);
			const searchTool = data.tools.find((tool: { name: string }) => tool.name === 'marketplace.search_servers');

			expect(searchTool).toMatchObject({
				name: 'marketplace.search_servers',
				description: expect.stringContaining('Search and filter MCP servers'),
				aliases: expect.arrayContaining(['search', 'find_servers']),
			});
		});

		it('should return tool schema information', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/mcp/tools/marketplace.search_servers/schema',
			});

			expect(response.statusCode).toBe(200);
			const data = JSON.parse(response.body);

			expect(data).toMatchObject({
				success: true,
				tool: 'marketplace.search_servers',
				schema: expect.objectContaining({
					description: expect.any(String),
					aliases: expect.any(Array),
				}),
			});
		});

		it('should return 404 for unknown tool schema', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/mcp/tools/unknown_tool/schema',
			});

			expect(response.statusCode).toBe(404);
			const data = JSON.parse(response.body);

			expect(data).toMatchObject({
				success: false,
				error: {
					code: 'TOOL_NOT_FOUND',
					message: "Tool 'unknown_tool' not found",
				},
			});
		});
	});

	describe('MCP Tool Execution', () => {
		it('should execute marketplace.get_stats tool', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/mcp/execute',
				payload: {
					tool: 'marketplace.get_stats',
					params: {},
				},
			});

			// Should respond with MCP tool response format
			const data = JSON.parse(response.body);

			expect(data).toMatchObject({
				content: expect.arrayContaining([
					expect.objectContaining({
						type: 'text',
						text: expect.any(String),
					}),
				]),
				metadata: expect.objectContaining({
					correlationId: expect.any(String),
					timestamp: expect.any(String),
					tool: 'marketplace.get_stats',
				}),
			});

			// The content should contain stats data
			const content = JSON.parse(data.content[0].text);
			expect(content).toMatchObject({
				success: true,
				stats: expect.objectContaining({
					totalServers: expect.any(Number),
					totalDownloads: expect.any(Number),
					totalPublishers: expect.any(Number),
				}),
			});
		});

		it('should execute marketplace.list_categories tool', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/mcp/execute',
				payload: {
					tool: 'marketplace.list_categories',
					params: {},
				},
			});

			const data = JSON.parse(response.body);
			const content = JSON.parse(data.content[0].text);

			expect(content).toMatchObject({
				success: true,
				categories: expect.any(Object),
			});
		});

		it('should validate tool parameters', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/mcp/execute',
				payload: {
					tool: 'marketplace.get_server',
					params: {
						// Missing required serverId
					},
				},
			});

			// Should return validation error
			const data = JSON.parse(response.body);
			expect(data.isError).toBe(true);

			const content = JSON.parse(data.content[0].text);
			expect(content.error.code).toBe('validation_error');
		});

		it('should return 400 for invalid tool name', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/mcp/execute',
				payload: {
					tool: '', // Invalid empty tool name
					params: {},
				},
			});

			expect(response.statusCode).toBe(400);
			const data = JSON.parse(response.body);

			expect(data).toMatchObject({
				success: false,
				error: {
					code: 'INVALID_REQUEST',
					message: 'Tool name is required and must be a string',
				},
			});
		});

		it('should handle unknown tool execution', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/mcp/execute',
				payload: {
					tool: 'unknown.tool',
					params: {},
				},
			});

			// Should return MCP error response
			const data = JSON.parse(response.body);
			expect(data.isError).toBe(true);

			const content = JSON.parse(data.content[0].text);
			expect(content.error.code).toBe('validation_error');
			expect(content.error.message).toContain('Unknown tool');
		});

		it('should work with tool aliases', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/mcp/execute',
				payload: {
					tool: 'stats', // Using alias for marketplace.get_stats
					params: {},
				},
			});

			const data = JSON.parse(response.body);
			expect(data.metadata.tool).toBe('stats');

			const content = JSON.parse(data.content[0].text);
			expect(content.success).toBe(true);
		});
	});
});

describe('MCP Tool Contract Validation', () => {
	it('should validate search_servers input schema', () => {
		// This would be a unit test for the Zod schema validation
		// Testing the validateInput function directly

		// Valid input
		expect(() =>
			validateInput(SearchServersInputSchema, {
				query: 'test',
				limit: 10,
				sortBy: 'relevance',
			}),
		).not.toThrow();

		// Invalid input
		expect(() =>
			validateInput(SearchServersInputSchema, {
				limit: -1, // Invalid negative limit
			}),
		).toThrow();

		expect(() =>
			validateInput(SearchServersInputSchema, {
				sortBy: 'invalid_sort', // Invalid sort option
			}),
		).toThrow();
	});

	it('should validate get_server input schema', () => {

		// Valid input
		expect(() =>
			validateInput(GetServerInputSchema, {
				serverId: 'test-server-id',
			}),
		).not.toThrow();

		// Invalid input
		expect(() =>
			validateInput(GetServerInputSchema, {
				serverId: '', // Empty server ID
			}),
		).toThrow();

		expect(() =>
			validateInput(GetServerInputSchema, {
				// Missing serverId
			}),
		).toThrow();
	});
});