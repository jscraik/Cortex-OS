import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync } from 'fastify';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

describe('rate limiting', () => {
	it('caps requests per client', async () => {
		const app = Fastify();
		await app.register(rateLimit as FastifyPluginAsync, { max: 2, timeWindow: '1 minute' });
		app.get('/ping', async () => 'pong');
		await app.inject({ method: 'GET', url: '/ping' });
		await app.inject({ method: 'GET', url: '/ping' });
		const res = await app.inject({ method: 'GET', url: '/ping' });
		expect(res.statusCode).toBe(429);
		await app.close();
	});
});
