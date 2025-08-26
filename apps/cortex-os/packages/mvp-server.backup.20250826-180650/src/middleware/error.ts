import type { FastifyInstance, FastifyError } from "fastify";
import { AppError, problems } from "@cortex-os/mvp-core";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    const p = err instanceof AppError
      ? err.problem
      : problems.internal(process.env.NODE_ENV === "development" ? err.message : undefined);
    reply.code(p.status).type("application/problem+json").send(p);
  });
}

