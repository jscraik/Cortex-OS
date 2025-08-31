/**
 * Shared utilities for JSON-RPC operations
 * Following functional programming principles and DRY patterns
 */

import { z } from 'zod';
import type { JsonRpcResponse, JsonRpcErrorCode } from '../rpc/types';

/**
 * JSON-RPC 2.0 Request Schema
 */
export const JSON_RPC_REQUEST_SCHEMA = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]),
  method: z.string(),
  params: z.unknown().optional(),
});

/**
 * JSON-RPC 2.0 Response Schema
 */
export const JSON_RPC_RESPONSE_SCHEMA = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.unknown().optional(),
    })
    .optional(),
});

/**
 * JSON-RPC 2.0 Notification Schema
 */
export const JSON_RPC_NOTIFICATION_SCHEMA = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.unknown().optional(),
});

/**
 * A2A RPC Methods Constants
 */
export const A2A_RPC_METHODS = {
  TASKS_SEND: 'tasks/send',
  TASKS_GET: 'tasks/get',
  TASKS_CANCEL: 'tasks/cancel',
  TASKS_LIST: 'tasks/list',
  TASKS_STATUS: 'tasks/status',
} as const;

/**
 * JSON-RPC Error Codes
 */
export const JSON_RPC_ERROR_CODES = {
  // Standard JSON-RPC 2.0 error codes
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // A2A-specific error codes
  TASK_NOT_FOUND: -32001,
  TASK_ALREADY_EXISTS: -32002,
  TASK_CANCELLED: -32003,
  TASK_TIMEOUT: -32004,
  AGENT_NOT_FOUND: -32005,
  AGENT_UNAVAILABLE: -32006,
  AUTHENTICATION_FAILED: -32007,
  AUTHORIZATION_FAILED: -32008,
  QUOTA_EXCEEDED: -32009,
  RATE_LIMITED: -32010,
} as const;

/**
 * Create JSON-RPC 2.0 error response
 */
export const createJsonRpcError = (
  id: string | number | null,
  code: JsonRpcErrorCode,
  message: string,
  data?: unknown,
): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  error: {
    code,
    message,
    data,
  },
});

/**
 * Create JSON-RPC 2.0 success response
 */
export const createJsonRpcSuccess = (
  id: string | number | null,
  result: unknown,
): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  result,
});

/**
 * Validate JSON-RPC request
 */
export const validateJsonRpcRequest = (request: unknown) => {
  return JSON_RPC_REQUEST_SCHEMA.safeParse(request);
};

/**
 * Validate JSON-RPC response
 */
export const validateJsonRpcResponse = (response: unknown) => {
  return JSON_RPC_RESPONSE_SCHEMA.safeParse(response);
};

/**
 * Check if request is a notification (no id)
 */
export const isJsonRpcNotification = (request: unknown): boolean => {
  const parsed = JSON_RPC_REQUEST_SCHEMA.safeParse(request);
  return parsed.success && parsed.data.id === null;
};

/**
 * Generate unique request ID
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Type guard for JSON-RPC error code
 */
export const isJsonRpcErrorCode = (code: number): code is JsonRpcErrorCode => {
  return Object.values(JSON_RPC_ERROR_CODES).includes(code as JsonRpcErrorCode);
};
