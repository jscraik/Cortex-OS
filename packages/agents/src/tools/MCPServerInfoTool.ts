import { createTool } from '@voltagent/core';
import { createPinoLogger } from '@voltagent/logger';
import { z } from 'zod';
import { MCPClient } from '../utils/mcpClient';

const logger = createPinoLogger({ name: 'MCPServerInfoTool' });

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

export const MCPServerInfoTool = createTool({
	id: 'mcp-server-info',
	name: 'mcp_server_info',
	description: 'Get detailed information about a specific MCP server',

	parameters: z.object({
		serverName: z.string().min(1),
		detailed: z.boolean().optional().default(false),
	}),

	async execute(params) {
		logger.info(`Getting info for MCP server: ${params.serverName}`);

		try {
			const client = getMCPClient();
			const serverInfo = await client.getServerInfo(
				params.serverName,
				params.detailed,
			);

			return {
				success: true,
				...serverInfo,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			logger.error(
				`Failed to get MCP server info: ${params.serverName}:`,
				error as Error,
			);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				serverName: params.serverName,
				status: 'error',
				capabilities: [],
				tools: [],
				timestamp: new Date().toISOString(),
			};
		}
	},
});
