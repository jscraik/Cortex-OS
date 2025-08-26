import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { loggingPlugin } from "./plugins/logging.js";
import { securityPlugin } from "./plugins/security.js";
import { registerErrorHandler } from "./middleware/error.js";
import { healthRoutes } from "./routes/health.js";
import { versionRoutes } from "./routes/version.js";
import { metricsRoutes } from "./routes/metrics.js";

export const requestIdHook = (app: any) => {
  app.addHook("onRequest", (req: any, _res: any, done: any) => {
    req.id = req.headers["x-request-id"] ?? randomUUID();
    done();
  });
};

export function buildServer() {
  const app = Fastify({ logger: { level: "info" } });
  requestIdHook(app);
  void app.register(loggingPlugin);
  void app.register(securityPlugin);
  registerErrorHandler(app);
  void app.register(healthRoutes);
  void app.register(versionRoutes);
  void app.register(metricsRoutes);
  return app;
}

