import type { FastifyInstance } from "fastify";
import { health } from "@cortex-os/mvp-core";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_req, reply) => {
    const result = await health([{ name: "self", run: async () => ({ ok: true }) }]);
    reply.send(result);
  });
  app.get("/ready", async (_req, reply) => reply.send({ ok: true, timestamp: new Date().toISOString() }));
  app.get("/live", async (_req, reply) => reply.send({ ok: true }));
}

