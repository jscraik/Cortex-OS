/**
 * @fileoverview Type Guards for Runtime Type Safety
 * Systematic approach to type checking without assertions
 */

/**
 * Type guard to check if value is a record (plain object)
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		Object.getPrototypeOf(value) === Object.prototype
	);
}

/**
 * Type guard to check if value has specific properties
 */
export function hasProperties<T extends string>(
	value: unknown,
	properties: T[],
): value is Record<T, unknown> {
	if (!isRecord(value)) {
		return false;
	}

	return properties.every((prop) => prop in value && value[prop] !== undefined);
}

/**
 * Type guard for proposal objects with required shape
 */
export interface ProposalShape {
	dataClass?: string;
	path?: string;
}

export function isProposalShape(value: unknown): value is ProposalShape {
	if (!isRecord(value)) {
		return false;
	}

	const hasValidDataClass = !('dataClass' in value) || typeof value.dataClass === 'string';

	const hasValidPath = !('path' in value) || typeof value.path === 'string';

	return hasValidDataClass && hasValidPath;
}

/**
 * Type guard for error objects
 */
export function isError(value: unknown): value is Error {
	return value instanceof Error;
}

/**
 * Type guard for string values
 */
export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

/**
 * Type guard for number values
 */
export function isNumber(value: unknown): value is number {
	return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Type guard for boolean values
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

/**
 * Type guard validation result (distinct from validation.ts ValidationResult)
 */
export type TypeGuardResult<T> =
	| { success: true; data: T; error?: never }
	| { success: false; data?: never; error: string };

/**
 * Safe validation with detailed error information
 */
export function safeValidate<T>(
	value: unknown,
	guard: (value: unknown) => value is T,
	errorMessage: string,
): TypeGuardResult<T> {
	if (guard(value)) {
		return { success: true, data: value };
	}

	return {
		success: false,
		error: `${errorMessage}: received ${typeof value}`,
	};
}
