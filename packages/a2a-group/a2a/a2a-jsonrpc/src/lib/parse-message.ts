import { z } from 'zod';

// JSON-RPC 2.0 Base Schema
const JsonRpcBaseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
});

// JSON-RPC Request Schema
const JsonRpcRequestSchema = JsonRpcBaseSchema.extend({
  method: z.string(),
  params: z.unknown().optional(),
});

// JSON-RPC Success Response Schema
const JsonRpcSuccessResponseSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number(), z.null()]),
    result: z.unknown(),
  })
  .refine((data) => 'result' in data, { message: 'Response must have result field' });

// JSON-RPC Error Schema
const JsonRpcErrorObjectSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

// JSON-RPC Error Response Schema
const JsonRpcErrorResponseSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number(), z.null()]),
    error: JsonRpcErrorObjectSchema,
  })
  .refine((data) => 'error' in data, { message: 'Error response must have error field' });

// Types
export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type JsonRpcSuccessResponse = z.infer<typeof JsonRpcSuccessResponseSchema>;
export type JsonRpcErrorResponse = z.infer<typeof JsonRpcErrorResponseSchema>;
export type JsonRpcErrorObject = z.infer<typeof JsonRpcErrorObjectSchema>;
export type JsonRpcMessage = JsonRpcRequest | JsonRpcSuccessResponse | JsonRpcErrorResponse;

// Result type for parsing
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; details?: unknown } };

/**
 * Parse and validate a JSON-RPC 2.0 message
 * @param input - Raw object to parse
 * @returns ParseResult with success/error status
 */
export const parseJsonRpcMessage = (input: unknown): ParseResult<JsonRpcMessage> => {
  try {
    // First check if it has the basic jsonrpc field
    const baseCheck = z.object({
      jsonrpc: z.literal('2.0'),
    });

    baseCheck.parse(input); // Validate jsonrpc field first

    // Try to parse as request first
    try {
      const request = JsonRpcRequestSchema.parse(input);
      return { success: true, data: request };
    } catch {
      // Not a request, try success response
      try {
        const response = JsonRpcSuccessResponseSchema.parse(input);
        return { success: true, data: response };
      } catch {
        // Not a success response, try error response
        try {
          const errorResponse = JsonRpcErrorResponseSchema.parse(input);
          return { success: true, data: errorResponse };
        } catch {
          // Doesn't match any known pattern
          return {
            success: false,
            error: {
              message: 'Message must have method (request) or result/error (response)',
              details: input,
            },
          };
        }
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      let message = 'Invalid JSON-RPC message';

      // If jsonrpc field is missing entirely
      if (
        firstError.path.includes('jsonrpc') &&
        firstError.message.toLowerCase().includes('required')
      ) {
        message = 'Missing or invalid jsonrpc field (must be "2.0")';
      }
      // If jsonrpc field exists but has wrong literal (version not "2.0")
      else if (firstError.path.includes('jsonrpc')) {
        message = 'Invalid jsonrpc version (must be "2.0")';
      }
      // Fallback to the original zod error message for other cases
      else if (firstError.message.includes('2.0')) {
        message = 'Invalid jsonrpc version (must be "2.0")';
      } else {
        message = `Invalid JSON-RPC message: ${firstError.message}`;
      }

      return {
        success: false,
        error: {
          message,
          details: error.errors,
        },
      };
    }
    return {
      success: false,
      error: {
        message: 'Failed to parse JSON-RPC message',
        details: error,
      },
    };
  }
};

/**
 * Type guard to check if a message is a JSON-RPC request or notification
 * @param message - Message to check
 * @returns true if message is a request/notification
 */
export const isJsonRpcRequest = (message: unknown): message is JsonRpcRequest => {
  try {
    JsonRpcRequestSchema.parse(message);
    return true;
  } catch {
    return false;
  }
};

/**
 * Type guard to check if a message is a JSON-RPC response (success or error)
 * @param message - Message to check
 * @returns true if message is a response
 */
export const isJsonRpcResponse = (
  message: unknown,
): message is JsonRpcSuccessResponse | JsonRpcErrorResponse => {
  return isJsonRpcSuccessResponse(message) || isJsonRpcErrorResponse(message);
};

/**
 * Type guard to check if a message is a JSON-RPC success response
 * @param message - Message to check
 * @returns true if message is a success response
 */
export const isJsonRpcSuccessResponse = (message: unknown): message is JsonRpcSuccessResponse => {
  try {
    JsonRpcSuccessResponseSchema.parse(message);
    return true;
  } catch {
    return false;
  }
};

/**
 * Type guard to check if a message is a JSON-RPC error response
 * @param message - Message to check
 * @returns true if message is an error response
 */
export const isJsonRpcErrorResponse = (message: unknown): message is JsonRpcErrorResponse => {
  try {
    JsonRpcErrorResponseSchema.parse(message);
    return true;
  } catch {
    return false;
  }
};
