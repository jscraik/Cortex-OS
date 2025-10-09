import fastify from 'fastify';
import { logger } from './observability/logger.js';
import { withOpenTelemetry } from './observability/otel.js';
import { memoryRoutes } from './routes/memory.js';

const server = fastify({ logger });

withOpenTelemetry(server);

server.register(memoryRoutes, { prefix: '/v1' });

server.get('/health', async (_request, reply) => {
	return reply.send({ brand: 'brAInwav', status: 'ok' });
});

const start = async () => {
	try {
		await server.listen({ port: 3028, host: '0.0.0.0' });
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

start();
