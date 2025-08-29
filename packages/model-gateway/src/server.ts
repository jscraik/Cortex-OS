import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { createModelRouter, type ModelRouter } from './model-router.js';
import { auditEvent, record } from './audit';
import { ModelRouter } from './model-router';
import { enforce, loadGrant } from './policy';

type EmbeddingsBody = { model?: string; texts: string[] };
type RerankBody = { model?: string; query: string; docs: string[]; topK?: number };
type ChatBody = {
  model?: string;
  msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  tools?: unknown;
};

export function createServer(router?: ModelRouter): FastifyInstance {
  const app = Fastify({ logger: true });
  const modelRouter = router || createModelRouter();

  app.post('/embeddings', async (req, reply) => {
    const body = req.body as EmbeddingsBody;
    req.log.debug({ body }, 'Received embeddings request');
    const grant = await loadGrant('model-gateway');
    enforce(grant, 'embeddings', body as any);
    await record(
      auditEvent(
        'model-gateway',
        'embeddings',
        {
          runId: (req.headers['x-run-id'] as string) || 'unknown',
          traceId: req.headers['x-trace-id'] as string,
        },
        body,
      ),
    );

    try {
      const texts = body.texts;
      if (!Array.isArray(texts) || texts.length === 0) {
        return reply.status(400).send({ error: 'texts must be a non-empty array' });
      }

      let vectors: number[][] = [];
      let modelUsed: string;

      if (texts.length === 1) {
        const result = await modelRouter.generateEmbedding({
          text: texts[0],
          model: body.model,
        });
        vectors = [result.embedding];
        modelUsed = result.model;
      } else {
        const result = await modelRouter.generateEmbeddings({
          texts,
          model: body.model,
        });
        vectors = result.embeddings;
        modelUsed = result.model;
      }

      return reply.send({
        vectors,
        dimensions: vectors[0]?.length || 0,
        modelUsed,
      });
    } catch (error) {
      console.error('Embedding error:', error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown embedding error',
      });
    }
  });

  app.post('/rerank', async (req, reply) => {
    const body = req.body as RerankBody;
    req.log.debug({ body }, 'Received rerank request');
    const grant = await loadGrant('model-gateway');
    enforce(grant, 'rerank', body as any);
    await record(
      auditEvent(
        'model-gateway',
        'rerank',
        {
          runId: (req.headers['x-run-id'] as string) || 'unknown',
          traceId: req.headers['x-trace-id'] as string,
        },
        body,
      ),
    );

    try {
      const result = await modelRouter.rerank({
        query: body.query,
        documents: body.docs,
        model: body.model,
      });

      const ranked = result.documents
        .map((content, index) => ({
          index,
          score: result.scores[index],
          content,
        }))
        .sort((a, b) => b.score - a.score);

      return reply.send({
        rankedItems: ranked.slice(0, body.topK ?? ranked.length),
        modelUsed: result.model,
      });
    } catch (error) {
      console.error('Reranking error:', error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown reranking error',
      });
    }
  });

  app.post('/chat', async (req, reply) => {
    const body = req.body as ChatBody;
    req.log.debug({ body }, 'Received chat request');
    const grant = await loadGrant('model-gateway');
    enforce(grant, 'chat', body as any);
    await record(
      auditEvent(
        'model-gateway',
        'chat',
        {
          runId: (req.headers['x-run-id'] as string) || 'unknown',
          traceId: req.headers['x-trace-id'] as string,
        },
        body,
      ),
    );

    try {
      if (!modelRouter.hasCapability('chat')) {
        return reply.status(503).send({ error: 'No chat models available' });
      }
      const result = await modelRouter.generateChat({
        messages: body.msgs,
        model: body.model,
        max_tokens: 1000,
        temperature: 0.7,
      });

      return reply.send({
        content: result.content,
        modelUsed: result.model,
      });
    } catch (error) {
      console.error('Chat error:', error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown chat error',
      });
    }
  });

  return app;
}

export async function start(port = Number(process.env.MODEL_GATEWAY_PORT || 8081)) {
  const modelRouter = createModelRouter();
  try {
    console.log('Initializing ModelRouter...');
    await modelRouter.initialize();
    console.log('ModelRouter initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize ModelRouter:', error);
    throw error;
  }

  const app = createServer(modelRouter);
  await app.listen({ port, host: '127.0.0.1' });
  console.log(`Model Gateway server listening on http://127.0.0.1:${port}`);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(console.error);
}
