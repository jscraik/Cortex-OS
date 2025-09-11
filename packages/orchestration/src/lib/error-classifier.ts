/**
 * Error Classification System for Intelligent Retry Strategies
 * Classifies errors to determine appropriate retry behavior
 */

export enum ErrorType {
	RETRYABLE = 'retryable',
	NON_RETRYABLE = 'non_retryable',
	RATE_LIMITED = 'rate_limited',
	RESOURCE_EXHAUSTED = 'resource_exhausted',
	AUTHENTICATION_ERROR = 'authentication_error',
	AUTHORIZATION_ERROR = 'authorization_error',
	TIMEOUT = 'timeout',
	NETWORK_ERROR = 'network_error',
	VALIDATION_ERROR = 'validation_error',
	INTERNAL_ERROR = 'internal_error',
}

export enum RetryStrategy {
	NONE = 'none',
	IMMEDIATE = 'immediate',
	LINEAR = 'linear',
	EXPONENTIAL = 'exponential',
	EXPONENTIAL_WITH_JITTER = 'exponential_with_jitter',
}

export interface ErrorClassification {
	type: ErrorType;
	retryable: boolean;
	strategy: RetryStrategy;
	baseDelayMs: number;
	maxRetries: number;
	backoffMultiplier: number;
	jitter: boolean;
	circuitBreakerEnabled: boolean;
	description: string;
}

/**
 * Error code mappings for different error types
 */
const ERROR_CODE_MAPPINGS: Record<string, ErrorType> = {
	// Network errors (retryable)
	ECONNRESET: ErrorType.NETWORK_ERROR,
	ECONNREFUSED: ErrorType.NETWORK_ERROR,
	ETIMEDOUT: ErrorType.TIMEOUT,
	ENOTFOUND: ErrorType.NETWORK_ERROR,
	EHOSTUNREACH: ErrorType.NETWORK_ERROR,
	ENETUNREACH: ErrorType.NETWORK_ERROR,

	// Permission errors (non-retryable)
	EACCES: ErrorType.AUTHORIZATION_ERROR,
	EPERM: ErrorType.AUTHORIZATION_ERROR,
	EAUTH: ErrorType.AUTHENTICATION_ERROR,

	// Resource errors
	EMFILE: ErrorType.RESOURCE_EXHAUSTED,
	ENFILE: ErrorType.RESOURCE_EXHAUSTED,
	ENOSPC: ErrorType.RESOURCE_EXHAUSTED,
	ENOMEM: ErrorType.RESOURCE_EXHAUSTED,

	// Rate limiting
	RATE_LIMIT: ErrorType.RATE_LIMITED,
	TOO_MANY_REQUESTS: ErrorType.RATE_LIMITED,
	QUOTA_EXCEEDED: ErrorType.RATE_LIMITED,

	// Circuit breaker
	CIRCUIT_BREAKER_OPEN: ErrorType.NON_RETRYABLE,
	CIRCUIT_BREAKER_HALF_OPEN_LIMIT: ErrorType.NON_RETRYABLE,

	// Validation errors (non-retryable)
	VALIDATION_ERROR: ErrorType.VALIDATION_ERROR,
	INVALID_INPUT: ErrorType.VALIDATION_ERROR,
	SCHEMA_VALIDATION_ERROR: ErrorType.VALIDATION_ERROR,
};

/**
 * HTTP status code mappings
 */
const HTTP_STATUS_MAPPINGS: Record<number, ErrorType> = {
	// 4xx Client Errors (mostly non-retryable)
	400: ErrorType.VALIDATION_ERROR,
	401: ErrorType.AUTHENTICATION_ERROR,
	403: ErrorType.AUTHORIZATION_ERROR,
	404: ErrorType.NON_RETRYABLE,
	409: ErrorType.NON_RETRYABLE,
	410: ErrorType.NON_RETRYABLE,
	422: ErrorType.VALIDATION_ERROR,
	429: ErrorType.RATE_LIMITED,

	// 5xx Server Errors (retryable)
	500: ErrorType.INTERNAL_ERROR,
	502: ErrorType.RETRYABLE,
	503: ErrorType.RETRYABLE,
	504: ErrorType.TIMEOUT,
	507: ErrorType.RESOURCE_EXHAUSTED,
};

/**
 * Error classification configurations
 */
const ERROR_CLASSIFICATIONS: Record<ErrorType, ErrorClassification> = {
	[ErrorType.RETRYABLE]: {
		type: ErrorType.RETRYABLE,
		retryable: true,
		strategy: RetryStrategy.EXPONENTIAL_WITH_JITTER,
		baseDelayMs: 1000,
		maxRetries: 3,
		backoffMultiplier: 2,
		jitter: true,
		circuitBreakerEnabled: false,
		description: 'Transient error that may succeed on retry',
	},
	[ErrorType.NON_RETRYABLE]: {
		type: ErrorType.NON_RETRYABLE,
		retryable: false,
		strategy: RetryStrategy.NONE,
		baseDelayMs: 0,
		maxRetries: 0,
		backoffMultiplier: 1,
		jitter: false,
		circuitBreakerEnabled: false,
		description: 'Permanent error that will not succeed on retry',
	},
	[ErrorType.RATE_LIMITED]: {
		type: ErrorType.RATE_LIMITED,
		retryable: true,
		strategy: RetryStrategy.EXPONENTIAL,
		baseDelayMs: 5000,
		maxRetries: 5,
		backoffMultiplier: 2,
		jitter: false,
		circuitBreakerEnabled: true,
		description: 'Rate limit exceeded, use exponential backoff',
	},
	[ErrorType.RESOURCE_EXHAUSTED]: {
		type: ErrorType.RESOURCE_EXHAUSTED,
		retryable: true,
		strategy: RetryStrategy.EXPONENTIAL_WITH_JITTER,
		baseDelayMs: 10000,
		maxRetries: 3,
		backoffMultiplier: 3,
		jitter: true,
		circuitBreakerEnabled: true,
		description: 'Resource exhaustion, longer delays needed',
	},
	[ErrorType.AUTHENTICATION_ERROR]: {
		type: ErrorType.AUTHENTICATION_ERROR,
		retryable: false,
		strategy: RetryStrategy.NONE,
		baseDelayMs: 0,
		maxRetries: 0,
		backoffMultiplier: 1,
		jitter: false,
		circuitBreakerEnabled: false,
		description: 'Authentication failed, requires credential refresh',
	},
	[ErrorType.AUTHORIZATION_ERROR]: {
		type: ErrorType.AUTHORIZATION_ERROR,
		retryable: false,
		strategy: RetryStrategy.NONE,
		baseDelayMs: 0,
		maxRetries: 0,
		backoffMultiplier: 1,
		jitter: false,
		circuitBreakerEnabled: false,
		description: 'Authorization failed, insufficient permissions',
	},
	[ErrorType.TIMEOUT]: {
		type: ErrorType.TIMEOUT,
		retryable: true,
		strategy: RetryStrategy.EXPONENTIAL_WITH_JITTER,
		baseDelayMs: 2000,
		maxRetries: 3,
		backoffMultiplier: 2,
		jitter: true,
		circuitBreakerEnabled: true,
		description: 'Operation timed out, may succeed with retry',
	},
	[ErrorType.NETWORK_ERROR]: {
		type: ErrorType.NETWORK_ERROR,
		retryable: true,
		strategy: RetryStrategy.EXPONENTIAL_WITH_JITTER,
		baseDelayMs: 1000,
		maxRetries: 4,
		backoffMultiplier: 2,
		jitter: true,
		circuitBreakerEnabled: true,
		description: 'Network connectivity issue, likely transient',
	},
	[ErrorType.VALIDATION_ERROR]: {
		type: ErrorType.VALIDATION_ERROR,
		retryable: false,
		strategy: RetryStrategy.NONE,
		baseDelayMs: 0,
		maxRetries: 0,
		backoffMultiplier: 1,
		jitter: false,
		circuitBreakerEnabled: false,
		description: 'Input validation failed, requires correction',
	},
	[ErrorType.INTERNAL_ERROR]: {
		type: ErrorType.INTERNAL_ERROR,
		retryable: true,
		strategy: RetryStrategy.EXPONENTIAL_WITH_JITTER,
		baseDelayMs: 2000,
		maxRetries: 2,
		backoffMultiplier: 2,
		jitter: true,
		circuitBreakerEnabled: true,
		description: 'Internal server error, may be transient',
	},
};

/**
 * Classify an error to determine retry behavior
 */
export function classifyError(error: any): ErrorClassification {
	// Check for error code first
	if (error.code && ERROR_CODE_MAPPINGS[error.code]) {
		const errorType = ERROR_CODE_MAPPINGS[error.code];
		return ERROR_CLASSIFICATIONS[errorType];
	}

	// Check HTTP status code
	if (error.status || error.statusCode) {
		const statusCode = error.status || error.statusCode;
		if (HTTP_STATUS_MAPPINGS[statusCode]) {
			const errorType = HTTP_STATUS_MAPPINGS[statusCode];
			return ERROR_CLASSIFICATIONS[errorType];
		}
	}

	// Check error message patterns
	const message = (error.message || '').toLowerCase();

	if (message.includes('timeout')) {
		return ERROR_CLASSIFICATIONS[ErrorType.TIMEOUT];
	}

	if (message.includes('rate limit') || message.includes('too many requests')) {
		return ERROR_CLASSIFICATIONS[ErrorType.RATE_LIMITED];
	}

	if (message.includes('network') || message.includes('connection')) {
		return ERROR_CLASSIFICATIONS[ErrorType.NETWORK_ERROR];
	}

	if (message.includes('validation') || message.includes('invalid')) {
		return ERROR_CLASSIFICATIONS[ErrorType.VALIDATION_ERROR];
	}

	if (
		message.includes('auth') ||
		message.includes('permission') ||
		message.includes('access denied')
	) {
		return ERROR_CLASSIFICATIONS[ErrorType.AUTHORIZATION_ERROR];
	}

	if (
		message.includes('resource') ||
		message.includes('memory') ||
		message.includes('disk')
	) {
		return ERROR_CLASSIFICATIONS[ErrorType.RESOURCE_EXHAUSTED];
	}

	// Default to retryable for unknown errors with conservative settings
	return {
		type: ErrorType.RETRYABLE,
		retryable: true,
		strategy: RetryStrategy.EXPONENTIAL_WITH_JITTER,
		baseDelayMs: 1000,
		maxRetries: 2,
		backoffMultiplier: 2,
		jitter: true,
		circuitBreakerEnabled: false,
		description: 'Unknown error, assuming retryable with conservative settings',
	};
}

/**
 * Calculate retry delay based on error classification and attempt number
 */
export function calculateRetryDelay(
	classification: ErrorClassification,
	attempt: number,
	maxBackoffMs: number = 30000,
): number {
	if (!classification.retryable || attempt > classification.maxRetries) {
		return 0;
	}

	let delay: number;

	switch (classification.strategy) {
		case RetryStrategy.NONE:
			return 0;

		case RetryStrategy.IMMEDIATE:
			delay = 0;
			break;

		case RetryStrategy.LINEAR:
			delay = classification.baseDelayMs * attempt;
			break;

		case RetryStrategy.EXPONENTIAL:
			delay =
				classification.baseDelayMs *
				classification.backoffMultiplier ** (attempt - 1);
			break;

		case RetryStrategy.EXPONENTIAL_WITH_JITTER:
			delay =
				classification.baseDelayMs *
				classification.backoffMultiplier ** (attempt - 1);
			if (classification.jitter) {
				const jitterAmount = delay * 0.1; // 10% jitter
				delay += Math.random() * jitterAmount * 2 - jitterAmount;
			}
			break;

		default:
			delay = classification.baseDelayMs;
	}

	// Cap the delay at maximum backoff time
	return Math.min(Math.max(0, Math.floor(delay)), maxBackoffMs);
}

/**
 * Check if an error should trigger a circuit breaker
 */
export function shouldTriggerCircuitBreaker(
	classification: ErrorClassification,
): boolean {
	return classification.circuitBreakerEnabled;
}

/**
 * Get a human-readable description of the error classification
 */
export function getErrorDescription(error: any): string {
	const classification = classifyError(error);
	return `${classification.description} (Type: ${classification.type}, Retryable: ${classification.retryable})`;
}

/**
 * Enhanced retry policy based on error classification
 */
export interface EnhancedRetryPolicy {
	maxRetries: number;
	baseDelayMs: number;
	maxBackoffMs: number;
	strategy: RetryStrategy;
	backoffMultiplier: number;
	jitter: boolean;
	circuitBreakerEnabled: boolean;
	errorFilter?: (error: any) => boolean;
}

/**
 * Create retry policy from error classification
 */
export function createRetryPolicy(
	classification: ErrorClassification,
): EnhancedRetryPolicy {
	return {
		maxRetries: classification.maxRetries,
		baseDelayMs: classification.baseDelayMs,
		maxBackoffMs: 30000,
		strategy: classification.strategy,
		backoffMultiplier: classification.backoffMultiplier,
		jitter: classification.jitter,
		circuitBreakerEnabled: classification.circuitBreakerEnabled,
	};
}

/**
 * Utility function to check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
	return classifyError(error).retryable;
}
