import { createLogger } from '@cortex-os/mvp-core';
import type { FastifyInstance } from 'fastify';

export async function loggingPlugin(app: FastifyInstance) {
  // Check if decorator already exists to avoid conflicts
  if (!app.hasDecorator('logCore')) {
    app.decorate('logCore', createLogger('mvp-server'));
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    logCore: ReturnType<typeof createLogger>;
  }
}
