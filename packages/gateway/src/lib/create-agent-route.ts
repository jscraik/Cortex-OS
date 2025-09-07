import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createJsonOutput } from "@cortex-os/lib";
import { z, type ZodTypeAny } from "zod";

const CommonQuery = z.object({ json: z.coerce.boolean().optional() });

export function createAgentRoute<T extends ZodTypeAny>(
        app: FastifyInstance,
        path: string,
        schema: T,
        handler: (input: z.infer<T>) => Promise<unknown>,
) {
        app.post(path, async (req: FastifyRequest, reply: FastifyReply) => {
                const q = CommonQuery.safeParse(req.query);
                if (!q.success) {
                        reply
                                .status(400)
                                .header("content-type", "application/json")
                                .send(
                                        createJsonOutput({
                                                error: {
                                                        code: "INVALID_QUERY",
                                                        message: "Invalid query parameters",
                                                        details: q.error.format(),
                                                },
                                        }),
                                );
                        return;
                }

                const body = (req.body ?? {}) as unknown;
                const parsed = schema.safeParse({ ...(body as object), json: q.data.json });
                if (!parsed.success) {
                        reply
                                .status(400)
                                .header("content-type", "application/json")
                                .send(
                                        createJsonOutput({
                                                error: {
                                                        code: "INVALID_BODY",
                                                        message: "Request body failed validation",
                                                        details: parsed.error.format(),
                                                },
                                        }),
                                );
                        return;
                }

                const out = await handler(parsed.data);
                reply.header(
                        "content-type",
                        parsed.data.json ? "application/json" : "text/plain",
                );
                return out;
        });
}
