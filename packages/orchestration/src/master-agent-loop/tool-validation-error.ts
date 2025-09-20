/**
 * @fileoverview Tool Validation Error - Phase 3.5
 * @module ToolValidationError
 * @description Specialized error class for tool security and validation failures
 * @author brAInwav Development Team
 * @version 3.5.0
 * @since 2024-12-09
 */

/**
 * Tool validation error codes
 */
export enum ToolValidationErrorCode {
	SECURITY_VIOLATION = 'SECURITY_VIOLATION',
	INPUT_VALIDATION_FAILED = 'INPUT_VALIDATION_FAILED',
	AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
	RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
	RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',
	CAPABILITY_MISSING = 'CAPABILITY_MISSING',
	SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
	INVALID_DATA_TYPE = 'INVALID_DATA_TYPE',
	SIZE_LIMIT_EXCEEDED = 'SIZE_LIMIT_EXCEEDED',
	PROTOTYPE_POLLUTION = 'PROTOTYPE_POLLUTION',
	PATH_TRAVERSAL = 'PATH_TRAVERSAL',
	SQL_INJECTION = 'SQL_INJECTION',
	XSS_ATTEMPT = 'XSS_ATTEMPT',
	INVALID_URL_SCHEME = 'INVALID_URL_SCHEME',
}

/**
 * Tool validation error details
 */
export interface ToolValidationErrorDetail {
	field?: string;
	value?: unknown;
	reason: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	remediation?: string;
}

/**
 * Specialized error class for tool security and validation failures
 */
export class ToolValidationError extends Error {
	public readonly code: ToolValidationErrorCode;
	public readonly details: ToolValidationErrorDetail[];
	public readonly timestamp: Date;
	public readonly correlationId?: string;
	public readonly inputHash?: string;

	constructor(
		code: ToolValidationErrorCode,
		message: string,
		details: ToolValidationErrorDetail[] = [],
		options: {
			correlationId?: string;
			inputHash?: string;
			cause?: Error;
		} = {},
	) {
		super(message);
		this.name = 'ToolValidationError';
		this.code = code;
		this.details = details;
		this.timestamp = new Date();
		this.correlationId = options.correlationId;
		this.inputHash = options.inputHash;

		// Preserve original error if provided
		if (options.cause) {
			this.cause = options.cause;
		}

		// Ensure proper prototype chain
		Object.setPrototypeOf(this, ToolValidationError.prototype);
	}

	/**
	 * Create a security violation error
	 */
	static securityViolation(
		violationType: string,
		details: ToolValidationErrorDetail[] = [],
		options?: { correlationId?: string; inputHash?: string },
	): ToolValidationError {
		return new ToolValidationError(
			ToolValidationErrorCode.SECURITY_VIOLATION,
			`Security violation detected: ${violationType}`,
			details,
			options,
		);
	}

	/**
	 * Create an input validation error
	 */
	static inputValidationFailed(
		field: string,
		reason: string,
		options?: { correlationId?: string; inputHash?: string },
	): ToolValidationError {
		return new ToolValidationError(
			ToolValidationErrorCode.INPUT_VALIDATION_FAILED,
			`Input validation failed for field: ${field}`,
			[{ field, reason, severity: 'medium' }],
			options,
		);
	}

	/**
	 * Create an authorization denied error
	 */
	static authorizationDenied(
		operation: string,
		reason: string,
		options?: { correlationId?: string },
	): ToolValidationError {
		return new ToolValidationError(
			ToolValidationErrorCode.AUTHORIZATION_DENIED,
			`Authorization denied for operation: ${operation}`,
			[{ reason, severity: 'high' }],
			options,
		);
	}

	/**
	 * Create a rate limit exceeded error
	 */
	static rateLimitExceeded(
		userId: string,
		resetTime: Date,
		options?: { correlationId?: string },
	): ToolValidationError {
		return new ToolValidationError(
			ToolValidationErrorCode.RATE_LIMIT_EXCEEDED,
			`Rate limit exceeded for user: ${userId}`,
			[
				{
					reason: `Rate limit exceeded. Reset at: ${resetTime.toISOString()}`,
					severity: 'medium',
					remediation: 'Wait for rate limit window to reset',
				},
			],
			options,
		);
	}

	/**
	 * Create a path traversal error
	 */
	static pathTraversal(
		path: string,
		options?: { correlationId?: string; inputHash?: string },
	): ToolValidationError {
		return new ToolValidationError(
			ToolValidationErrorCode.PATH_TRAVERSAL,
			'Path traversal attack detected',
			[
				{
					field: 'path',
					reason: 'Path contains traversal patterns',
					severity: 'critical',
					remediation: 'Use absolute paths within allowed directories',
				},
			],
			options,
		);
	}

	/**
	 * Create a SQL injection error
	 */
	static sqlInjection(
		field: string,
		options?: { correlationId?: string; inputHash?: string },
	): ToolValidationError {
		return new ToolValidationError(
			ToolValidationErrorCode.SQL_INJECTION,
			'SQL injection attempt detected',
			[
				{
					field,
					reason: 'Input contains SQL injection patterns',
					severity: 'critical',
					remediation: 'Use parameterized queries and input sanitization',
				},
			],
			options,
		);
	}

	/**
	 * Create a prototype pollution error
	 */
	static prototypePollution(options?: {
		correlationId?: string;
		inputHash?: string;
	}): ToolValidationError {
		return new ToolValidationError(
			ToolValidationErrorCode.PROTOTYPE_POLLUTION,
			'Prototype pollution attempt detected',
			[
				{
					reason: 'Input attempts to modify object prototype',
					severity: 'critical',
					remediation: 'Remove __proto__, constructor, and prototype properties',
				},
			],
			options,
		);
	}

	/**
	 * Create an invalid URL scheme error
	 */
	static invalidUrlScheme(
		url: string,
		allowedSchemes: string[],
		options?: { correlationId?: string; inputHash?: string },
	): ToolValidationError {
		return new ToolValidationError(
			ToolValidationErrorCode.INVALID_URL_SCHEME,
			'Invalid URL scheme detected',
			[
				{
					field: 'url',
					reason: `URL scheme not allowed. Allowed schemes: ${allowedSchemes.join(', ')}`,
					severity: 'high',
					remediation: `Use only allowed URL schemes: ${allowedSchemes.join(', ')}`,
				},
			],
			options,
		);
	}

	/**
	 * Create a suspicious activity error
	 */
	static suspiciousActivity(
		pattern: string,
		options?: { correlationId?: string },
	): ToolValidationError {
		return new ToolValidationError(
			ToolValidationErrorCode.SUSPICIOUS_ACTIVITY,
			'Suspicious activity pattern detected',
			[
				{
					reason: `Detected suspicious pattern: ${pattern}`,
					severity: 'high',
					remediation: 'Review user activity and implement additional monitoring',
				},
			],
			options,
		);
	}

	/**
	 * Convert error to JSON for logging
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			details: this.details,
			timestamp: this.timestamp.toISOString(),
			correlationId: this.correlationId,
			inputHash: this.inputHash,
			stack: this.stack,
		};
	}

	/**
	 * Get sanitized error for client response (removes sensitive details)
	 */
	toClientError(): { code: string; message: string; timestamp: string } {
		return {
			code: this.code,
			message: this.getSanitizedMessage(),
			timestamp: this.timestamp.toISOString(),
		};
	}

	/**
	 * Get sanitized error message that doesn't leak sensitive information
	 */
	private getSanitizedMessage(): string {
		switch (this.code) {
			case ToolValidationErrorCode.SECURITY_VIOLATION:
				return 'Security violation detected in input';
			case ToolValidationErrorCode.INPUT_VALIDATION_FAILED:
				return 'Input validation failed';
			case ToolValidationErrorCode.AUTHORIZATION_DENIED:
				return 'Access denied';
			case ToolValidationErrorCode.RATE_LIMIT_EXCEEDED:
				return 'Rate limit exceeded';
			case ToolValidationErrorCode.PATH_TRAVERSAL:
				return 'Invalid file path';
			case ToolValidationErrorCode.SQL_INJECTION:
				return 'Invalid input format';
			case ToolValidationErrorCode.PROTOTYPE_POLLUTION:
				return 'Invalid object structure';
			case ToolValidationErrorCode.INVALID_URL_SCHEME:
				return 'Invalid URL format';
			case ToolValidationErrorCode.SUSPICIOUS_ACTIVITY:
				return 'Request blocked for security reasons';
			default:
				return 'Validation error occurred';
		}
	}
}
