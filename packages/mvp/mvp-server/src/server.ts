import Fastify from 'fastify';
import { z } from 'zod';
import { registerErrorHandler } from './middleware/error.js';
import { loggingPlugin } from './plugins/logging.js';
import { securityPlugin } from './plugins/security.js';
import { healthRoutes } from './routes/health.js';
import { metricsRoutes } from './routes/metrics.js';
import { versionRoutes } from './routes/version.js';

export function buildServer() {
  const env = z.object({ CORTEX_MCP_TOKEN: z.string() }).parse(process.env);
  const app = Fastify();

  app.addHook('onRequest', async (req, reply) => {
    if (req.headers.authorization !== `Bearer ${env.CORTEX_MCP_TOKEN}`) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.register(loggingPlugin);
  app.register(securityPlugin);
  registerErrorHandler(app);
  app.register(healthRoutes);
  app.register(metricsRoutes);
  app.register(versionRoutes);

  return app;
}
