/**
 * JSON-RPC 2.0 and A2A Protocol Error Codes
 *
 * Standardized error codes and utility functions for creating error responses
 * Following JSON-RPC 2.0 specification and A2A protocol extensions.
 */

// Standard JSON-RPC 2.0 Error Codes
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// A2A Protocol-Specific Error Codes (reserved range -32000 to -32099)
export const A2A_ERRORS = {
  TASK_NOT_FOUND: -32001,
  TASK_NOT_CANCELLABLE: -32002,
  PUSH_NOTIFICATIONS_NOT_SUPPORTED: -32003,
  UNSUPPORTED_OPERATION: -32004,
  CONTENT_TYPE_NOT_SUPPORTED: -32005,
  INVALID_AGENT_RESPONSE: -32006,
  AUTHENTICATED_EXTENDED_CARD_NOT_CONFIGURED: -32007,
} as const;

// Error message mappings
const ERROR_MESSAGES = {
  [JSON_RPC_ERRORS.PARSE_ERROR]: 'Parse error',
  [JSON_RPC_ERRORS.INVALID_REQUEST]: 'Invalid Request',
  [JSON_RPC_ERRORS.METHOD_NOT_FOUND]: 'Method not found',
  [JSON_RPC_ERRORS.INVALID_PARAMS]: 'Invalid params',
  [JSON_RPC_ERRORS.INTERNAL_ERROR]: 'Internal error',
  [A2A_ERRORS.TASK_NOT_FOUND]: 'Task not found',
  [A2A_ERRORS.TASK_NOT_CANCELLABLE]: 'Task not cancellable',
  [A2A_ERRORS.PUSH_NOTIFICATIONS_NOT_SUPPORTED]: 'Push notifications not supported',
  [A2A_ERRORS.UNSUPPORTED_OPERATION]: 'Unsupported operation',
  [A2A_ERRORS.CONTENT_TYPE_NOT_SUPPORTED]: 'Content type not supported',
  [A2A_ERRORS.INVALID_AGENT_RESPONSE]: 'Invalid agent response',
  [A2A_ERRORS.AUTHENTICATED_EXTENDED_CARD_NOT_CONFIGURED]:
    'Authenticated extended card not configured',
} as const;

// Type definitions
export type StandardErrorCode = keyof typeof JSON_RPC_ERRORS;
export type A2AErrorCode = keyof typeof A2A_ERRORS;

/**
 * Create a standard JSON-RPC error response
 * @param errorType - Standard error type
 * @param id - Request ID
 * @param data - Optional error data
 * @returns JSON-RPC error response
 */
export const createStandardError = (
  errorType: StandardErrorCode,
  id: string | number | null,
  data?: unknown,
) => {
  const code = JSON_RPC_ERRORS[errorType];
  const message = ERROR_MESSAGES[code];

  return {
    jsonrpc: '2.0' as const,
    id,
    error: {
      code,
      message,
      ...(data !== undefined && { data }),
    },
  };
};

/**
 * Create an A2A protocol-specific error response
 * @param errorType - A2A error type
 * @param id - Request ID
 * @param data - Optional error data
 * @returns JSON-RPC error response with A2A error code
 */
export const createA2AError = (
  errorType: A2AErrorCode,
  id: string | number | null,
  data?: unknown,
) => {
  const code = A2A_ERRORS[errorType];
  const message = ERROR_MESSAGES[code];

  return {
    jsonrpc: '2.0' as const,
    id,
    error: {
      code,
      message,
      ...(data !== undefined && { data }),
    },
  };
};

/**
 * Check if error code is a standard JSON-RPC error
 * @param code - Error code to check
 * @returns true if standard JSON-RPC error
 */
export const isStandardJsonRpcError = (code: number): boolean => {
  return (Object.values(JSON_RPC_ERRORS) as readonly number[]).includes(code);
};

/**
 * Check if error code is A2A protocol-specific
 * @param code - Error code to check
 * @returns true if A2A-specific error
 */
export const isA2ASpecificError = (code: number): boolean => {
  return (Object.values(A2A_ERRORS) as readonly number[]).includes(code);
};
