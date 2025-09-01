/**
 * Error handling utilities following functional programming principles
 * Provides consistent error handling patterns and guard clauses
 */

import type { z } from 'zod';
import { createJsonRpcError, JSON_RPC_ERROR_CODES } from './json-rpc-utils';

/**
 * Result type for functional error handling
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Create success result
 */
export const success = <T>(data: T): Result<T> => ({
  success: true,
  data,
});

/**
 * Create error result
 */
export const failure = <E = Error>(error: E): Result<never, E> => ({
  success: false,
  error,
});

/**
 * Wrap async operation in result type
 */
export const tryAsync = async <T>(operation: () => Promise<T>): AsyncResult<T> => {
  try {
    const data = await operation();
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Wrap sync operation in result type
 */
export const trySync = <T>(operation: () => T): Result<T> => {
  try {
    const data = operation();
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Guard clause for null/undefined values
 */
export const guardNotNull = <T>(
  value: T | null | undefined,
  errorMessage: string = 'Value is null or undefined',
): Result<T> => {
  if (value == null) {
    return failure(new Error(errorMessage));
  }
  return success(value);
};

/**
 * Guard clause for empty arrays
 */
export const guardNotEmpty = <T>(
  array: T[],
  errorMessage: string = 'Array is empty',
): Result<T[]> => {
  if (array.length === 0) {
    return failure(new Error(errorMessage));
  }
  return success(array);
};

/**
 * Guard clause for validation
 */
export const guardValid = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorMessage: string = 'Validation failed',
): Result<T> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return failure(new Error(`${errorMessage}: ${result.error.message}`));
  }
  return success(result.data);
};

/**
 * Handle RPC method errors with consistent patterns
 */
export const handleRpcMethodError = (
  requestId: string | number | null,
  error: unknown,
  defaultCode: number = JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
  defaultMessage: string = 'Internal server error',
) => {
  if (error instanceof Error) {
    // Check if it's a validation error
    if (error.message.includes('Invalid parameters')) {
      return createJsonRpcError(requestId, JSON_RPC_ERROR_CODES.INVALID_PARAMS, error.message);
    }

    // Check for specific error types
    if (error.message.includes('not found')) {
      return createJsonRpcError(requestId, JSON_RPC_ERROR_CODES.TASK_NOT_FOUND, error.message);
    }

    return createJsonRpcError(requestId, defaultCode, error.message);
  }

  return createJsonRpcError(requestId, defaultCode, defaultMessage, error);
};

/**
 * Safe async operation wrapper for RPC handlers
 */
export const safeRpcHandler = async <T>(
  operation: () => Promise<T>,
  requestId: string | number | null,
  errorCode: number = JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
  errorMessage: string = 'Operation failed',
) => {
  const result = await tryAsync(operation);

  if (!result.success) {
    return handleRpcMethodError(requestId, result.error, errorCode, errorMessage);
  }

  return result.data;
};

/**
 * Logging utility with consistent formatting
 */
export const logWithContext = (
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, unknown>,
) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [A2A ${level.toUpperCase()}] ${message}`;

  if (context) {
    console[level](logMessage, context);
  } else {
    console[level](logMessage);
  }
};

/**
 * Error boundary for async operations
 */
export const withErrorBoundary = async <T>(
  operation: () => Promise<T>,
  fallback: T,
  onError?: (error: Error) => void,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logWithContext('error', `Operation failed: ${err.message}`, { error: err });

    if (onError) {
      onError(err);
    }

    return fallback;
  }
};
