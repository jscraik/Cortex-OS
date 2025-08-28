import fastify from 'fastify';
import { registerErrorHandler } from './middleware/error.js';
import { loggingPlugin } from './plugins/logging.js';
import { securityPlugin } from './plugins/security.js';
import { healthRoutes } from './routes/health.js';
import { metricsRoutes } from './routes/metrics.js';
import { versionRoutes } from './routes/version.js';
import { cfg } from './config.js';

export function buildServer() {
  const app = fastify({
    logger: true,
    disableRequestLogging: true,
    bodyLimit: 1048576, // 1MB
  });

  // Register plugins
  app.register(loggingPlugin);
  app.register(securityPlugin);
  app.register(registerErrorHandler);

  // Register routes
  app.register(healthRoutes, { prefix: '/api' });
  app.register(metricsRoutes, { prefix: '/api' });
  app.register(versionRoutes, { prefix: '/api' });

  // Root route
  app.get('/', async (_req, reply) => {
    reply.send({
      name: cfg.serviceName,
      version: cfg.serviceVersion,
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: 'Route not found',
      statusCode: 404,
    });
  });

  return app;
}
