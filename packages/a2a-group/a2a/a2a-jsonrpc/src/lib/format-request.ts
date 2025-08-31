/**
 * JSON-RPC 2.0 Request and Response Formatting
 *
 * Pure functions for creating properly formatted JSON-RPC messages
 * Following functional programming principles with no side effects.
 */

import { randomUUID } from 'crypto';

// JSON-RPC 2.0 types
export interface JsonRpcRequestParams {
  id: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotificationParams {
  method: string;
  params?: unknown;
}

export interface JsonRpcResponseParams {
  id: string | number | null;
  result: unknown;
}

export interface JsonRpcErrorParams {
  id: string | number | null;
  code: number;
  message: string;
  data?: unknown;
}

export interface A2ARequestParams {
  method: string;
  id?: string | number | null;
  params?: unknown;
}

// A2A Protocol Methods
export const A2A_METHODS = {
  MESSAGE_SEND: 'message/send',
  MESSAGE_STREAM: 'message/stream',
  TASKS_GET: 'tasks/get',
  TASKS_CANCEL: 'tasks/cancel',
  TASKS_RESUBSCRIBE: 'tasks/resubscribe',
  TASKS_PUSH_NOTIFICATION_SET: 'tasks/pushNotificationConfig/set',
  TASKS_PUSH_NOTIFICATION_GET: 'tasks/pushNotificationConfig/get',
  TASKS_PUSH_NOTIFICATION_DELETE: 'tasks/pushNotificationConfig/delete',
  TASKS_PUSH_NOTIFICATION_LIST: 'tasks/pushNotificationConfig/list',
  AGENT_GET_AUTHENTICATED_EXTENDED_CARD: 'agent/getAuthenticatedExtendedCard',
} as const;

/**
 * Create a JSON-RPC 2.0 request message
 * @param params - Request parameters
 * @returns Formatted JSON-RPC request
 */
export const createJsonRpcRequest = (params: JsonRpcRequestParams) => ({
  jsonrpc: '2.0' as const,
  id: params.id,
  method: params.method,
  ...(params.params !== undefined && { params: params.params }),
});

/**
 * Create a JSON-RPC 2.0 notification message (no id field)
 * @param params - Notification parameters
 * @returns Formatted JSON-RPC notification
 */
export const createJsonRpcNotification = (params: JsonRpcNotificationParams) => ({
  jsonrpc: '2.0' as const,
  method: params.method,
  ...(params.params !== undefined && { params: params.params }),
});

/**
 * Create a JSON-RPC 2.0 success response
 * @param params - Response parameters
 * @returns Formatted JSON-RPC response
 */
export const createJsonRpcResponse = (params: JsonRpcResponseParams) => ({
  jsonrpc: '2.0' as const,
  id: params.id,
  result: params.result,
});

/**
 * Create a JSON-RPC 2.0 error response
 * @param params - Error parameters
 * @returns Formatted JSON-RPC error response
 */
export const createJsonRpcError = (params: JsonRpcErrorParams) => ({
  jsonrpc: '2.0' as const,
  id: params.id,
  error: {
    code: params.code,
    message: params.message,
    ...(params.data !== undefined && { data: params.data }),
  },
});

/**
 * Format an A2A protocol request with auto-generated ID if needed
 * @param params - A2A request parameters
 * @returns Formatted JSON-RPC request for A2A protocol
 */
export const formatA2ARequest = (params: A2ARequestParams) => {
  const id = params.id ?? randomUUID();

  return createJsonRpcRequest({
    id,
    method: params.method,
    params: params.params,
  });
};
