/**
 * @file Stats Routes
 * @description API routes for marketplace statistics
 */

import type { FastifyInstance } from "fastify";

export async function statsRoutes(fastify: FastifyInstance): Promise<void> {
	// Get marketplace statistics
	fastify.get(
		"/stats",
		{
			schema: {
				tags: ["stats"],
				summary: "Get marketplace stats",
				description: "Get overall marketplace statistics and metrics",
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								properties: {
									totalServers: { type: "integer" },
									totalDownloads: { type: "integer" },
									totalPublishers: { type: "integer" },
									featuredCount: { type: "integer" },
									categoryBreakdown: {
										type: "object",
										additionalProperties: { type: "integer" },
									},
									riskLevelBreakdown: {
										type: "object",
										additionalProperties: { type: "integer" },
									},
									averageRating: { type: "number" },
									recentlyUpdated: { type: "integer" },
								},
							},
						},
					},
				},
			},
		},
		async (_request, _reply) => {
			const stats = await fastify.marketplaceService.getStats();

			return {
				success: true,
				data: stats,
			};
		},
	);

	// Get trending servers
	fastify.get(
		"/stats/trending",
		{
			schema: {
				tags: ["stats"],
				summary: "Get trending servers",
				description: "Get servers with recent download spikes or updates",
				querystring: {
					type: "object",
					properties: {
						period: {
							type: "string",
							enum: ["day", "week", "month"],
							default: "week",
						},
						limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
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
									period: { type: "string" },
									limit: { type: "integer" },
								},
							},
						},
					},
				},
			},
		},
		async (_request, _reply) => {
			const query = request.query as { period?: string; limit?: number };

			// For now, return recently updated servers as trending
			// In a real implementation, this would track download velocity
			const searchRequest = {
				sortBy: "updated" as const,
				sortOrder: "desc" as const,
				limit: query.limit || 10,
				offset: 0,
			};

			const result = await fastify.marketplaceService.search(searchRequest);

			return {
				success: true,
				data: result.servers,
				meta: {
					period: query.period || "week",
					limit: query.limit || 10,
				},
			};
		},
	);

	// Get popular servers
	fastify.get(
		"/stats/popular",
		{
			schema: {
				tags: ["stats"],
				summary: "Get popular servers",
				description: "Get most downloaded servers",
				querystring: {
					type: "object",
					properties: {
						category: { type: "string", description: "Filter by category" },
						limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
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
									category: { type: "string" },
									limit: { type: "integer" },
								},
							},
						},
					},
				},
			},
		},
		async (_request, _reply) => {
			const query = request.query as { category?: string; limit?: number };

			const searchRequest = {
				category: query.category,
				sortBy: "downloads" as const,
				sortOrder: "desc" as const,
				limit: query.limit || 10,
				offset: 0,
			};

			const result = await fastify.marketplaceService.search(searchRequest);

			return {
				success: true,
				data: result.servers,
				meta: {
					category: query.category,
					limit: query.limit || 10,
				},
			};
		},
	);

	// Get top rated servers
	fastify.get(
		"/stats/top-rated",
		{
			schema: {
				tags: ["stats"],
				summary: "Get top rated servers",
				description: "Get highest rated servers",
				querystring: {
					type: "object",
					properties: {
						category: { type: "string", description: "Filter by category" },
						minDownloads: {
							type: "integer",
							minimum: 0,
							description: "Minimum download count",
							default: 100,
						},
						limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
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
									category: { type: "string" },
									minDownloads: { type: "integer" },
									limit: { type: "integer" },
								},
							},
						},
					},
				},
			},
		},
		async (_request, _reply) => {
			const query = request.query as {
				category?: string;
				minDownloads?: number;
				limit?: number;
			};

			const searchRequest = {
				category: query.category,
				sortBy: "rating" as const,
				sortOrder: "desc" as const,
				limit: 100, // Get more results to filter by download count
				offset: 0,
			};

			const result = await fastify.marketplaceService.search(searchRequest);

			// Filter by minimum downloads and apply final limit
			const minDownloads = query.minDownloads || 100;
			const filtered = result.servers
				.filter((server) => (server.downloads || 0) >= minDownloads)
				.slice(0, query.limit || 10);

			return {
				success: true,
				data: filtered,
				meta: {
					category: query.category,
					minDownloads,
					limit: query.limit || 10,
				},
			};
		},
	);
}
