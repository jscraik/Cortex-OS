/**
 * @file Category Routes
 * @description API routes for server categories
 */

import type { FastifyInstance } from 'fastify';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants.js';

export async function categoryRoutes(fastify: FastifyInstance): Promise<void> {
	// Get all categories
	fastify.get(
		'/categories',
		{
			schema: {
				tags: ['categories'],
				summary: 'List categories',
				description: 'Get all server categories with counts and descriptions',
				response: {
					200: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							data: {
								type: 'object',
								properties: {
									categories: {
										type: 'object',
										additionalProperties: {
											type: 'object',
											properties: {
												name: { type: 'string' },
												count: { type: 'integer' },
												description: { type: 'string' },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		async (_request, _reply) => {
			const categories = await fastify.marketplaceService.getCategories();

			return {
				success: true,
				data: {
					categories,
				},
			};
		},
	);

	// Get servers by category
	fastify.get(
		'/categories/:category/servers',
		{
			schema: {
				tags: ['categories'],
				summary: 'Get servers by category',
				description: 'Get all servers in a specific category',
				params: {
					type: 'object',
					properties: {
						category: { type: 'string' },
					},
					required: ['category'],
				},
				querystring: {
					type: 'object',
					properties: {
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
									category: { type: 'string' },
								},
							},
						},
					},
				},
			},
		},
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		async (_request, _reply) => {
			const { category } = _request.params as { category: string };
			const queryObj = _request.query as Record<string, unknown>;

			const sortBy = queryObj.sortBy as string;
			const validSortBy = ['relevance', 'downloads', 'rating', 'updated'].includes(sortBy)
				? (sortBy as 'relevance' | 'downloads' | 'rating' | 'updated')
				: 'relevance';
			const sortOrder = queryObj.sortOrder as string;
			const validSortOrder = ['asc', 'desc'].includes(sortOrder)
				? (sortOrder as 'asc' | 'desc')
				: 'desc';

			const searchRequest = {
				category,
				limit: Number(queryObj.limit) || 20,
				offset: Number(queryObj.offset) || 0,
				sortBy: validSortBy,
				sortOrder: validSortOrder,
			};

			const result = await fastify.marketplaceService.search(searchRequest);

			return {
				success: true,
				data: result.servers,
				meta: {
					total: result.total,
					offset: result.offset,
					limit: result.limit,
					category,
				},
			};
		},
	);
}
