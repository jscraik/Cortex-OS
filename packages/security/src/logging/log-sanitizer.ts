/**
 * [brAInwav] Log Sanitization
 * Fixes CodeQL alert #189 - Sensitive data in logs
 *
 * Provides utilities to sanitize sensitive information from logs
 * to prevent credential leakage and data exposure.
 */

/**
 * List of sensitive field names to redact
 * Field names are matched case-insensitively and with partial matching
 */
export const SENSITIVE_FIELDS = [
	'apikey',
	'api_key',
	'token',
	'password',
	'passwd',
	'pwd',
	'secret',
	'secrets',
	'credential',
	'credentials',
	'auth',
	'authorization',
	'bearer',
	'private',
	'privatekey',
	'private_key',
	'access_token',
	'refresh_token',
	'session',
	'cookie',
] as const;

/**
 * Check if a field name contains sensitive keywords
 *
 * @param fieldName - The field name to check
 * @returns true if field is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
	const lowerFieldName = fieldName.toLowerCase();
	return SENSITIVE_FIELDS.some((sensitive) => lowerFieldName.includes(sensitive));
}

/**
 * Sanitize data for logging by redacting sensitive fields
 * CodeQL Fix: Prevents sensitive data leakage in logs (#189)
 *
 * Creates a deep copy with sensitive fields replaced with '[REDACTED]'
 * Handles nested objects, arrays, and circular references
 *
 * @param data - The data to sanitize
 * @param seen - Set to track circular references (internal use)
 * @returns Sanitized copy of the data
 *
 * @example
 * ```typescript
 * const data = { username: 'admin', password: 'secret123' };
 * const safe = sanitizeForLogging(data);
 * // Result: { username: 'admin', password: '[REDACTED]' }
 * ```
 */
export function sanitizeForLogging(data: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
	// Handle primitives and null/undefined
	if (typeof data !== 'object' || data === null) {
		return data;
	}

	// Handle circular references
	if (seen.has(data)) {
		return '[CIRCULAR]';
	}
	seen.add(data);

	// Handle arrays
	if (Array.isArray(data)) {
		return data.map((item) => sanitizeForLogging(item, seen));
	}

	// Handle objects
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(data)) {
		if (isSensitiveField(key)) {
			// Redact entire field
			sanitized[key] = '[REDACTED]';
		} else if (typeof value === 'object' && value !== null) {
			// Recursively sanitize nested objects/arrays
			sanitized[key] = sanitizeForLogging(value, seen);
		} else {
			// Keep non-sensitive primitives
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * Safe logger wrapper that automatically sanitizes data
 *
 * @param logger - The logger function (e.g., console.log, pino.info)
 * @param data - Data to log (will be sanitized)
 *
 * @example
 * ```typescript
 * safeLog(console.log, { user: 'admin', apiKey: 'secret' });
 * // Logs: { user: 'admin', apiKey: '[REDACTED]' }
 * ```
 */
export function safeLog(logger: (...args: any[]) => void, ...data: unknown[]): void {
	const sanitizedData = data.map((item) => sanitizeForLogging(item));
	logger(...sanitizedData);
}
