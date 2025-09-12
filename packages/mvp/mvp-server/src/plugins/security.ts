import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import type { FastifyInstance } from 'fastify';

export async function securityPlugin(app: FastifyInstance) {
	await app.register(helmet as any);
	await app.register(cors as any, { origin: false });
	await app.register(rateLimit as any, { max: 60, timeWindow: '1 minute' });
	await app.register(underPressure as any, {
		maxEventLoopDelay: 1000,
		pressureHandler: (_req, res) => res.code(503).send({ ok: false }),
	});
}
