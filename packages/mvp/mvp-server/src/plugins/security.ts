import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

export async function securityPlugin(app: FastifyInstance) {
	await app.register(helmet as unknown as FastifyPluginAsync);
	// Cast the entire register call to bypass type checking for plugin options
	await (app.register as any)(cors, { origin: false });
	await (app.register as any)(rateLimit, { max: 60, timeWindow: '1 minute' });
	await (app.register as any)(underPressure, {
		maxEventLoopDelay: 1000,
		pressureHandler: (_request: FastifyRequest, reply: FastifyReply) => {
			reply.code(503).send({ ok: false });
		},
	});
}
