/**
 * [brAInwav] Type Validators
 * Fixes CodeQL alerts #210, #191-195 - Type confusion vulnerabilities
 *
 * Provides strict type validation to prevent type confusion attacks
 * where arrays or objects are passed when strings are expected,
 * bypassing security checks like path traversal prevention.
 */

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

/**
 * Validates that a parameter is a string
 * CodeQL Fix: Prevents type confusion attacks (#210, #191-195)
 *
 * @param param - The parameter to validate
 * @param name - The parameter name for error messages
 * @returns The validated string
 * @throws {ValidationError} If parameter is not a string
 *
 * @example
 * ```typescript
 * const path = validateStringParam(userInput, 'path');
 * // Safe to use path in string operations
 * ```
 */
export function validateStringParam(param: unknown, name: string): string {
	if (typeof param !== 'string') {
		throw new ValidationError(
			`[brAInwav] Parameter "${name}" must be a string, got ${typeof param}`,
		);
	}
	return param;
}

/**
 * Options for number validation
 */
export interface NumberValidationOptions {
	min?: number;
	max?: number;
}

/**
 * Validates that a parameter is a valid number (not NaN or Infinity)
 *
 * @param param - The parameter to validate
 * @param name - The parameter name for error messages
 * @param options - Optional min/max constraints
 * @returns The validated number
 * @throws {ValidationError} If parameter is not a valid number
 */
export function validateNumberParam(
	param: unknown,
	name: string,
	options: NumberValidationOptions = {},
): number {
	if (typeof param !== 'number') {
		throw new ValidationError(
			`[brAInwav] Parameter "${name}" must be a number, got ${typeof param}`,
		);
	}

	if (Number.isNaN(param)) {
		throw new ValidationError(`[brAInwav] Parameter "${name}" must be a valid number, got NaN`);
	}

	if (!Number.isFinite(param)) {
		throw new ValidationError(
			`[brAInwav] Parameter "${name}" must be a valid number, got Infinity`,
		);
	}

	if (options.min !== undefined && param < options.min) {
		throw new ValidationError(
			`[brAInwav] Parameter "${name}" must be >= ${options.min}, got ${param}`,
		);
	}

	if (options.max !== undefined && param > options.max) {
		throw new ValidationError(
			`[brAInwav] Parameter "${name}" must be <= ${options.max}, got ${param}`,
		);
	}

	return param;
}

/**
 * Validates that a parameter is an array with optional element type validation
 * CodeQL Fix: Prevents type confusion with array-like objects
 *
 * @param param - The parameter to validate
 * @param name - The parameter name for error messages
 * @param elementType - Optional: expected type of array elements
 * @returns The validated array
 * @throws {ValidationError} If parameter is not an array or elements have wrong type
 *
 * @example
 * ```typescript
 * const tags = validateArrayParam(userInput, 'tags', 'string');
 * // Safe to iterate and use as string array
 * ```
 */
export function validateArrayParam<T = unknown>(
	param: unknown,
	name: string,
	elementType?: 'string' | 'number' | 'boolean',
): T[] {
	// Use Array.isArray to prevent array-like objects from passing
	if (!Array.isArray(param)) {
		throw new ValidationError(
			`[brAInwav] Parameter "${name}" must be an array, got ${typeof param}`,
		);
	}

	// Validate element types if specified
	if (elementType) {
		param.forEach((element, index) => {
			if (typeof element !== elementType) {
				throw new ValidationError(
					`[brAInwav] Parameter "${name}[${index}]" must be ${elementType}, got ${typeof element}`,
				);
			}
		});
	}

	return param as T[];
}

/**
 * Validates that a parameter is a boolean
 *
 * @param param - The parameter to validate
 * @param name - The parameter name for error messages
 * @returns The validated boolean
 * @throws {ValidationError} If parameter is not a boolean
 */
export function validateBooleanParam(param: unknown, name: string): boolean {
	if (typeof param !== 'boolean') {
		throw new ValidationError(
			`[brAInwav] Parameter "${name}" must be a boolean, got ${typeof param}`,
		);
	}
	return param;
}

/**
 * Validates that a parameter is a non-null object (not array)
 *
 * @param param - The parameter to validate
 * @param name - The parameter name for error messages
 * @returns The validated object
 * @throws {ValidationError} If parameter is not an object
 */
export function validateObjectParam<T extends Record<string, unknown>>(
	param: unknown,
	name: string,
): T {
	if (typeof param !== 'object' || param === null || Array.isArray(param)) {
		throw new ValidationError(
			`[brAInwav] Parameter "${name}" must be an object, got ${typeof param}`,
		);
	}
	return param as T;
}
