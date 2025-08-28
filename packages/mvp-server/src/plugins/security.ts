import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import underPressure from '@fastify/under-pressure';

export async function securityPlugin(app: FastifyInstance) {
  await app.register(helmet);
  await app.register(cors, { origin: false });
  await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });
  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    pressureHandler: (_req, res) => res.code(503).send({ ok: false }),
  });
}
