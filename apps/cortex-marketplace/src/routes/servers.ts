/**
 * @file Server Routes
 * @description API routes for MCP server operations
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";

const SearchQuerySchema = z.object({
	q: z.string().optional(),
	category: z.string().optional(),
	riskLevel: z.enum(["low", "medium", "high"]).optional(),
	featured: z.coerce.boolean().optional(),
	publisher: z.string().optional(),
	minRating: z.coerce.number().min(0).max(5).optional(),
	tags: z
		.string()
		.transform((str) => str.split(","))
		.optional(),
	capabilities: z
		.string()
		.transform(
			(str) => str.split(",") as Array<"tools" | "resources" | "prompts">,
		)
		.optional(),

	limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),

	offset: z.coerce.number().min(0).default(0),
	sortBy: z
		.enum(["relevance", "downloads", "rating", "updated"])
		.default("relevance"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const ServerIdSchema = z
	.string()
	.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, "Invalid server ID format");

export async function serverRoutes(fastify: FastifyInstance): Promise<void> {
	// Server search
	fastify.get(
		"/servers/search",
		{
			schema: {
				tags: ["servers"],
				summary: "Search MCP servers",
				description: "Search and filter MCP servers",
				querystring: {
					type: "object",
					properties: {
						q: { type: "string", description: "Search query" },
						category: { type: "string", description: "Filter by category" },
						riskLevel: {
							type: "string",
							enum: ["low", "medium", "high"],
							description: "Filter by risk level",
						},
						featured: {
							type: "boolean",
							description: "Filter featured servers",
						},
						publisher: {
							type: "string",
							description: "Filter by publisher name",
						},
						minRating: {
							type: "number",
							minimum: 0,
							maximum: 5,
							description: "Minimum rating",
						},
						tags: { type: "string", description: "Comma-separated tags" },
						capabilities: {
							type: "string",
							description:
								"Comma-separated capabilities (tools,resources,prompts)",
						},

						limit: {
							type: "integer",
							minimum: 1,
							maximum: MAX_LIMIT,
							default: DEFAULT_LIMIT,
						},

						offset: { type: "integer", minimum: 0, default: 0 },
						sortBy: {
							type: "string",
							enum: ["relevance", "downloads", "rating", "updated"],
							default: "relevance",
						},
						sortOrder: {
							type: "string",
							enum: ["asc", "desc"],
							default: "desc",
						},
					},
				},
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "array",
								items: { $ref: "ServerManifest#" },
							},
							meta: {
								type: "object",
								properties: {
									total: { type: "integer" },
									offset: { type: "integer" },
									limit: { type: "integer" },
									facets: {
										type: "object",
										properties: {
											categories: { type: "object" },
											riskLevels: { type: "object" },
											publishers: { type: "object" },
										},
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
					return reply.status(400).send({
						success: false,
						error: {
							code: "INVALID_REQUEST",
							message: "Invalid search parameters",
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
		"/servers/:id",
		{
			schema: {
				tags: ["servers"],
				summary: "Get server details",
				description: "Get detailed information about a specific MCP server",
				params: {
					type: "object",
					properties: {
						id: {
							type: "string",
							pattern: "^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$",
						},
					},
					required: ["id"],
				},
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: { $ref: "ServerManifest#" },
						},
					},
					404: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							error: {
								type: "object",
								properties: {
									code: { type: "string" },
									message: { type: "string" },
								},
							},
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
					return reply.status(404).send({
						success: false,
						error: {
							code: "SERVER_NOT_FOUND",
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
					return reply.status(400).send({
						success: false,
						error: {
							code: "INVALID_REQUEST",
							message: "Invalid server ID format",
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
		"/servers/:id/install",
		{
			schema: {
				tags: ["servers"],
				summary: "Get installation instructions",
				description:
					"Get client-specific installation instructions for a server",
				params: {
					type: "object",
					properties: {
						id: {
							type: "string",
							pattern: "^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$",
						},
					},
					required: ["id"],
				},
				querystring: {
					type: "object",
					properties: {
						client: {
							type: "string",
							enum: [
								"claude",
								"cline",
								"cursor",
								"continue",
								"devin",
								"windsurf",
							],
							description: "Target client for installation instructions",
						},
					},
				},
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								properties: {
									client: { type: "string" },
									command: { type: "string" },
									instructions: { type: "string" },
									config: { type: "object" },
								},
							},
						},
					},
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const { client } = request.query as { client?: string };

			const validatedId = ServerIdSchema.parse(id);
			const server = await fastify.marketplaceService.getServer(validatedId);

			if (!server) {
				return reply.status(404).send({
					success: false,
					error: {
						code: "SERVER_NOT_FOUND",
						message: `Server '${id}' not found`,
					},
				});
			}

			// Generate client-specific installation instructions
			const installData = server.install;
			let instructions = "";
			let command = "";
			let config = {};

			switch (client) {
				case "claude":
					command = installData.claude || "";
					instructions = `Run this command in Claude Desktop: ${command}`;
					config = installData.json || {};
					break;
				case "cline":
					command = installData.cline || "";
					instructions = installData.cline
						? `Run this command in Cline: ${command}`
						: "Install via Cline MCP settings";
					break;
				case "cursor":
					command = installData.cursor || "";
					instructions =
						installData.cursor || "Add to Cursor MCP configuration";
					break;
				case "continue":
					command = installData.continue || "";
					instructions =
						installData.continue || "Configure in Continue settings";
					break;
				default:
					// Return all available installation options
					return {
						success: true,
						data: {
							available: Object.keys(installData).filter(
								(key) => key !== "json",
							),
							claude: installData.claude,
							cline: installData.cline,
							cursor: installData.cursor,
							continue: installData.continue,
							json: installData.json,
						},
					};
			}

			return {
				success: true,
				data: {
					client: client || "generic",
					command,
					instructions,
					config,
				},
			};
		},
	);

	// Add schema definitions
	fastify.addSchema({
		$id: "ServerManifest",
		type: "object",
		properties: {
			id: { type: "string" },
			name: { type: "string" },
			description: { type: "string" },
			mcpVersion: { type: "string" },
			capabilities: {
				type: "object",
				properties: {
					tools: { type: "boolean" },
					resources: { type: "boolean" },
					prompts: { type: "boolean" },
				},
			},
			publisher: {
				type: "object",
				properties: {
					name: { type: "string" },
					email: { type: "string" },
					verified: { type: "boolean" },
				},
			},
			version: { type: "string" },
			repository: { type: "string" },
			homepage: { type: "string" },
			license: { type: "string" },
			category: { type: "string" },
			tags: { type: "array", items: { type: "string" } },
			transport: { type: "object" },
			install: { type: "object" },
			permissions: { type: "array", items: { type: "string" } },
			security: {
				type: "object",
				properties: {
					riskLevel: { type: "string", enum: ["low", "medium", "high"] },
					sigstore: { type: "string" },
					sbom: { type: "string" },
				},
			},
			featured: { type: "boolean" },
			downloads: { type: "integer" },
			rating: { type: "number" },
			updatedAt: { type: "string" },
		},
	});
}
