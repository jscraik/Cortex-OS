/**
 * Sanitization utilities for A2A system following Sept 2025 standards
 * Functional approach with no mutations
 */

export interface SanitizationConfig {
	safeFields: string[];
	enableLogging: boolean;
}

export const DEFAULT_SAFE_FIELDS = ['timestamp', 'correlationId', 'version', 'brAInwavMetadata'];

/**
 * Recursively sanitize an object without mutating safe fields
 */
export const recursiveSanitize = (
	obj: unknown,
	config: SanitizationConfig = { safeFields: DEFAULT_SAFE_FIELDS, enableLogging: false },
): unknown => {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (typeof obj === 'string') {
		return sanitizeString(obj);
	}

	if (typeof obj === 'number' || typeof obj === 'boolean') {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => recursiveSanitize(item, config));
	}

	if (typeof obj === 'object') {
		const result: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(obj)) {
			if (config.safeFields.includes(key)) {
				// Preserve safe fields without sanitization
				result[key] = value;
			} else {
				// Recursively sanitize unsafe fields
				result[key] = recursiveSanitize(value, config);
			}
		}

		return result;
	}

	return obj;
};

/**
 * Sanitize a single field value
 */
export const sanitizeField = (value: string, _fieldName?: string): string => {
	return sanitizeString(value);
};

/**
 * Create sanitization configuration
 */
export const createSanitizationConfig = (safeFields: string[]): SanitizationConfig => ({
	safeFields,
	enableLogging: false,
});

/**
 * Core string sanitization logic
 */
const sanitizeString = (input: string): string => {
	return input
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
		.replace(/javascript:/gi, '')
		.replace(/on\w+\s*=/gi, '')
		.replace(/';?\s*DROP\s+TABLE\s+\w+;?\s*--?/gi, '')
		.replace(/';?\s*DELETE\s+FROM\s+\w+;?\s*--?/gi, '')
		.replace(/';?\s*SELECT\s+\*\s+FROM\s+\w+;?\s*--?/gi, '');
};
