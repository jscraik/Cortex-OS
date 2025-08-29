import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { z } from 'zod';
import { ModelRouter } from './model-router';

import {
  embeddingsHandler,
  rerankHandler,
  chatHandler,
  type EmbeddingsBody,
  type RerankBody,
  type ChatBody,
} from './handlers';
import { applyAuditPolicy } from './lib/applyAuditPolicy';


export function createServer(router?: ModelRouter): FastifyInstance {
  const app = Fastify({ logger: true });
  const modelRouter = router || new ModelRouter();

  app.post('/embeddings', async (req, reply) => {
    const parsed = EmbeddingsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'Invalid request body', details: parsed.error.flatten() });
    }
    const body = parsed.data;
    console.log('[model-gateway] /embeddings request body:', JSON.stringify(body));
    try {

      await applyAuditPolicy(req, 'embeddings', body);
      const result = await embeddingsHandler(modelRouter, body);
      return reply.send(result);

    } catch (error) {
      const status = (error as any).status || 500;
      console.error('Embedding error:', error);
      return reply.status(status).send({
        error: error instanceof Error ? error.message : 'Unknown embedding error',
      });
    }
  });

  app.post('/rerank', async (req, reply) => {

    const body = req.body as RerankBody;

    try {
      await applyAuditPolicy(req, 'rerank', body);
      const result = await rerankHandler(modelRouter, body);
      return reply.send(result);
    } catch (error) {
      const status = (error as any).status || 500;
      console.error('Reranking error:', error);
      return reply.status(status).send({
        error: error instanceof Error ? error.message : 'Unknown reranking error',
      });
    }
  });

  app.post('/chat', async (req, reply) => {

    const body = req.body as ChatBody;

    try {
      await applyAuditPolicy(req, 'chat', body);
      const result = await chatHandler(modelRouter, body);
      return reply.send(result);
    } catch (error) {
      const status = (error as any).status || 500;
      console.error('Chat error:', error);
      return reply.status(status).send({
        error: error instanceof Error ? error.message : 'Unknown chat error',
      });
    }
  });

  return app;
}

export async function start(port = Number(process.env.MODEL_GATEWAY_PORT || 8081)) {
  const modelRouter = new ModelRouter();
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
