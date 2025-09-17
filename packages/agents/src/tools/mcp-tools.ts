import { createTool, z } from '../mocks/voltagent-core';
import { createLogger } from '../mocks/voltagent-logger';

const logger = createLogger('MCPTools');

// Tool for listing available MCP servers
export const listMCPServersTool = createTool({
	id: 'list-mcp-servers',
	name: 'list_mcp_servers',
	description: 'List all available MCP servers and their capabilities',

	parameters: z.object({
		/**
		 * Filter by server status
		 */
		status: z.enum(['all', 'running', 'stopped']).optional().default('all'),
		/**
		 * Include detailed server information
		 */
		detailed: z.boolean().optional().default(false),
	}),

	async execute(params, _context) {
		logger.info('Listing MCP servers');

		try {
			// Simulate listing MCP servers
			const servers = [
				{
					name: 'filesystem',
					status: 'running',
					capabilities: ['read', 'write', 'list', 'delete'],
					tools: ['read_file', 'write_file', 'list_directory'],
				},
				{
					name: 'memory',
					status: 'running',
					capabilities: ['store', 'retrieve', 'search', 'delete'],
					tools: ['store_memory', 'retrieve_memory', 'search_memory'],
				},
			];

			const result = {
				servers:
					params.status === 'all'
						? servers
						: servers.filter((s) => s.status === params.status),
				count: servers.length,
				status: params.status,
				detailed: params.detailed,
				timestamp: new Date().toISOString(),
			};

			logger.info(`Found ${result.servers.length} MCP servers`);
			return result;
		} catch (error) {
			logger.error('Failed to list MCP servers:', error);
			throw error;
		}
	},
});

// Tool for calling MCP tools
export const callMCPTool = createTool({
	id: 'call-mcp-tool',
	name: 'call_mcp_tool',
	description: 'Call a tool on an MCP server',

	parameters: z.object({
		/**
		 * MCP server name
		 */
		server: z.string().min(1),
		/**
		 * Tool name to call
		 */
		tool: z.string().min(1),
		/**
		 * Tool parameters
		 */
		parameters: z.record(z.any()).optional().default({}),
		/**
		 * Timeout in milliseconds
		 */
		timeout: z.number().int().min(1000).max(300000).optional().default(30000),
	}),

	async execute(params, _context) {
		logger.info(`Calling MCP tool: ${params.server}.${params.tool}`);

		try {
			// Simulate MCP tool call
			const result = {
				success: true,
				server: params.server,
				tool: params.tool,
				result: {
					message: `Mock response from ${params.server}.${params.tool}`,
					parameters: params.parameters,
				},
				executionTime: 150,
				timestamp: new Date().toISOString(),
			};

			logger.info(`MCP tool call completed: ${params.server}.${params.tool}`);
			return result;
		} catch (error) {
			logger.error('Failed to call MCP tool:', error);
			throw error;
		}
	},
});

// Aliases for backwards compatibility
export const callMCPToolTool = callMCPTool;
