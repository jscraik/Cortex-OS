import { createTool, z } from '../mocks/voltagent-core';
import { createLogger } from '../mocks/voltagent-logger';
import { MCPClient } from '../utils/mcpClient';

const logger = createLogger('MCPListServersTool');

// Default MCP server configuration
const defaultMCPConfig = {
	servers: {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: [
				'-y',
				'@modelcontextprotocol/server-filesystem',
				'/Users/jamiecraik',
			],
		},
		memory: {
			name: 'memory',
			command: 'npx',
			args: ['-y', '@cortex-os/mcp-server-memory'],
		},
		git: {
			name: 'git',
			command: 'npx',
			args: [
				'-y',
				'@modelcontextprotocol/server-git',
				'--repository',
				'/Users/jamiecraik/.Cortex-OS',
			],
		},
	},
};

let mcpClient: MCPClient | null = null;

function getMCPClient(): MCPClient {
	if (!mcpClient) {
		mcpClient = new MCPClient(defaultMCPConfig);
	}
	return mcpClient;
}

export const MCPListServersTool = createTool({
	id: 'mcp-list-servers',
	name: 'mcp_list_servers',
	description: 'List all available MCP servers and their status',

	parameters: z.object({
		status: z
			.enum(['all', 'connected', 'disconnected'])
			.optional()
			.default('all'),
		detailed: z.boolean().optional().default(false),
	}),

	async execute(params, _context) {
		logger.info('Listing MCP servers');

		try {
			const client = getMCPClient();
			const servers = await client.listServers(params.status);

			return {
				success: true,
				servers,
				count: servers.length,
				filter: params.status,
				detailed: params.detailed,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			logger.error('Failed to list MCP servers:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				servers: [],
				count: 0,
				timestamp: new Date().toISOString(),
			};
		}
	},
});
