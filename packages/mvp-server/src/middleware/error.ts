import { AppError, problems } from '@cortex-os/mvp-core';
import type { FastifyError, FastifyInstance, FastifyPluginCallback } from 'fastify';

export const registerErrorHandler: FastifyPluginCallback = (app, _opts, done) => {
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    console.log('Error handler called:', err);
    const p =
      err instanceof AppError
        ? err.problem
        : problems.internal(process.env.NODE_ENV === 'development' ? err.message : undefined);
    reply.code(p.status).type('application/problem+json').send(p);
  });
  done();
};

export default registerErrorHandler;
