import { createPinoLogger } from '@voltagent/logger';
import { z } from 'zod';
import { MCPClient } from '../utils/mcpClient';
import { createTool } from './mocks/voltagent-core.js';

const logger = createPinoLogger({ name: 'MCPCallToolTool' });

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

export const MCPCallToolTool = createTool({
	id: 'mcp-call-tool',
	name: 'mcp_call_tool',
	description: 'Call a tool on an MCP server with proper parameter validation',

	parameters: z.object({
		/**
		 * MCP server name
		 */
		serverName: z.string().min(1),
		/**
		 * Tool name to call
		 */
		toolName: z.string().min(1),
		/**
		 * Tool parameters
		 */
		parameters: z.record(z.any()).optional().default({}),
		/**
		 * Request timeout in milliseconds
		 */
		timeout: z.number().int().min(1000).max(300000).optional().default(30000),
		/**
		 * Include server response metadata
		 */
		includeMetadata: z.boolean().optional().default(false),
		/**
		 * Auto-connect to server if not connected
		 */
		autoConnect: z.boolean().optional().default(true),
	}),

	async execute(params: {
		serverName: string;
		toolName: string;
		parameters?: Record<string, unknown>;
		timeout?: number;
		includeMetadata?: boolean;
		autoConnect?: boolean;
	}) {
		logger.info(`Calling MCP tool: ${params.serverName}.${params.toolName}`);

		try {
			const client = getMCPClient();

			// Check if server is connected, auto-connect if enabled
			const serverInfo = await client.getServerInfo(params.serverName);
			if (serverInfo.status !== 'connected') {
				if (params.autoConnect) {
					logger.info(`Auto-connecting to server: ${params.serverName}`);
					const connected = await client.connect(params.serverName);
					if (!connected) {
						throw new Error(
							`Failed to connect to MCP server: ${params.serverName}`,
						);
					}
				} else {
					throw new Error(`MCP server not connected: ${params.serverName}`);
				}
			}

			// Validate tool exists
			const toolSchema = await client.getToolSchema(
				params.serverName,
				params.toolName,
			);
			if (!toolSchema) {
				throw new Error(
					`Tool not found: ${params.toolName} on server ${params.serverName}`,
				);
			}

			// Validate parameters against schema if provided
			if (toolSchema.inputSchema) {
				const validationResult = validateParameters(
					params.parameters || {},
					toolSchema.inputSchema,
				);
				if (!validationResult.valid) {
					throw new Error(
						`Parameter validation failed: ${validationResult.error}`,
					);
				}
			}

			// Call the tool
			const result = await client.callTool(
				params.serverName,
				params.toolName,
				params.parameters,
				{
					timeout: params.timeout,
					includeMetadata: params.includeMetadata,
				},
			);

			return {
				success: true,
				result: result.result,
				serverName: params.serverName,
				toolName: params.toolName,
				executionTime: result.executionTime,
				metadata: result.metadata,
				timestamp: new Date().toISOString(),
			};
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error('MCP tool call failed:', error as Error);
			return {
				success: false,
				error: errorMessage || 'Unknown error occurred',
				serverName: params.serverName,
				toolName: params.toolName,
				timestamp: new Date().toISOString(),
			};
		}
	},
});

// Simple parameter validation (in production, use a proper schema validator)
function validateParameters(
	parameters: Record<string, unknown>,
	schema: Record<string, unknown>,
): { valid: boolean; error?: string } {
	try {
		// Basic validation - in production, use a proper JSON Schema validator
		if (schema.type === 'object' && schema.properties) {
			const required = (schema as any).required || [];
			const properties = (schema as any).properties || {};
			// Check required properties
			for (const req of required) {
				if (!(req in parameters)) {
					return { valid: false, error: `Missing required parameter: ${req}` };
				}
			}

			// Check parameter types
			for (const [key, value] of Object.entries(parameters)) {
				const propSchema = properties[key];
				if (propSchema?.type) {
					if (propSchema.type === 'string' && typeof value !== 'string') {
						return { valid: false, error: `Parameter ${key} must be a string` };
					}
					if (propSchema.type === 'number' && typeof value !== 'number') {
						return { valid: false, error: `Parameter ${key} must be a number` };
					}
					if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
						return {
							valid: false,
							error: `Parameter ${key} must be a boolean`,
						};
					}
				}
			}
		}

		return { valid: true };
	} catch (error) {
		return {
			valid: false,
			error: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}
