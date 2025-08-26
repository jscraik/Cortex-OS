/**
 * @file JSON-RPC 2.0 Base Types
 * @description Core JSON-RPC 2.0 protocol types for A2A communication
 * Split from external-types.ts for better maintainability
 */

// --8<-- [start:JSONRPCRequest]
/**
 * A JSON-RPC 2.0 request object.
 */
export interface JSONRPCRequest {
  /** JSON-RPC version identifier. Must be exactly "2.0". */
  jsonrpc: '2.0';
  /** The name of the method to be invoked. */
  method: string;
  /** Parameter values to be used during the invocation of the method. */
  params?: object | unknown[];
  /** An identifier established by the client. */
  id?: string | number | null;
}
// --8<-- [end:JSONRPCRequest]

// --8<-- [start:JSONRPCSuccessResponse]
/**
 * A JSON-RPC 2.0 success response object.
 */
export interface JSONRPCSuccessResponse {
  /** JSON-RPC version identifier. Must be exactly "2.0". */
  jsonrpc: '2.0';
  /** The result of the method invocation. */
  result: unknown;
  /** The same identifier as in the corresponding request. */
  id: string | number | null;
}
// --8<-- [end:JSONRPCSuccessResponse]

// --8<-- [start:JSONRPCError]
/**
 * A JSON-RPC 2.0 error object.
 */
export interface JSONRPCError {
  /** A number indicating the error type. */
  code: number;
  /** A short description of the error. */
  message: string;
  /** Additional information about the error. */
  data?: unknown;
}
// --8<-- [end:JSONRPCError]

// --8<-- [start:JSONRPCErrorResponse]
/**
 * A JSON-RPC 2.0 error response object.
 */
export interface JSONRPCErrorResponse {
  /** JSON-RPC version identifier. Must be exactly "2.0". */
  jsonrpc: '2.0';
  /** The error that occurred. */
  error: JSONRPCError;
  /** The same identifier as in the corresponding request, or null if the request ID could not be determined. */
  id: string | number | null;
}
// --8<-- [end:JSONRPCErrorResponse]

// --8<-- [start:JSONRPCResponse]
/**
 * A JSON-RPC 2.0 response object (either success or error).
 */
export type JSONRPCResponse = JSONRPCSuccessResponse | JSONRPCErrorResponse;
// --8<-- [end:JSONRPCResponse]