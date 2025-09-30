/**
 * @file Server Routes
 * @description API routes for MCP server operations
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants.js';

// Local enriched shape used by marketplace (non-breaking superset of base registry manifest)
type MarketplaceServer = import('@cortex-os/mcp-registry').ServerManifest & {
	install?: Record<string, unknown>;
	downloads?: number;
	rating?: number;
	featured?: boolean;
	category?: string;
	updatedAt?: string;
	capabilities?: Record<string, boolean>;
	publisher?: { name?: string };
	security?: { riskLevel?: 'low' | 'medium' | 'high' };
};

const SearchQuerySchema = z.object({
	q: z.string().optional(),
	category: z.string().optional(),
	riskLevel: z.enum(['low', 'medium', 'high']).optional(),
	featured: z.coerce.boolean().optional(),
	publisher: z.string().optional(),
	minRating: z.coerce.number().min(0).max(5).optional(),
	tags: z
		.string()
		.transform((str) => str.split(','))
		.optional(),
	capabilities: z
		.string()
		.transform((str) => str.split(',') as Array<'tools' | 'resources' | 'prompts'>)
		.optional(),

	limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),

	offset: z.coerce.number().min(0).default(0),
	sortBy: z.enum(['relevance', 'downloads', 'rating', 'updated']).default('relevance'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const ServerIdSchema = z
	.string()
	.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, 'Invalid server ID format');

export async function serverRoutes(fastify: FastifyInstance): Promise<void> {
	function getInstallForClient(
		installData: Record<string, unknown>,
		client?: string,
	):
		| { client: string; command: string; instructions: string; config: Record<string, unknown> }
		| {
				available: string[];
				claude?: unknown;
				cline?: unknown;
				['cortex-mcp']?: unknown;
				continue?: unknown;
				json?: unknown;
		  } {
		let command = '';
		let instructions = '';
		let config: Record<string, unknown> = {};

		switch (client) {
			case 'claude':
				command = typeof installData.claude === 'string' ? installData.claude : '';
				instructions = command
					? `Run this command in Claude Desktop: ${command}`
					: 'Install via Claude settings';
				config = (installData.json as Record<string, unknown>) || {};
				break;
			case 'cline':
				command = typeof installData.cline === 'string' ? installData.cline : '';
				instructions = command
					? `Run this command in Cline: ${command}`
					: 'Install via Cline MCP settings';
				break;
			case 'cortex-mcp':
			case 'cursor': {
				const cortexInstall =
					typeof installData['cortex-mcp'] === 'string' ? installData['cortex-mcp'] : undefined;
				const legacyCursorInstall =
					typeof installData.cursor === 'string' ? installData.cursor : undefined;
				command = cortexInstall ?? legacyCursorInstall ?? '';
				instructions = command || 'Add to cortex-mcp (local MCP) configuration';
				break;
			}
			case 'continue':
				command = typeof installData.continue === 'string' ? installData.continue : '';
				instructions = command || 'Configure in Continue settings';
				break;
			default:
				return {
					available: Object.keys(installData)
						.filter((key) => key !== 'json')
						.map((k) => (k === 'cursor' ? 'cortex-mcp' : k)),
					claude: installData.claude,
					cline: installData.cline,
					'cortex-mcp': installData['cortex-mcp'] ?? installData.cursor,
					continue: installData.continue,
					json: installData.json,
				};
		}

		return { client: client || 'generic', command, instructions, config };
	}
	// Server search
	fastify.get(
		'/servers/search',
		{
			schema: {
				tags: ['servers'],
				summary: 'Search MCP servers',
				description: 'Search and filter MCP servers',
				querystring: {
					type: 'object',
					properties: {
						q: { type: 'string', description: 'Search query' },
						category: { type: 'string', description: 'Filter by category' },
						riskLevel: {
							type: 'string',
							enum: ['low', 'medium', 'high'],
							description: 'Filter by risk level',
						},
						featured: {
							type: 'boolean',
							description: 'Filter featured servers',
						},
						publisher: {
							type: 'string',
							description: 'Filter by publisher name',
						},
						minRating: {
							type: 'number',
							minimum: 0,
							maximum: 5,
							description: 'Minimum rating',
						},
						tags: { type: 'string', description: 'Comma-separated tags' },
						capabilities: {
							type: 'string',
							description: 'Comma-separated capabilities (tools,resources,prompts)',
						},

						limit: {
							type: 'integer',
							minimum: 1,
							maximum: MAX_LIMIT,
							default: DEFAULT_LIMIT,
						},

						offset: { type: 'integer', minimum: 0, default: 0 },
						sortBy: {
							type: 'string',
							enum: ['relevance', 'downloads', 'rating', 'updated'],
							default: 'relevance',
						},
						sortOrder: {
							type: 'string',
							enum: ['asc', 'desc'],
							default: 'desc',
						},
					},
				},
				response: {
					200: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							data: {
								type: 'array',
								items: { $ref: 'ServerManifest#' },
							},
							meta: {
								type: 'object',
								properties: {
									total: { type: 'integer' },
									offset: { type: 'integer' },
									limit: { type: 'integer' },
									facets: {
										type: 'object',
										properties: {
											categories: { type: 'object' },
											riskLevels: { type: 'object' },
											publishers: { type: 'object' },
										},
									},
								},
							},
						},
					},
					400: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							error: { type: 'object' },
						},
					},
				},
			},
		},
		async (request, reply) => {
			try {
				const query = SearchQuerySchema.parse(request.query);
				const result = await fastify.marketplaceService.search(query);

				return {
					success: true,
					data: result.servers,
					meta: {
						total: result.total,
						offset: result.offset,
						limit: result.limit,
						facets: result.facets,
					},
				};
			} catch (error) {
				if (error instanceof z.ZodError) {
					return (reply as FastifyReply).status(400).send({
						success: false,
						error: {
							code: 'INVALID_REQUEST',
							message: 'Invalid search parameters',
							details: error.errors,
						},
					});
				}
				throw error;
			}
		},
	);

	// Get server by ID
	fastify.get(
		'/servers/:id',
		{
			schema: {
				tags: ['servers'],
				summary: 'Get server details',
				description: 'Get detailed information about a specific MCP server',
				params: {
					type: 'object',
					properties: {
						id: {
							type: 'string',
							pattern: '^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$',
						},
					},
					required: ['id'],
				},
				response: {
					200: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							data: { $ref: 'ServerManifest#' },
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
					400: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							error: { type: 'object' },
						},
					},
				},
			},
		},
		async (request, reply) => {
			try {
				const { id } = request.params as { id: string };
				const validatedId = ServerIdSchema.parse(id);

				const server = await fastify.marketplaceService.getServer(validatedId);

				if (!server) {
					return (reply as FastifyReply).status(404).send({
						success: false,
						error: {
							code: 'SERVER_NOT_FOUND',
							message: `Server '${id}' not found`,
						},
					});
				}

				return {
					success: true,
					data: server,
				};
			} catch (error) {
				if (error instanceof z.ZodError) {
					return (reply as FastifyReply).status(400).send({
						success: false,
						error: {
							code: 'INVALID_REQUEST',
							message: 'Invalid server ID format',
							details: error.errors,
						},
					});
				}
				throw error;
			}
		},
	);

	// Get server installation instructions
	fastify.get(
		'/servers/:id/install',
		{
			schema: {
				tags: ['servers'],
				summary: 'Get installation instructions',
				description: 'Get client-specific installation instructions for a server',
				params: {
					type: 'object',
					properties: {
						id: {
							type: 'string',
							pattern: '^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$',
						},
					},
					required: ['id'],
				},
				querystring: {
					type: 'object',
					properties: {
						client: {
							type: 'string',
							enum: ['claude', 'cline', 'cortex-mcp', 'cursor', 'continue', 'devin', 'windsurf'],
							description: 'Target client for installation instructions',
						},
					},
				},
				response: {
					200: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							data: {
								type: 'object',
								properties: {
									client: { type: 'string' },
									command: { type: 'string' },
									instructions: { type: 'string' },
									config: { type: 'object' },
								},
							},
						},
					},
					404: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							error: { type: 'object' },
						},
					},
					400: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							error: { type: 'object' },
						},
					},
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const { client } = request.query as { client?: string };

			const validatedId = ServerIdSchema.parse(id);
			const server = (await fastify.marketplaceService.getServer(
				validatedId,
			)) as MarketplaceServer | null;

			if (!server) {
				return (reply as FastifyReply).status(404).send({
					success: false,
					error: {
						code: 'SERVER_NOT_FOUND',
						message: `Server '${id}' not found`,
					},
				});
			}

			// Generate client-specific installation instructions using helper
			const installData = server.install ?? {};
			const installResult = getInstallForClient(installData, client);

			// If helper returned the generic available listing (no specific client), forward it directly
			if ('available' in installResult) {
				return { success: true, data: installResult };
			}

			return { success: true, data: installResult };
		},
	);
}
