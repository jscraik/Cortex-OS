import type { FastifyInstance } from "fastify";

// Stub. Replace with OTEL MetricReader or prom-client exporter when ready.
export async function metricsRoutes(app: FastifyInstance) {
  app.get("/metrics", async (_req, reply) => {
    reply.type("text/plain").send("# metrics not enabled\n");
  });
}

