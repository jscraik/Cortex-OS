import { createMemoryProviderFromEnv } from '@cortex-os/memory-core';
import { fastify } from 'fastify';
import { memoryRoutes } from '../src/routes/memory.js';

describe('Memory API E2E', () => {
	const server = fastify();
	const provider = createMemoryProviderFromEnv();

	beforeAll(async () => {
		server.register(memoryRoutes, { prefix: '/v1' });
		await server.listen({ port: 0 });
	});

	afterAll(async () => {
		await server.close();
	});

	it('should have low overhead', async () => {
		const input = { text: 'test' };

		const startProvider = performance.now();
		await provider.store(input);
		const endProvider = performance.now();
		const providerTime = endProvider - startProvider;

		const startApi = performance.now();
		await server.inject({
			method: 'POST',
			url: '/v1/memory.store',
			payload: input,
		});
		const endApi = performance.now();
		const apiTime = endApi - startApi;

		const overhead = apiTime - providerTime;
		expect(overhead).toBeLessThan(10);
	});
});
