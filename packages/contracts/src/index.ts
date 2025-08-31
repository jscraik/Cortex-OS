import { z } from 'zod';

// Shared envelope for cross-domain message contracts
export const MessageEnvelopeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['MCP', 'A2A', 'RAG', 'SIMLAB']),
  ts: z.string().datetime({ offset: true }),
  payload: z.unknown(),
  meta: z.object({ seed: z.number().int().positive(), traceId: z.string().optional() }),
});
export type MessageEnvelope = z.infer<typeof MessageEnvelopeSchema>;

// Agent configuration schema with resource caps
export const AgentConfigSchema = z.object({
  seed: z.number().int().positive().default(1),
  maxTokens: z.number().int().positive().max(4096).default(1024),
  timeoutMs: z.number().int().positive().max(120_000).default(30_000),
  memory: z.object({ maxItems: z.number().int().positive(), maxBytes: z.number().int().positive() }),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Structured error response contract
export const ErrorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.record(z.unknown()).optional() }),
  timestamp: z.string().datetime({ offset: true }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const A2AMessageSchema = z.object({
  from: z.string(),
  to: z.string(),
  action: z.string(),
  data: z.record(z.unknown()).optional(),
});
export type A2AMessage = z.infer<typeof A2AMessageSchema>;

export const MCPRequestSchema = z.object({
  tool: z.string(),
  args: z.record(z.unknown()).optional(),
});
export type MCPRequest = z.infer<typeof MCPRequestSchema>;

export const RAGQuerySchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().positive().max(100).default(5),
});
export type RAGQuery = z.infer<typeof RAGQuerySchema>;

export const SimlabCommandSchema = z.object({
  scenario: z.string(),
  step: z.string(),
  params: z.record(z.unknown()).optional(),
});
export type SimlabCommand = z.infer<typeof SimlabCommandSchema>;
