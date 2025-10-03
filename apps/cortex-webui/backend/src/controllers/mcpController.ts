/**
 * MCP Controller for cortex-webui
 *
 * Provides REST API endpoints for MCP tool and server management,
 * including tool execution, server registration, and monitoring.
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { McpProtocolIntegration } from '../services/mcp/McpProtocolIntegration.js';
import { McpSecurityManager } from '../services/mcp/McpSecurityManager.js';
import { type ExecutionRequest, McpToolExecutor } from '../services/mcp/McpToolExecutor.js';
import { McpToolRegistry } from '../services/mcp/McpToolRegistry.js';
import logger from '../utils/logger.js';

// Initialize services
const toolRegistry = new McpToolRegistry();
const securityManager = new McpSecurityManager();
const toolExecutor = new McpToolExecutor(securityManager);
const protocolIntegration = new McpProtocolIntegration();

// Request/response schemas
const executeToolSchema = z.object({
	toolId: z.string().uuid(),
	params: z.unknown(),
	timeout: z.number().int().min(1000).max(300000).optional(),
});

const registerServerSchema = z.object({
	name: z.string().min(1).max(128),
	version: z.string().min(1).max(20),
	transport: z.enum(['stdio', 'http', 'ws']),
	command: z.string().optional(),
	args: z.array(z.string()).optional(),
	env: z.record(z.string()).optional(),
	endpoint: z.string().url().optional(),
	headers: z.record(z.string()).optional(),
});

const listToolsSchema = z.object({
	category: z.string().optional(),
	serverName: z.string().optional(),
	tags: z.array(z.string()).optional(),
	status: z.enum(['active', 'inactive', 'error', 'loading']).optional(),
	transport: z.enum(['stdio', 'http', 'ws', 'sse']).optional(),
	limit: z.number().int().min(1).max(100).default(50),
	offset: z.number().int().min(0).default(0),
});

// Helper function to get user context
function getUserContext(req: Request) {
	return {
		userId: (req as any).user?.id,
		sessionId: (req as any).sessionId,
		permissions: (req as any).user?.permissions || [],
		ipAddress: req.ip,
		userAgent: req.get('User-Agent'),
	};
}

/**
 * GET /api/v1/mcp/tools
 * List available MCP tools with optional filtering
 */
export async function listTools(req: Request, res: Response): Promise<void> {
	try {
		const query = listToolsSchema.parse(req.query);
		const tools = toolRegistry.listTools(query);

		res.json({
			success: true,
			data: {
				tools: tools.map((tool) => ({
					id: tool.metadata.id,
					name: tool.metadata.name,
					version: tool.metadata.version,
					description: tool.metadata.description,
					category: tool.metadata.category,
					tags: tool.metadata.tags,
					author: tool.metadata.author,
					transport: tool.metadata.transport,
					serverName: tool.metadata.serverName,
					status: tool.metadata.status,
					registeredAt: tool.metadata.registeredAt,
					lastUsed: tool.metadata.lastUsed,
					usageCount: tool.metadata.usageCount,
					schema: {
						name: tool.schema.name,
						description: tool.schema.description,
						inputSchema: tool.schema.inputSchema,
						outputSchema: tool.schema.outputSchema,
					},
				})),
				total: tools.length,
				limit: query.limit,
				offset: query.offset,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('brAInwav MCP: Failed to list tools', {
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		res.status(400).json({
			success: false,
			error: {
				code: 'INVALID_REQUEST',
				message: 'Failed to list tools',
				details: error instanceof Error ? [error.message] : ['Unknown error'],
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * GET /api/v1/mcp/tools/:id
 * Get detailed information about a specific tool
 */
export async function getTool(req: Request, res: Response): Promise<void> {
	try {
		const { id } = req.params;
		const tool = toolRegistry.getTool(id);

		if (!tool) {
			res.status(404).json({
				success: false,
				error: {
					code: 'TOOL_NOT_FOUND',
					message: 'Tool not found',
					details: [`Tool with ID ${id} not found`],
				},
				timestamp: new Date().toISOString(),
			});
			return;
		}

		res.json({
			success: true,
			data: {
				id: tool.metadata.id,
				name: tool.metadata.name,
				version: tool.metadata.version,
				description: tool.metadata.description,
				category: tool.metadata.category,
				tags: tool.metadata.tags,
				author: tool.metadata.author,
				homepage: tool.metadata.homepage,
				transport: tool.metadata.transport,
				serverName: tool.metadata.serverName,
				status: tool.metadata.status,
				registeredAt: tool.metadata.registeredAt,
				lastUsed: tool.metadata.lastUsed,
				usageCount: tool.metadata.usageCount,
				permissions: tool.metadata.permissions,
				resourceLimits: tool.metadata.resourceLimits,
				schema: {
					name: tool.schema.name,
					description: tool.schema.description,
					inputSchema: tool.schema.inputSchema,
					outputSchema: tool.schema.outputSchema,
				},
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('brAInwav MCP: Failed to get tool', {
			toolId: req.params.id,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		res.status(500).json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Failed to get tool',
				details: error instanceof Error ? [error.message] : ['Unknown error'],
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * POST /api/v1/mcp/tools/:id/execute
 * Execute an MCP tool
 */
export async function executeTool(req: Request, res: Response): Promise<void> {
	try {
		const { id: toolId } = req.params;
		const body = executeToolSchema.parse(req.body);
		const userContext = getUserContext(req);

		// Validate tool exists
		const tool = toolRegistry.getTool(toolId);
		if (!tool) {
			res.status(404).json({
				success: false,
				error: {
					code: 'TOOL_NOT_FOUND',
					message: 'Tool not found',
					details: [`Tool with ID ${toolId} not found`],
				},
				timestamp: new Date().toISOString(),
			});
			return;
		}

		// Create execution request
		const executionRequest: ExecutionRequest = {
			toolId: body.toolId,
			params: body.params,
			context: {
				userId: userContext.userId,
				sessionId: userContext.sessionId,
				correlationId: (req.body as any).correlationId || crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				permissions: userContext.permissions,
			},
			timeout: body.timeout,
		};

		// Execute tool
		const result = await toolExecutor.execute(executionRequest);

		// Return result
		res.status(result.success ? 200 : 400).json({
			...result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('brAInwav MCP: Failed to execute tool', {
			toolId: req.params.id,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		res.status(400).json({
			success: false,
			error: {
				code: 'EXECUTION_ERROR',
				message: 'Failed to execute tool',
				details: error instanceof Error ? [error.message] : ['Unknown error'],
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * GET /api/v1/mcp/servers
 * List registered MCP servers
 */
export async function listServers(_req: Request, res: Response): Promise<void> {
	try {
		const servers = protocolIntegration.listServers();

		res.json({
			success: true,
			data: {
				servers: servers.map((server) => ({
					id: server.info.name,
					name: server.info.name,
					version: server.info.version,
					transport: server.info.transport,
					status: server.status,
					capabilities: server.capabilities,
					toolCount: server.tools.length,
					lastActivity: server.lastActivity,
					error: server.error?.message,
				})),
				total: servers.length,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('brAInwav MCP: Failed to list servers', {
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		res.status(500).json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Failed to list servers',
				details: error instanceof Error ? [error.message] : ['Unknown error'],
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * POST /api/v1/mcp/servers/register
 * Register a new MCP server
 */
export async function registerServer(req: Request, res: Response): Promise<void> {
	try {
		const serverInfo = registerServerSchema.parse(req.body);

		await protocolIntegration.registerServer({
			name: serverInfo.name,
			version: serverInfo.version,
			transport: serverInfo.transport,
			command: serverInfo.command,
			args: serverInfo.args,
			env: serverInfo.env,
			endpoint: serverInfo.endpoint,
			headers: serverInfo.headers,
		});

		res.status(201).json({
			success: true,
			data: {
				id: serverInfo.name,
				name: serverInfo.name,
				version: serverInfo.version,
				transport: serverInfo.transport,
				status: 'connecting',
			},
			message: `Server "${serverInfo.name}" registration initiated`,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('brAInwav MCP: Failed to register server', {
			serverName: req.body.name,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		res.status(400).json({
			success: false,
			error: {
				code: 'REGISTRATION_ERROR',
				message: 'Failed to register server',
				details: error instanceof Error ? [error.message] : ['Unknown error'],
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * GET /api/v1/mcp/servers/:id
 * Get detailed information about a specific server
 */
export async function getServer(req: Request, res: Response): Promise<void> {
	try {
		const { id } = req.params;
		const server = protocolIntegration.getServer(id);

		if (!server) {
			res.status(404).json({
				success: false,
				error: {
					code: 'SERVER_NOT_FOUND',
					message: 'Server not found',
					details: [`Server with ID ${id} not found`],
				},
				timestamp: new Date().toISOString(),
			});
			return;
		}

		res.json({
			success: true,
			data: {
				id: server.info.name,
				name: server.info.name,
				version: server.info.version,
				transport: server.info.transport,
				status: server.status,
				capabilities: server.capabilities,
				tools: server.tools,
				lastActivity: server.lastActivity,
				error: server.error?.message,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('brAInwav MCP: Failed to get server', {
			serverId: req.params.id,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		res.status(500).json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Failed to get server',
				details: error instanceof Error ? [error.message] : ['Unknown error'],
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * DELETE /api/v1/mcp/servers/:id
 * Disconnect and unregister a server
 */
export async function disconnectServer(req: Request, res: Response): Promise<void> {
	try {
		const { id } = req.params;

		await protocolIntegration.disconnectServer(id);

		res.json({
			success: true,
			message: `Server "${id}" disconnected successfully`,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('brAInwav MCP: Failed to disconnect server', {
			serverId: req.params.id,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		res.status(400).json({
			success: false,
			error: {
				code: 'DISCONNECT_ERROR',
				message: 'Failed to disconnect server',
				details: error instanceof Error ? [error.message] : ['Unknown error'],
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * POST /api/v1/mcp/servers/:id/tools/:toolName/call
 * Call a tool on a specific server
 */
export async function callServerTool(req: Request, res: Response): Promise<void> {
	try {
		const { id: serverId, toolName } = req.params;
		const { arguments: args = {} } = req.body;

		const result = await protocolIntegration.callTool(serverId, toolName, args);

		res.json({
			success: true,
			data: result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('brAInwav MCP: Failed to call server tool', {
			serverId: req.params.id,
			toolName: req.params.toolName,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		res.status(400).json({
			success: false,
			error: {
				code: 'TOOL_CALL_ERROR',
				message: 'Failed to call tool',
				details: error instanceof Error ? [error.message] : ['Unknown error'],
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * GET /api/v1/mcp/stats
 * Get MCP system statistics
 */
export async function getStats(_req: Request, res: Response): Promise<void> {
	try {
		const registryStats = toolRegistry.getStats();
		const executionStats = toolExecutor.getStats();
		const securityStats = securityManager.getSecurityStats();
		const servers = protocolIntegration.listServers();

		res.json({
			success: true,
			data: {
				registry: registryStats,
				execution: executionStats,
				security: securityStats,
				servers: {
					total: servers.length,
					connected: servers.filter((s) => s.status === 'connected').length,
					byTransport: servers.reduce(
						(acc, server) => {
							acc[server.info.transport] = (acc[server.info.transport] || 0) + 1;
							return acc;
						},
						{} as Record<string, number>,
					),
				},
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('brAInwav MCP: Failed to get stats', {
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		res.status(500).json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Failed to get statistics',
				details: error instanceof Error ? [error.message] : ['Unknown error'],
			},
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * GET /api/v1/mcp/search
 * Search for tools by query
 */
export async function searchTools(req: Request, res: Response): Promise<void> {
	try {
		const { q: query } = req.query;

		if (!query || typeof query !== 'string') {
			res.status(400).json({
				success: false,
				error: {
					code: 'INVALID_QUERY',
					message: 'Search query is required',
					details: ['Please provide a search query parameter "q"'],
				},
				timestamp: new Date().toISOString(),
			});
			return;
		}

		const tools = toolRegistry.searchTools(query);

		res.json({
			success: true,
			data: {
				query,
				tools: tools.map((tool) => ({
					id: tool.metadata.id,
					name: tool.metadata.name,
					description: tool.metadata.description,
					category: tool.metadata.category,
					tags: tool.metadata.tags,
					serverName: tool.metadata.serverName,
					status: tool.metadata.status,
				})),
				total: tools.length,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('brAInwav MCP: Failed to search tools', {
			query: req.query.q,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		res.status(500).json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Failed to search tools',
				details: error instanceof Error ? [error.message] : ['Unknown error'],
			},
			timestamp: new Date().toISOString(),
		});
	}
}

// Export services for use in other modules
export { toolRegistry, securityManager, toolExecutor, protocolIntegration };
