import { z } from 'zod';

const jsonRpcVersionSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
  })
  .passthrough();

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

/**
 * Validate JSON-RPC version field.
 * Pure function to ensure 2.0 compatibility.
 */
export function validateJsonRpcVersion<T extends object>(message: unknown): ValidationResult<T> {
  const result = jsonRpcVersionSchema.safeParse(message);

  if (result.success) {
    return { success: true, data: result.data as T };
  }

  return {
    success: false,
    error: { message: result.error.issues[0].message },
  };
}
