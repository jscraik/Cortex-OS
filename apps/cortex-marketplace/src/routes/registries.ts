/**
 * @file Registry Routes
 * @description API routes for registry management
 */

import type { FastifyInstance } from 'fastify';

export async function registryRoutes(fastify: FastifyInstance): Promise<void> {
	// List all registries
	fastify.get(
		'/registries',
		{
			schema: {
				tags: ['registries'],
				summary: 'List registries',
				description: 'Get list of all configured registries with their status',
				response: {
					200: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							data: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										name: { type: 'string' },
										url: { type: 'string' },
										healthy: { type: 'boolean' },
										lastUpdated: { type: 'string' },
										serverCount: { type: 'integer' },
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
			const registries = await fastify.registryService.listRegistries();

			return {
				success: true,
				data: registries,
			};
		},
	);

	// Get registry status
	fastify.get(
		'/registries/:name/status',
		{
			schema: {
				tags: ['registries'],
				summary: 'Get registry status',
				description: 'Get health status and metadata for a specific registry',
				params: {
					type: 'object',
					properties: {
						name: { type: 'string' },
					},
					required: ['name'],
				},
				response: {
					200: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							data: {
								type: 'object',
								properties: {
									healthy: { type: 'boolean' },
									lastUpdated: { type: 'string' },
									error: { type: 'string' },
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
		async (_request, _reply) => {
			const { name } = _request.params as { name: string };

			try {
				const status = await fastify.registryService.getRegistryStatus(name);

				return {
					success: true,
					data: status,
				};
			} catch (error) {
				if (error instanceof Error && error.message.includes('not found')) {
					return _reply.status(404).send({
						success: false,
						error: {
							code: 'REGISTRY_NOT_FOUND',
							message: `Registry '${name}' not found`,
						},
					});
				}
				throw error;
			}
		},
	);

	// Refresh registry cache
	fastify.post(
		'/registries/:name/refresh',
		{
			schema: {
				tags: ['registries'],
				summary: 'Refresh registry',
				description: 'Force refresh of registry data, clearing cache',
				params: {
					type: 'object',
					properties: {
						name: { type: 'string' },
					},
					required: ['name'],
				},
				response: {
					200: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							message: { type: 'string' },
						},
					},
					404: {
						type: 'object',
						properties: {
							error: { type: 'string' },
							code: { type: 'string' },
						},
					},
				},
			},
		},
		async (_request, _reply) => {
			const { name } = _request.params as { name: string };

			try {
				await fastify.registryService.refreshRegistry(name);

				return {
					success: true,
					message: `Registry '${name}' refreshed successfully`,
				};
			} catch (error) {
				if (error instanceof Error && error.message.includes('not found')) {
					return _reply.status(404).send({
						success: false,
						error: {
							code: 'REGISTRY_NOT_FOUND',
							message: `Registry '${name}' not found`,
						},
					});
				}
				throw error;
			}
		},
	);

	// Refresh all registries
	fastify.post(
		'/registries/refresh',
		{
			schema: {
				tags: ['registries'],
				summary: 'Refresh all registries',
				description: 'Force refresh of all registry data, clearing all caches',
				response: {
					200: {
						type: 'object',
						properties: {
							success: { type: 'boolean' },
							message: { type: 'string' },
							results: {
								type: 'object',
								properties: {
									refreshed: { type: 'array', items: { type: 'string' } },
									failed: { type: 'array', items: { type: 'string' } },
								},
							},
						},
					},
					500: {
						type: 'object',
						properties: {
							error: { type: 'string' },
							code: { type: 'string' },
						},
					},
				},
			},
		},
		async (_request, _reply) => {
			try {
				const registries = await fastify.registryService.listRegistries();
				await fastify.registryService.refreshAll();
				return {
					success: true,
					message: `Refreshed all ${registries.length} registries`,
				};
			} catch (error) {
				fastify.log.error(
					`Failed to refresh registries: ${error instanceof Error ? error.message : String(error)}`,
				);
				return _reply.status(500).send({
					error: 'Failed to refresh registries',
					code: 'REFRESH_FAILED',
				});
			}
		},
	);
}
