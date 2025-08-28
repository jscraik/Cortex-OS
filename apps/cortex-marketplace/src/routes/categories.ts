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
    async (request, reply) => {
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
            limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT },
            offset: { type: 'integer', minimum: 0, default: 0 },
            sortBy: {
              type: 'string',
              enum: ['relevance', 'downloads', 'rating', 'updated'],
              default: 'relevance',
            },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
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
    async (request, reply) => {
      const { category } = request.params as { category: string };
      const query = request.query as any;

      const searchRequest = {
        category,
        limit: query.limit || 20,
        offset: query.offset || 0,
        sortBy: query.sortBy || 'relevance',
        sortOrder: query.sortOrder || 'desc',
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
