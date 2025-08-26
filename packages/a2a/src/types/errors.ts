/**
 * @file A2A Error Types
 * @description JSON-RPC 2.0 compliant error definitions for A2A protocol
 * Split from external-types.ts for better maintainability
 */

import { JSONRPCError } from './jsonrpc.js';

// --8<-- [start:JSONParseError]
/**
 * Invalid JSON was received by the server.
 * An error occurred on the server while parsing the JSON text.
 */
export interface JSONParseError extends JSONRPCError {
  code: -32700;
  message: 'Parse error';
  data?: {
    /** The invalid JSON that was received */
    received?: string;
    /** Additional context about the parse error */
    parseError?: string;
  };
}
// --8<-- [end:JSONParseError]

// --8<-- [start:InvalidRequestError]
/**
 * The JSON sent is not a valid Request object.
 */
export interface InvalidRequestError extends JSONRPCError {
  code: -32600;
  message: 'Invalid Request';
  data?: {
    /** The invalid request object */
    request?: unknown;
    /** Details about what made the request invalid */
    reason?: string;
  };
}
// --8<-- [end:InvalidRequestError]

// --8<-- [start:MethodNotFoundError]
/**
 * The method does not exist / is not available.
 */
export interface MethodNotFoundError extends JSONRPCError {
  code: -32601;
  message: 'Method not found';
  data?: {
    /** The method that was requested */
    method?: string;
    /** List of available methods */
    availableMethods?: string[];
  };
}
// --8<-- [end:MethodNotFoundError]

// --8<-- [start:InvalidParamsError]
/**
 * Invalid method parameter(s).
 */
export interface InvalidParamsError extends JSONRPCError {
  code: -32602;
  message: 'Invalid params';
  data?: {
    /** The invalid parameters */
    params?: unknown;
    /** JSON Schema validation errors */
    validationErrors?: Array<{
      path: string;
      message: string;
    }>;
  };
}
// --8<-- [end:InvalidParamsError]

// --8<-- [start:InternalError]
/**
 * Internal JSON-RPC error.
 */
export interface InternalError extends JSONRPCError {
  code: -32603;
  message: 'Internal error';
  data?: {
    /** Error details for debugging */
    error?: string;
    /** Stack trace if available */
    stack?: string;
  };
}
// --8<-- [end:InternalError]

// --8<-- [start:TaskNotFoundError]
/**
 * A task with the given ID was not found.
 */
export interface TaskNotFoundError extends JSONRPCError {
  code: -32001;
  message: 'Task not found';
  data?: {
    /** The task ID that was not found */
    taskId?: string;
    /** Available task IDs */
    availableTaskIds?: string[];
  };
}
// --8<-- [end:TaskNotFoundError]

// --8<-- [start:TaskNotCancelableError]
/**
 * The task cannot be canceled in its current state.
 */
export interface TaskNotCancelableError extends JSONRPCError {
  code: -32002;
  message: 'Task not cancelable';
  data?: {
    /** The task ID */
    taskId?: string;
    /** Current task state */
    currentState?: string;
    /** States in which the task can be canceled */
    cancelableStates?: string[];
  };
}
// --8<-- [end:TaskNotCancelableError]

// --8<-- [start:PushNotificationNotSupportedError]
/**
 * The agent does not support push notifications.
 */
export interface PushNotificationNotSupportedError extends JSONRPCError {
  code: -32003;
  message: 'Push notification not supported';
  data?: {
    /** Supported notification methods if any */
    supportedMethods?: string[];
  };
}
// --8<-- [end:PushNotificationNotSupportedError]

// --8<-- [start:UnsupportedOperationError]
/**
 * The requested operation is not supported by this agent.
 */
export interface UnsupportedOperationError extends JSONRPCError {
  code: -32004;
  message: 'Unsupported operation';
  data?: {
    /** The unsupported operation */
    operation?: string;
    /** Supported operations */
    supportedOperations?: string[];
  };
}
// --8<-- [end:UnsupportedOperationError]

// --8<-- [start:ContentTypeNotSupportedError]
/**
 * The specified content type is not supported.
 */
export interface ContentTypeNotSupportedError extends JSONRPCError {
  code: -32005;
  message: 'Content type not supported';
  data?: {
    /** The unsupported content type */
    contentType?: string;
    /** Supported content types */
    supportedContentTypes?: string[];
  };
}
// --8<-- [end:ContentTypeNotSupportedError]

// --8<-- [start:InvalidAgentResponseError]
/**
 * The agent response was invalid or malformed.
 */
export interface InvalidAgentResponseError extends JSONRPCError {
  code: -32006;
  message: 'Invalid agent response';
  data?: {
    /** The invalid response */
    response?: unknown;
    /** Validation error details */
    validationError?: string;
  };
}
// --8<-- [end:InvalidAgentResponseError]

// --8<-- [start:AuthenticatedExtendedCardNotConfiguredError]
/**
 * The authenticated extended card is not configured for this agent.
 */
export interface AuthenticatedExtendedCardNotConfiguredError extends JSONRPCError {
  code: -32007;
  message: 'Authenticated extended card not configured';
  data?: {
    /** Configuration requirements */
    requirements?: string[];
  };
}
// --8<-- [end:AuthenticatedExtendedCardNotConfiguredError]

// --8<-- [start:A2AError]
/**
 * Union type representing all A2A-specific error types
 */
export type A2AError =
  | JSONParseError
  | InvalidRequestError
  | MethodNotFoundError
  | InvalidParamsError
  | InternalError
  | TaskNotFoundError
  | TaskNotCancelableError
  | PushNotificationNotSupportedError
  | UnsupportedOperationError
  | ContentTypeNotSupportedError
  | InvalidAgentResponseError
  | AuthenticatedExtendedCardNotConfiguredError;
// --8<-- [end:A2AError]