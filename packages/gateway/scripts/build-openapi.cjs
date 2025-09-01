#!/usr/bin/env node
/* Generate OpenAPI from Zod schemas */
const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');
const { OpenAPIRegistry, OpenAPIGenerator } = require('zod-to-openapi');

const { z } = require('zod');

// Inline import of contracts (require via ts-node would be heavier). Duplicate minimal shapes here tied to contracts names.
const MessageEnvelopeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['MCP', 'A2A', 'RAG', 'SIMLAB']),
  ts: z.string(),
  payload: z.unknown(),
  meta: z.object({ seed: z.number().int().positive(), traceId: z.string().optional() }),
});
const AgentConfigSchema = z.object({
  seed: z.number().int().positive().default(1),
  maxTokens: z.number().int().positive().max(4096).default(1024),
  timeoutMs: z.number().int().positive().max(120000).default(30000),
  memory: z.object({
    maxItems: z.number().int().positive(),
    maxBytes: z.number().int().positive(),
  }),
});
const MCPRequestSchema = z.object({ tool: z.string(), args: z.record(z.unknown()).optional() });
const A2AMessageSchema = z.object({
  from: z.string(),
  to: z.string(),
  action: z.string(),
  data: z.record(z.unknown()).optional(),
});
const RAGQuerySchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().positive().max(100).default(5),
});
const SimlabCommandSchema = z.object({
  scenario: z.string(),
  step: z.string(),
  params: z.record(z.unknown()).optional(),
});

const registry = new OpenAPIRegistry();

const MCPBody = registry.register(
  'MCPBody',
  z.object({ config: AgentConfigSchema, request: MCPRequestSchema, json: z.boolean().optional() })
);
const A2ABody = registry.register(
  'A2ABody',
  z.object({ config: AgentConfigSchema, message: A2AMessageSchema, json: z.boolean().optional() })
);
const RAGBody = registry.register(
  'RAGBody',
  z.object({ config: AgentConfigSchema, query: RAGQuerySchema, json: z.boolean().optional() })
);
const SimlabBody = registry.register(
  'SimlabBody',
  z.object({
    config: AgentConfigSchema,
    command: SimlabCommandSchema,
    json: z.boolean().optional(),
  })
);

const spec = new OpenAPIGenerator(registry.definitions, '3.0.0').generateDocument({
  openapi: '3.0.0',
  info: { title: 'Cortex-OS Gateway', version: '0.0.1' },
  paths: {
    '/mcp': {
      post: {
        requestBody: { required: true, content: { 'application/json': { schema: MCPBody } } },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/a2a': {
      post: {
        requestBody: { required: true, content: { 'application/json': { schema: A2ABody } } },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/rag': {
      post: {
        requestBody: { required: true, content: { 'application/json': { schema: RAGBody } } },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/simlab': {
      post: {
        requestBody: { required: true, content: { 'application/json': { schema: SimlabBody } } },
        responses: { 200: { description: 'OK' } },
      },
    },
  },
});

mkdirSync(join(__dirname, '..', 'dist'), { recursive: true });
writeFileSync(join(__dirname, '..', 'openapi.json'), JSON.stringify(spec, null, 2));
console.log('OpenAPI written to packages/gateway/openapi.json');
