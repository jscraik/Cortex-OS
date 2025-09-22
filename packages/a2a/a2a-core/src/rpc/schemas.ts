import { z } from 'zod';

// A2A Protocol JSON-RPC Schemas
export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.unknown().optional(),
  id: z.union([z.string(), z.number()]),
});

export const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.unknown().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }).optional(),
  id: z.union([z.string(), z.number()]).nullable(),
});

// A2A specific schemas
export const TaskSendSchema = z.object({
  message: z.object({
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(z.object({
      text: z.string(),
    })),
  }),
  context: z.array(z.unknown()).default([]),
  streaming: z.boolean().optional(),
});

export const TaskGetSchema = z.object({
  taskId: z.string(),
});

export const TaskCancelSchema = z.object({
  taskId: z.string(),
  reason: z.string().optional(),
});

export const StreamRequestSchema = z.object({
  taskId: z.string(),
  events: z.array(z.enum(['progress', 'completion', 'error'])),
});

export const ConversationStartSchema = z.object({
  agentId: z.string(),
  context: z.array(z.unknown()).optional(),
});

export const ConversationContinueSchema = z.object({
  sessionId: z.string(),
  message: z.object({
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(z.object({
      text: z.string(),
    })),
  }),
});

export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;
export type TaskSendParams = z.infer<typeof TaskSendSchema>;
export type TaskGetParams = z.infer<typeof TaskGetSchema>;
export type TaskCancelParams = z.infer<typeof TaskCancelSchema>;
export type StreamRequestParams = z.infer<typeof StreamRequestSchema>;
export type ConversationStartParams = z.infer<typeof ConversationStartSchema>;
export type ConversationContinueParams = z.infer<typeof ConversationContinueSchema>;

export class JsonRpcError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'JsonRpcError';
  }
}

// Standard JSON-RPC error codes
export const JsonRpcErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;
