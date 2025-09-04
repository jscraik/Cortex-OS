import Fastify from "fastify";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { registerErrorHandler } from "./middleware/error.js";
import { loggingPlugin } from "./plugins/logging.js";
import { securityPlugin } from "./plugins/security.js";
import { healthRoutes } from "./routes/health.js";
import { metricsRoutes } from "./routes/metrics.js";
import { versionRoutes } from "./routes/version.js";

export function buildServer() {
	const env = z.object({ CORTEX_MCP_TOKEN: z.string() }).parse(process.env);
	const app = Fastify();

        app.addHook("onRequest", async (req, reply) => {
                const auth = req.headers.authorization;
                if (!auth || !auth.startsWith("Bearer ")) {
                        reply.code(401).send({ error: "Unauthorized" });
                        return;
                }

                const provided = auth.slice(7);
                const expected = env.CORTEX_MCP_TOKEN;
                const providedBuf = Buffer.from(provided);
                const expectedBuf = Buffer.from(expected);

                const valid =
                        providedBuf.length === expectedBuf.length &&
                        timingSafeEqual(providedBuf, expectedBuf);

                if (!valid) {
                        reply.code(401).send({ error: "Unauthorized" });
                }
        });

        app.register(loggingPlugin);
        app.register(securityPlugin);
        app.register(registerErrorHandler);
	app.register(healthRoutes);
	app.register(metricsRoutes);
	app.register(versionRoutes);

	return app;
}
