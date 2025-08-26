import type { FastifyInstance } from "fastify";
import { createLogger } from "@cortex-os/mvp-core";

export async function loggingPlugin(app: FastifyInstance) {
  app.decorate("logCore", createLogger("mvp-server"));
}

declare module "fastify" {
  interface FastifyInstance {
    logCore: ReturnType<typeof createLogger>;
  }
}

