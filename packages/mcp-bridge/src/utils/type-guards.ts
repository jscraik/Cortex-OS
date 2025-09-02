/**
 * @file_path packages/mcp/src/utils/type-guards.ts
 * @description Type guard utilities for MCP implementation
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-21
 * @version 1.0.0
 * @status active
 */

/**
 * Type guard for string values
 */
export const isString = (value: unknown): value is string =>
	typeof value === "string";

/**
 * Type guard for number values
 */
export const isNumber = (value: unknown): value is number =>
	typeof value === "number";

/**
 * Type guard for boolean values
 */
export const isBoolean = (value: unknown): value is boolean =>
	typeof value === "boolean";

/**
 * Type guard for array values
 */
export const isArray = (value: unknown): value is unknown[] =>
	Array.isArray(value);

/**
 * Type guard for object values
 */
export const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Get error message from unknown error
 */
export const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
};

/**
 * Check if value is defined (not null or undefined)
 */
export const isDefined = <T>(value: T | null | undefined): value is T =>
	value !== null && value !== undefined;

/**
 * Check if value is a function
 */
export const isFunction = (value: unknown): value is Function =>
	typeof value === "function";

/**
 * Check if value is a promise
 */
export const isPromise = <T>(value: unknown): value is Promise<T> =>
	value instanceof Promise ||
	(isObject(value) && isFunction((value as any).then));
