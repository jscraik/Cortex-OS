// Stub implementations for testing
const auditEvent = (service: string, operation: string, context: any, data: any) => ({
  service,
  operation,
  context,
  data,
  timestamp: new Date().toISOString(),
});

const record = async (event: any) => {
  console.log('Audit event:', event);
};

const loadGrant = async (service: string) => ({
  rules: {
    allow_embeddings: true,
    allow_rerank: true,
    allow_chat: true,
    allow_frontier: false,
    require_hitl_for_frontier: true,
  },
});

const enforce = (grant: any, operation: string, data: any) => {
  if (!grant?.rules?.[`allow_${operation}`]) {
    throw new Error(`Operation ${operation} not allowed by policy`);
  }
};
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { ModelRouter } from './model-router';

type EmbeddingsBody = { model?: string; texts?: string[]; text?: string };
type RerankBody = { model?: string; query: string; docs: string[]; topK?: number };
type ChatBody = {
  model?: string;
  msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  tools?: unknown;
};

export function createServer(router?: ModelRouter): FastifyInstance {
  const app = Fastify({ logger: true });
  const modelRouter = router || new ModelRouter();

  app.post('/embeddings', async (req, reply) => {
    const body = req.body as EmbeddingsBody;
    console.log('[model-gateway] /embeddings request body:', JSON.stringify(body));
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
      const texts = body.texts ?? (body.text ? [body.text] : []);
      if (texts.length === 0) {
        return reply.status(400).send({ error: 'No texts provided' });
      }

      let vectors: number[][];
      if (texts.length === 1) {
        // Single embedding
        const embedding = await modelRouter.generateEmbedding({
          text: texts[0],
          model: body.model,
        });
        vectors = [embedding];
      } else {
        // Batch embeddings
        vectors = await modelRouter.generateEmbeddings({
          texts,
          model: body.model,
        });
      }

      return reply.send({
        vectors,
        dimensions: vectors[0]?.length || 0,
        modelUsed: body.model ?? 'mlx.default',
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

      // Convert to ranked items format expected by consumers
      const ranked = result.documents
        .map((content, index) => ({
          index,
          score: result.scores[index],
          content,
        }))
        .sort((a, b) => b.score - a.score); // Sort by score descending

      return reply.send({
        rankedItems: ranked.slice(0, body.topK ?? ranked.length),
        modelUsed: body.model ?? 'mlx.default',
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
      const content = await modelRouter.generateChat({
        messages: body.msgs,
        model: body.model,
        max_tokens: 1000, // Default max tokens
        temperature: 0.7, // Default temperature
      });

      return reply.send({
        content,
        modelUsed: body.model ?? 'mlx.default',
      });
    } catch (error) {
      console.error('Chat error:', error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown chat error',
      });
    }
  });

  app.post('/frontier', async (req, reply) => {
    const body = req.body as ChatBody & { vendor?: string };
    const grant: any = await loadGrant('model-gateway');
    if (!grant?.rules?.allow_frontier) {
      return reply.status(403).send({ error: 'frontier disabled by policy' });
    }
    // Require an approval header for frontier path
    if (grant?.rules?.require_hitl_for_frontier && req.headers['x-approval'] !== 'allow') {
      return reply.status(403).send({ error: 'HITL approval required for frontier' });
    }
    await record(
      auditEvent(
        'model-gateway',
        'frontier',
        {
          runId: (req.headers['x-run-id'] as string) || 'unknown',
          traceId: req.headers['x-trace-id'] as string,
        },
        body,
      ),
    );
    // Placeholder: do not actually call vendors here
    return reply.send({
      content: 'Frontier call placeholder (blocked unless approved)',
      modelUsed: body.model ?? 'frontier.stub',
    });
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

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(console.error);
}
