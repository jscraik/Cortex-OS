import type { FastifyInstance } from 'fastify';
import { cfg } from '../config.js';

export async function versionRoutes(app: FastifyInstance) {
	app.get('/version', async (_req, reply) => {
		reply.send({
			name: cfg.serviceName,
			version: cfg.serviceVersion,
			env: process.env.NODE_ENV ?? 'development',
		});
	});
}
