import { handleA2A } from '@cortex-os/a2a';
import {
  A2AMessageSchema,
  AgentConfigSchema,
  MCPRequestSchema,
  RAGQuerySchema,
  SimlabCommandSchema,
} from '@cortex-os/contracts';
import { createJsonOutput } from '@cortex-os/lib';
import { handleMCP } from '@cortex-os/mcp';
import { handleRAG } from '@cortex-os/rag';
import { handleSimlab } from '@cortex-os/simlab';
import Fastify from 'fastify';
import client from 'prom-client';
import { z } from 'zod';
import { createAgentRoute } from './lib/create-agent-route.js';

const app = Fastify({ logger: true });

const { default: openapiSpec } = await import('../openapi.json', { assert: { type: 'json' } });

createAgentRoute(
  app,
  '/mcp',
  z.object({ config: AgentConfigSchema, request: MCPRequestSchema, json: z.boolean().optional() }),
  handleMCP,
);

createAgentRoute(
  app,
  '/a2a',
  z.object({ config: AgentConfigSchema, message: A2AMessageSchema, json: z.boolean().optional() }),
  handleA2A,
);

createAgentRoute(
  app,
  '/rag',
  z.object({ config: AgentConfigSchema, query: RAGQuerySchema, json: z.boolean().optional() }),
  handleRAG,
);

createAgentRoute(
  app,
  '/simlab',
  z.object({
    config: AgentConfigSchema,
    command: SimlabCommandSchema,
    json: z.boolean().optional(),
  }),
  handleSimlab,
);

app.get('/openapi.json', async (_req, reply) => {
  reply.header('content-type', 'application/json');
  return createJsonOutput(openapiSpec);
});

export async function start(port = Number(process.env.PORT) || 3333) {
  await app.listen({ port, host: '0.0.0.0' });
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void start();
}

const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpHistogram = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['route', 'method', 'status'] as const,
  buckets: [10, 25, 50, 100, 200, 300, 400, 600, 800, 1200, 2000],
  registers: [register],
});
const httpErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'HTTP request errors',
  labelNames: ['route', 'method'] as const,
  registers: [register],
});

app.addHook('onResponse', async (req, reply) => {
  try {
    const route = req.routeOptions?.url || req.url;
    const method = req.method;
    const status = String(reply.statusCode);
    const diff = Number(reply.getResponseTime());
    httpHistogram.labels({ route, method, status }).observe(diff);
    if (reply.statusCode >= 500) httpErrors.labels({ route, method }).inc();
  } catch (err) {
    app.log.error({ err }, 'metrics collection failed');
  }
});

app.get('/metrics', async (_req, reply) => {
  reply.header('content-type', register.contentType);
  return register.metrics();
});
