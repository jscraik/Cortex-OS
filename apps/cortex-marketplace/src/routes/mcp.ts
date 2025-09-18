/**
 * @file MCP Routes
 * @description API routes for MCP tool integration
 */

import type { FastifyInstance } from 'fastify';
import { createMarketplaceMcpIntegration } from '../mcp/integration.js';

export async function mcpRoutes(fastify: FastifyInstance): Promise<void> {
	// Initialize MCP integration
	const mcpIntegration = createMarketplaceMcpIntegration({
		marketplaceService: fastify.marketplaceService,
		registryService: fastify.registryService,
	});

	// List available MCP tools
	fastify.get(
		'/mcp/tools',
		{
			schema: {
				tags: ['mcp'],
				summary: 'List MCP tools',
				description: 'Get all available MCP tools for the marketplace',
				response: {
					200: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							tools: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										name: { type: 'string' },
										description: { type: 'string' },
										aliases: {
											type: 'array',
											items: { type: 'string' },
										},
									},
								},
							},
							count: { type: 'integer' },
						},
					},
				},
			},
		},
		async () => {
			const tools = mcpIntegration.listTools();

			return {
				success: true,
				tools,
				count: tools.length,
			};
		},
	);

	// Execute MCP tool
	fastify.post(
		'/mcp/execute',
		{
			schema: {
				tags: ['mcp'],
				summary: 'Execute MCP tool',
				description: 'Execute a specific MCP tool with parameters',
				body: {
					type: 'object',
					properties: {
						tool: {
							type: 'string',
							description: 'Tool name or alias to execute',
						},
						params: {
							type: 'object',
							description: 'Tool-specific parameters',
						},
						correlationId: {
							type: 'string',
							description: 'Optional correlation ID for tracking',
						},
					},
					required: ['tool'],
				},
				response: {
					200: {
						type: 'object',
						properties: {
							content: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										type: { type: 'string' },
										text: { type: 'string' },
									},
								},
							},
							metadata: {
								type: 'object',
								properties: {
									correlationId: { type: 'string' },
									timestamp: { type: 'string' },
									tool: { type: 'string' },
								},
							},
							isError: { type: 'boolean' },
						},
					},
					400: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							error: {
								type: 'object',
								properties: {
									code: { type: 'string' },
									message: { type: 'string' },
									details: {
										type: 'array',
										items: { type: 'string' },
									},
								},
							},
						},
					},
					500: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							error: {
								type: 'object',
								properties: {
									code: { type: 'string' },
									message: { type: 'string' },
									details: {
										type: 'array',
										items: { type: 'string' },
									},
								},
							},
						},
					},
				},
			},
		},
		async (request, reply) => {
			try {
				const { tool, params = {} } = request.body as {
					tool: string;
					params?: unknown;
					correlationId?: string;
				};
				if (!tool || typeof tool !== 'string') {
					return reply.status(400).send({
						success: false,
						error: {
							code: 'INVALID_REQUEST',
							message: 'Tool name is required and must be a string',
						},
					});
				}

				const result = await mcpIntegration.executeTool(tool, params);

				// Always ensure error responses have isError flag set correctly
				if (result.isError === true) {
					reply.status(400);
					// Explicitly return the result with isError guaranteed
					return {
						content: result.content,
						metadata: result.metadata,
						isError: true,
					};
				}

				return result;
			} catch (error) {
				fastify.log.error(error, 'MCP tool execution failed');

				return reply.status(500).send({
					success: false,
					error: {
						code: 'INTERNAL_ERROR',
						message: 'Tool execution failed',
						details:
							process.env.NODE_ENV === 'development' && error instanceof Error
								? [error.message]
								: [],
					},
				});
			}
		},
	);

	// Get MCP tool schema
	fastify.get(
		'/mcp/tools/:toolName/schema',
		{
			schema: {
				tags: ['mcp'],
				summary: 'Get tool schema',
				description: 'Get the input schema for a specific MCP tool',
				params: {
					type: 'object',
					properties: {
						toolName: { type: 'string' },
					},
					required: ['toolName'],
				},
				response: {
					200: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							tool: { type: 'string' },
							schema: {
								type: 'object',
								additionalProperties: true,
								properties: {
									description: { type: 'string' },
									aliases: { type: 'array', items: { type: 'string' } },
									inputSchema: { type: 'object', additionalProperties: true },
								},
							},
						},
					},
					404: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							error: {
								type: 'object',
								properties: {
									code: { type: 'string' },
									message: { type: 'string' },
								},
							},
						},
					},
				},
			},
		},
		async (request, reply) => {
			const { toolName } = request.params as { toolName: string };

			const tools = mcpIntegration.listTools();
			const tool = tools.find((t) => t.name === toolName || t.aliases?.includes(toolName));

			if (!tool) {
				return reply.status(404).send({
					success: false,
					error: {
						code: 'TOOL_NOT_FOUND',
						message: `Tool '${toolName}' not found`,
					},
				});
			}

			// Return schema with more details from the tool definition
			return {
				success: true,
				tool: tool.name,
				schema: {
					description: tool.description,
					aliases: tool.aliases || [],
					inputSchema: {
						// For now, return the schema type info
						// In production, you'd extract the Zod schema details
						type: 'object',
						note: 'Full JSON schema introspection requires additional implementation',
					},
				},
			};
		},
	);
}
