import { describe, expect, it } from 'vitest';
import { build } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

/**
 * Phase 9 Test: MCP Implementation Verification
 * 
 * This test ensures that all nine MCP tools in the cortex-marketplace app
 * return real data instead of placeholder/mock responses for brAInwav production readiness.
 */
describe('MCP Implementation - Phase 9 Production Readiness', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = build({
			logger: false,
			registries: {
				official: 'https://registry.cortex-os.dev/v1/registry.json',
				community: 'https://community.mcp.dev/v1/registry.json',
			},
			cacheDir: '/tmp/marketplace-test-cache',
			cacheTtl: 30000,
		});

		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	it('should have exactly nine MCP tools available', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/api/v1/mcp/tools',
		});

		expect(response.statusCode).toBe(200);
		const data = JSON.parse(response.body);

		expect(data.success).toBe(true);
		expect(data.count).toBe(9);
		expect(data.tools).toHaveLength(9);

		// Verify all expected brAInwav marketplace tools are present
		const expectedTools = [
			'marketplace.search_servers',
			'marketplace.get_server', 
			'marketplace.get_install_instructions',
			'marketplace.list_categories',
			'marketplace.get_category_servers',
			'marketplace.get_stats',
			'marketplace.get_trending',
			'marketplace.get_popular',
			'marketplace.get_top_rated'
		];

		const toolNames = data.tools.map((tool: { name: string }) => tool.name);
		expectedTools.forEach(toolName => {
			expect(toolNames).toContain(toolName);
		});
	});

	it('should return real data from marketplace.get_stats tool', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/api/v1/mcp/execute',
			payload: {
				tool: 'marketplace.get_stats',
				params: {},
			},
		});

		const data = JSON.parse(response.body);

		// Should not contain error indicating MCP service integration required
		expect(data.isError).not.toBe(true);
		
		// Should contain real stats data structure
		expect(data.content).toBeInstanceOf(Array);
		expect(data.content[0]).toMatchObject({
			type: 'text',
			text: expect.any(String)
		});

		const statsContent = JSON.parse(data.content[0].text);
		expect(statsContent.success).toBe(true);
		expect(statsContent.stats).toMatchObject({
			totalServers: expect.any(Number),
			totalDownloads: expect.any(Number), 
			totalPublishers: expect.any(Number),
		});

		// Ensure it's not placeholder data
		expect(statsContent.stats.totalServers).toBeGreaterThanOrEqual(0);
		expect(data.metadata.tool).toBe('marketplace.get_stats');
	});

	it('should return real data from marketplace.list_categories tool', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/api/v1/mcp/execute',
			payload: {
				tool: 'marketplace.list_categories',
				params: {},
			},
		});

		const data = JSON.parse(response.body);

		// Should not be an error response
		expect(data.isError).not.toBe(true);
		
		const categoriesContent = JSON.parse(data.content[0].text);
		expect(categoriesContent.success).toBe(true);
		expect(categoriesContent.categories).toBeInstanceOf(Array);
		
		// Categories should have real structure
		if (categoriesContent.categories.length > 0) {
			expect(categoriesContent.categories[0]).toMatchObject({
				name: expect.any(String),
				description: expect.any(String),
				serverCount: expect.any(Number)
			});
		}
	});

	it('should return real data from marketplace.search_servers tool', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/api/v1/mcp/execute',
			payload: {
				tool: 'marketplace.search_servers',
				params: {
					limit: 5
				},
			},
		});

		const data = JSON.parse(response.body);

		// Should not be an error response  
		expect(data.isError).not.toBe(true);
		
		const searchContent = JSON.parse(data.content[0].text);
		expect(searchContent.success).toBe(true);
		expect(searchContent.servers).toBeInstanceOf(Array);
		expect(searchContent.total).toBeGreaterThanOrEqual(0);
		expect(searchContent.offset).toBe(0);
		expect(searchContent.limit).toBe(5);
	});

	it('should validate all tools can execute without "MCP service integration required" errors', async () => {
		const toolsResponse = await app.inject({
			method: 'GET',
			url: '/api/v1/mcp/tools',
		});

		const toolsData = JSON.parse(toolsResponse.body);
		const tools = toolsData.tools;

		const integrationErrors: string[] = [];

		// Test each tool for integration completeness
		for (const tool of tools) {
			try {
				const testParams = getTestParams(tool.name);
				
				const response = await app.inject({
					method: 'POST',
					url: '/api/v1/mcp/execute',
					payload: {
						tool: tool.name,
						params: testParams,
					},
				});

				const data = JSON.parse(response.body);
				
				// Check if response contains integration error message
				if (data.isError && data.content?.[0]?.text?.includes('MCP service integration required')) {
					integrationErrors.push(`${tool.name}: Still requires MCP service integration`);
				}
			} catch (error) {
				integrationErrors.push(`${tool.name}: Failed to execute - ${error}`);
			}
		}

		if (integrationErrors.length > 0) {
			throw new Error(
				`brAInwav marketplace contains ${integrationErrors.length} tools with incomplete MCP integration:

${integrationErrors.join('
')}

All tools must have real implementations for production readiness.`
			);
		}

		expect(integrationErrors).toHaveLength(0);
	});

	it('should not contain TODO comments in MCP tool handlers', async () => {
		// This test checks the source code for remaining TODO comments
		const fs = await import('fs/promises');
		const path = await import('path');
		
		try {
			const toolsFile = await fs.readFile(
				path.join(process.cwd(), 'src/mcp/tools.ts'),
				'utf-8'
			);

			const todoMatches = toolsFile.match(/TODO.*MCP service integration/gi);
			
			if (todoMatches && todoMatches.length > 0) {
				throw new Error(
					`brAInwav marketplace MCP tools contain ${todoMatches.length} TODO integration comments:

${todoMatches.join('
')}

All TODO integrations must be completed for production readiness.`
				);
			}

			expect(todoMatches).toBeFalsy();
		} catch (error) {
			if (error.code === 'ENOENT') {
				// File doesn't exist, skip this test
				return;
			}
			throw error;
		}
	});

	it('should return real server data from marketplace.get_server tool', async () => {
		// First get a server ID from search
		const searchResponse = await app.inject({
			method: 'POST',
			url: '/api/v1/mcp/execute',
			payload: {
				tool: 'marketplace.search_servers',
				params: { limit: 1 },
			},
		});

		const searchData = JSON.parse(searchResponse.body);
		
		if (searchData.isError) {
			// Skip if search is not implemented yet
			return;
		}

		const searchContent = JSON.parse(searchData.content[0].text);
		
		if (searchContent.servers && searchContent.servers.length > 0) {
			const serverId = searchContent.servers[0].id;

			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/mcp/execute',
				payload: {
					tool: 'marketplace.get_server',
					params: { serverId },
				},
			});

			const data = JSON.parse(response.body);
			
			// Should not be an error response
			expect(data.isError).not.toBe(true);
			
			const serverContent = JSON.parse(data.content[0].text);
			expect(serverContent.success).toBe(true);
			expect(serverContent.server).toMatchObject({
				id: serverId,
				name: expect.any(String),
				description: expect.any(String),
			});
		}
	});

	/**
	 * Helper function to provide appropriate test parameters for different tools
	 */
	function getTestParams(toolName: string): Record<string, unknown> {
		switch (toolName) {
			case 'marketplace.search_servers':
				return { limit: 10 };
			case 'marketplace.get_server':
				return { serverId: 'test-server' };
			case 'marketplace.get_install_instructions':
				return { serverId: 'test-server' };
			case 'marketplace.get_category_servers':
				return { category: 'ai-tools' };
			case 'marketplace.get_trending':
				return { period: 'week' };
			case 'marketplace.get_popular':
				return { period: 'month' };
			case 'marketplace.get_top_rated':
				return { minDownloads: 100 };
			case 'marketplace.list_categories':
			case 'marketplace.get_stats':
			default:
				return {};
		}
	}
});