import { createMemoryProviderFromEnv, type MemoryProvider } from '@cortex-os/memory-core';
import type { FastifyInstance } from 'fastify';
import { memorySchemas } from '../schemas/memorySchemas.js';

export async function memoryRoutes(fastify: FastifyInstance) {
	const provider: MemoryProvider = createMemoryProviderFromEnv();

	fastify.post(
		'/memory.store',
		{ schema: { body: memorySchemas.store } },
		async (request, reply) => {
			const result = await provider.store(request.body as any);
			return reply.send(result);
		},
	);

	fastify.post(
		'/memory.search',
		{ schema: { body: memorySchemas.search } },
		async (request, reply) => {
			const result = await provider.search(request.body as any);
			return reply.send(result);
		},
	);

	fastify.post('/memory.get', { schema: { body: memorySchemas.get } }, async (request, reply) => {
		const result = await provider.get(request.body as any);
		return reply.send(result);
	});

	fastify.post(
		'/memory.delete',
		{ schema: { body: memorySchemas.remove } },
		async (request, reply) => {
			const result = await provider.remove(request.body as any);
			return reply.send(result);
		},
	);
}
