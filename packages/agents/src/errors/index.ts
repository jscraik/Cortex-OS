/**
 * Custom error types for the Cortex Agent system
 */

// Base error class for all agent errors
export class AgentError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly retryable: boolean = false,
	) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

// Network-related errors
export class NetworkError extends AgentError {
	constructor(
		message: string,
		public readonly endpoint?: string,
	) {
		super(message, 'NETWORK_ERROR', true);
	}
}

export class TimeoutError extends AgentError {
	constructor(
		message: string,
		public readonly timeoutMs: number,
	) {
		super(message, 'TIMEOUT_ERROR', true);
	}
}

// Authentication errors
export class AuthenticationError extends AgentError {
	constructor(
		message: string,
		public readonly provider?: string,
	) {
		super(message, 'AUTH_ERROR', false);
	}
}

export class AuthorizationError extends AgentError {
	constructor(
		message: string,
		public readonly requiredPermission?: string,
	) {
		super(message, 'AUTHZ_ERROR', false);
	}
}

// Validation errors
export class ValidationError extends AgentError {
	constructor(
		message: string,
		public readonly field?: string,
		public readonly value?: unknown,
	) {
		super(message, 'VALIDATION_ERROR', false);
	}
}

// Rate limiting errors
export class RateLimitError extends AgentError {
	constructor(
		message: string,
		public readonly retryAfter?: number,
		public readonly limitType?: string,
	) {
		super(message, 'RATE_LIMIT_ERROR', true);
	}
}

// Provider-specific errors
export class ProviderError extends AgentError {
	constructor(
		message: string,
		public readonly provider: string,
		public readonly originalError?: unknown,
	) {
		super(message, 'PROVIDER_ERROR', true);
	}
}

export class ModelError extends AgentError {
	constructor(
		message: string,
		public readonly model: string,
		public readonly provider?: string,
	) {
		super(message, 'MODEL_ERROR', true);
	}
}

// Tool execution errors
export class ToolExecutionError extends AgentError {
	constructor(
		message: string,
		public readonly toolName: string,
		public readonly originalError?: unknown,
	) {
		super(message, 'TOOL_EXECUTION_ERROR', false);
	}
}

// Resource errors
export class ResourceNotFoundError extends AgentError {
	constructor(resourceType: string, resourceId: string) {
		super(`${resourceType} not found: ${resourceId}`, 'NOT_FOUND_ERROR', false);
	}
}

export class ResourceExhaustedError extends AgentError {
	constructor(
		message: string,
		public readonly resourceType: string,
		public readonly limit?: number,
	) {
		super(message, 'RESOURCE_EXHAUSTED_ERROR', true);
	}
}

// Configuration errors
export class ConfigurationError extends AgentError {
	constructor(
		message: string,
		public readonly field?: string,
	) {
		super(message, 'CONFIG_ERROR', false);
	}
}

// Utility function to wrap unknown errors
export function wrapUnknownError(error: unknown): AgentError {
	if (error instanceof AgentError) {
		return error;
	}

	if (error instanceof Error) {
		// Try to infer error type from error message or name
		if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
			return new TimeoutError(error.message, 0);
		}

		if (
			error.message.includes('unauthorized') ||
			error.message.includes('authentication') ||
			error.message.includes('401')
		) {
			return new AuthenticationError(error.message);
		}

		if (
			error.message.includes('forbidden') ||
			error.message.includes('permission') ||
			error.message.includes('403')
		) {
			return new AuthorizationError(error.message);
		}

		if (
			error.message.includes('rate limit') ||
			error.message.includes('too many requests') ||
			error.message.includes('429')
		) {
			return new RateLimitError(error.message);
		}

		if (error.message.includes('validation') || error.message.includes('invalid')) {
			return new ValidationError(error.message);
		}

		// Default to a generic agent error
		return new AgentError(error.message, 'UNKNOWN_ERROR', false);
	}

	// Handle non-Error objects
	const message = typeof error === 'string' ? error : 'Unknown error occurred';
	return new AgentError(message, 'UNKNOWN_ERROR', false);
}
