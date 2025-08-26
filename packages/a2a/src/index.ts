/**
 * @file A2A Protocol Implementation - Aligned with External Specification
 * @description Main exports and utilities following the official A2A JSON-RPC 2.0 specification
 * @reference external/a2a/types/src/types.ts
 */

import { randomUUID } from 'crypto';

// Export all types from our aligned type definitions
export * from './types.js';

// Export security components
export * from './security/prompt-injection-guard.js';
export * from './security/secure-secret-manager.js';
export * from './security/rate-limiter.js';
export * from './security/output-sanitizer.js';

// Export secure handlers and gateway
export * from './secure-message-handler.js';
export * from './secure-gateway.js';

// Import key types for helper functions
import type {
  SendMessageRequest,
  SendMessageSuccessResponse,
  JSONRPCErrorResponse,
  Message,
  Task,
  JSONRPCError,
  MessageSendParams,
} from './types.js';

/**
 * A2A Error Types following JSON-RPC 2.0 specification
 */
export enum A2AErrorType {
  // Standard JSON-RPC errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // A2A-specific errors
  TASK_NOT_FOUND = -32001,
  TASK_NOT_CANCELABLE = -32002,
  PUSH_NOTIFICATION_NOT_SUPPORTED = -32003,
  UNSUPPORTED_OPERATION = -32004,
  CONTENT_TYPE_NOT_SUPPORTED = -32005,
  INVALID_AGENT_RESPONSE = -32006,
  AUTHENTICATED_EXTENDED_CARD_NOT_CONFIGURED = -32007,
}

/**
 * Type guard to validate if a method is a valid A2A method
 */
function isValidA2AMethod(method: string): method is 'message/send' {
  return method === 'message/send';
}

/**
 * Type guard to validate MessageSendParams
 */
function isMessageSendParams(params: unknown): params is MessageSendParams {
  if (!params || typeof params !== 'object') return false;
  
  const p = params as Record<string, unknown>;
  return (
    p.message !== undefined &&
    typeof p.message === 'object' &&
    p.message !== null
  );
}

/**
 * Create a JSON-RPC 2.0 compliant A2A request following external specification
 */
export function createRequest(
  method: string,
  params: unknown,
  id?: string | number
): SendMessageRequest {
  // Validate method
  if (!isValidA2AMethod(method)) {
    throw new Error(`Invalid A2A method: ${method}. Supported methods: message/send`);
  }
  
  // Validate params
  if (!isMessageSendParams(params)) {
    throw new Error('Invalid params: must be valid MessageSendParams with message property');
  }
  
  return {
    jsonrpc: '2.0',
    method,
    params,
    id: id ?? randomUUID(),
  };
}

/**
 * Create a successful A2A response following external specification
 */
export function createSuccessResponse(
  result: Message | Task,
  id?: string | number | null
): SendMessageSuccessResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    result,
  };
}

/**
 * Create an error response following JSON-RPC 2.0 specification
 */
export function createErrorResponse(
  error: JSONRPCError,
  id?: string | number | null
): JSONRPCErrorResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error,
  };
}

/**
 * Create a standardized A2A error object
 */
export function createA2AError(
  code: A2AErrorType,
  message: string,
  data?: any
): JSONRPCError {
  return {
    code,
    message,
    ...(data && { data }),
  };
}

/**
 * Validate if an object is a valid JSON-RPC 2.0 request
 */
export function isValidRequest(obj: any): obj is SendMessageRequest {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.jsonrpc === '2.0' &&
    typeof obj.method === 'string' &&
    (obj.id === undefined || 
     typeof obj.id === 'string' || 
     typeof obj.id === 'number')
  );
}

/**
 * Validate if an object is a valid JSON-RPC 2.0 response
 */
export function isValidResponse(obj: any): obj is SendMessageSuccessResponse | JSONRPCErrorResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.jsonrpc === '2.0' &&
    (obj.id === null || 
     typeof obj.id === 'string' || 
     typeof obj.id === 'number') &&
    ('result' in obj || 'error' in obj)
  );
}

/**
 * Check if a response is an error response
 */
export function isErrorResponse(response: any): response is JSONRPCErrorResponse {
  return isValidResponse(response) && 'error' in response;
}

/**
 * Check if a response is a success response
 */
export function isSuccessResponse(response: any): response is SendMessageSuccessResponse {
  return isValidResponse(response) && 'result' in response;
}

/**
 * Extract error information from an error response
 */
export function getErrorInfo(errorResponse: JSONRPCErrorResponse): {
  code: number;
  message: string;
  data?: any;
} {
  return {
    code: errorResponse.error.code,
    message: errorResponse.error.message,
    data: errorResponse.error.data,
  };
}

/**
 * A2A Protocol version information
 */
export const A2A_VERSION = '1.0.0';
export const JSON_RPC_VERSION = '2.0';

/**
 * Default A2A configuration values
 */
export const DEFAULT_A2A_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  heartbeatInterval: 60000, // 1 minute
  discoveryEnabled: true,
  authentication: 'none' as const,
  encryption: false,
};

// Legacy exports for backward compatibility (to be phased out)
export const createA2ARequest = createRequest;
export const createA2AResponse = createSuccessResponse;

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.