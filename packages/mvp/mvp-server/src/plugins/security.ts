import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function securityPlugin(app: FastifyInstance) {
	await app.register(helmet);
	await app.register(cors, { origin: false });
	await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });
	await app.register(underPressure, {
		maxEventLoopDelay: 1000,
		pressureHandler: (_request: FastifyRequest, reply: FastifyReply) => {
			reply.code(503).send({ ok: false });
		},
	});
}
