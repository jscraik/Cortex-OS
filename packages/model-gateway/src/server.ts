import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import client from 'prom-client';
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

  // Prometheus metrics
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry, prefix: 'model_gateway_' });
  const reqCounter = new client.Counter({
    name: 'model_gateway_requests_total',
    help: 'Total requests by route',
    labelNames: ['route', 'status'] as const,
    registers: [registry],
  });
  const latencyHist = new client.Histogram({
    name: 'model_gateway_request_duration_seconds',
    help: 'Request duration (s) by route',
    labelNames: ['route'] as const,
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    registers: [registry],
  });

  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', registry.contentType);
    return reply.send(await registry.metrics());
  });

  app.get('/health', async (_req, reply) => {
    const caps = {
      embedding: modelRouter.hasAvailableModels('embedding'),
      chat: modelRouter.hasAvailableModels('chat'),
      reranking: modelRouter.hasAvailableModels('reranking'),
    };
    return reply.send({ status: 'ok', capabilities: caps });
  });

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

    const endTimer = latencyHist.startTimer({ route: 'embeddings' });
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

      const resBody = {
        vectors,
        dimensions: vectors[0]?.length || 0,
        modelUsed,
      };
      reqCounter.inc({ route: 'embeddings', status: '200' });
      endTimer();
      return reply.send(resBody);
    } catch (error) {
      console.error('Embedding error:', error);
      reqCounter.inc({ route: 'embeddings', status: '500' });
      endTimer();
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

    const endTimer = latencyHist.startTimer({ route: 'rerank' });
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

      const resBody = {
        rankedItems: ranked.slice(0, body.topK ?? ranked.length),
        modelUsed: result.model,
      };
      reqCounter.inc({ route: 'rerank', status: '200' });
      endTimer();
      return reply.send(resBody);
    } catch (error) {
      console.error('Reranking error:', error);
      reqCounter.inc({ route: 'rerank', status: '500' });
      endTimer();
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

    const endTimer = latencyHist.startTimer({ route: 'chat' });
    try {
      if (!modelRouter.hasCapability('chat')) {
        reqCounter.inc({ route: 'chat', status: '503' });
        endTimer();
        return reply.status(503).send({ error: 'No chat models available' });
      }
      const result = await modelRouter.generateChat({
        messages: body.msgs,
        model: body.model,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const resBody = {
        content: result.content,
        modelUsed: result.model,
      };
      reqCounter.inc({ route: 'chat', status: '200' });
      endTimer();
      return reply.send(resBody);
    } catch (error) {
      console.error('Chat error:', error);
      reqCounter.inc({ route: 'chat', status: '500' });
      endTimer();
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
