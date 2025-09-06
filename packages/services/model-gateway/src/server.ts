import Fastify from "fastify";
import { z } from "zod";
import { ModelRouter } from "./model-router.js";
import { applyAuditPolicy } from "./lib/applyAuditPolicy.js";

const EmbeddingsSchema = z.object({
        model: z.string().optional(),
        texts: z.array(z.string()).min(1),
});

const RerankSchema = z.object({
        model: z.string().optional(),
        query: z.string(),
        documents: z.array(z.string()).min(1),
});

const ChatSchema = z.object({
        model: z.string().optional(),
        messages: z.array(
                z.object({
                        role: z.enum(["system", "user", "assistant"]),
                        content: z.string(),
                }),
        ),
});

export function createServer(router = new ModelRouter()) {
        const app = Fastify();

        app.post("/embeddings", async (req, reply) => {
                const body = EmbeddingsSchema.parse(req.body);
                await applyAuditPolicy(req, "embeddings", body);
                const result =
                        body.texts.length === 1
                                ? await router.generateEmbedding({ text: body.texts[0], model: body.model })
                                : await router.generateEmbeddings({ texts: body.texts, model: body.model });
                const vectors = "embedding" in result ? [result.embedding] : result.embeddings;
                return reply.send({ vectors, modelUsed: result.model });
        });

        app.post("/rerank", async (req, reply) => {
                const body = RerankSchema.parse(req.body);
                await applyAuditPolicy(req, "rerank", body);
                const { documents, scores, model } = await router.rerank({
                        query: body.query,
                        documents: body.documents,
                        model: body.model,
                });
                return reply.send({ documents, scores, modelUsed: model });
        });

        app.post("/chat", async (req, reply) => {
                const body = ChatSchema.parse(req.body);
                await applyAuditPolicy(req, "chat", body);
                const { content, model } = await router.generateChat({
                        messages: body.messages,
                        model: body.model,
                });
                return reply.send({ content, modelUsed: model });
        });

        return app;
}

if (import.meta.main) {
        const server = createServer();
        const port = Number(process.env.PORT) || 3000;
        server.listen({ port, host: "0.0.0.0" });
}
