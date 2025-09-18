import type { z } from 'zod';

/**
 * Error boundary with recovery strategies for different error types
 */
export class ErrorBoundary {
	private retryCount = 0;
	private maxRetries: number;
	private fallbackStrategies: Map<string, () => unknown> = new Map();

	constructor(maxRetries: number = 3) {
		this.maxRetries = maxRetries;
	}

	/**
	 * Execute with error boundary and recovery
	 */
	async execute<T>(
		operation: () => Promise<T>,
		context: {
			operationName: string;
			fallback?: () => Promise<T>;
			timeout?: number;
			onError?: (error: Error) => void;
		},
	): Promise<T> {
		const { operationName, fallback, timeout = 30000, onError } = context;

		try {
			// Execute with timeout
			const result = await this.withTimeout(operation(), timeout);
			this.retryCount = 0; // Reset on success
			return result;
		} catch (error) {
			const normalizedError = this.normalizeError(error);

			// Log error
			console.error(`Error in ${operationName}:`, normalizedError);
			onError?.(normalizedError);

			// Check if we should retry
			if (this.shouldRetry(normalizedError) && this.retryCount < this.maxRetries) {
				this.retryCount++;
				console.log(`Retrying ${operationName} (attempt ${this.retryCount}/${this.maxRetries})`);

				// Exponential backoff
				const delay = 2 ** this.retryCount * 1000;
				await new Promise((resolve) => setTimeout(resolve, delay));

				return this.execute(operation, context);
			}

			// Use fallback if available
			if (fallback) {
				try {
					console.log(`Using fallback for ${operationName}`);
					return await fallback();
				} catch (fallbackError) {
					console.error(`Fallback failed for ${operationName}:`, fallbackError);
					throw normalizedError; // Throw original error, not fallback error
				}
			}

			throw normalizedError;
		}
	}

	/**
	 * Register a fallback strategy for an operation
	 */
	registerFallback(operationName: string, fallback: () => unknown): void {
		this.fallbackStrategies.set(operationName, fallback);
	}

	/**
	 * Execute with timeout
	 */
	private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
		});

		return Promise.race([promise, timeoutPromise]);
	}

	/**
	 * Normalize error to ensure consistent error handling
	 */
	private normalizeError(error: unknown): Error {
		if (error instanceof Error) {
			return error;
		}

		if (typeof error === 'string') {
			return new Error(error);
		}

		if (error && typeof error === 'object' && 'message' in error) {
			return new Error(String(error.message));
		}

		return new Error(String(error));
	}

	/**
	 * Determine if an error is retryable
	 */
	private shouldRetry(error: Error): boolean {
		// Network errors are retryable
		if (
			error.message.includes('ECONNRESET') ||
			error.message.includes('ETIMEDOUT') ||
			error.message.includes('ENOTFOUND')
		) {
			return true;
		}

		// Rate limiting errors are retryable
		if (error.message.includes('429') || error.message.includes('rate limit')) {
			return true;
		}

		// Temporary service errors
		if (error.message.includes('503') || error.message.includes('service unavailable')) {
			return true;
		}

		return false;
	}

	/**
	 * Reset retry count
	 */
	reset(): void {
		this.retryCount = 0;
	}
}

/**
 * Global error boundary instance
 */
export const globalErrorBoundary = new ErrorBoundary();

/**
 * Error types for categorization
 */
export enum ErrorType {
	VALIDATION = 'validation',
	NETWORK = 'network',
	TIMEOUT = 'timeout',
	PERMISSION = 'permission',
	RESOURCE = 'resource',
	UNKNOWN = 'unknown',
}

/**
 * Categorized error with additional context
 */
export class CategorizedError extends Error {
	readonly type: ErrorType;
	readonly context: Record<string, unknown>;

	constructor(type: ErrorType, message: string, context: Record<string, unknown> = {}) {
		super(message);
		this.name = `${ErrorType.VALIDATION || 'Unknown'}Error`;
		this.type = type;
		this.context = context;
	}

	toJSON() {
		return {
			name: this.name,
			type: this.type,
			message: this.message,
			stack: this.stack,
			context: this.context,
		};
	}
}

/**
 * Validation error with Zod schema
 */
export class ValidationError extends CategorizedError {
	readonly schema: z.ZodSchema;
	readonly data: unknown;

	constructor(schema: z.ZodSchema, data: unknown, message?: string) {
		super(
			ErrorType.VALIDATION,
			message || `Validation failed for schema ${schema.description || 'unknown'}`,
			{ schema: schema.description, data },
		);
		this.schema = schema;
		this.data = data;
	}
}

/**
 * Resource error (file not found, etc.)
 */
export class ResourceError extends CategorizedError {
	readonly resource: string;
	readonly action: string;

	constructor(resource: string, action: string, message?: string) {
		super(ErrorType.RESOURCE, message || `Failed to ${action} resource: ${resource}`, {
			resource,
			action,
		});
		this.resource = resource;
		this.action = action;
	}
}

/**
 * Network error
 */
export class NetworkError extends CategorizedError {
	readonly url: string;
	readonly method: string;
	readonly statusCode?: number;

	constructor(url: string, method: string, statusCode?: number, message?: string) {
		super(ErrorType.NETWORK, message || `Network request failed: ${method} ${url}`, {
			url,
			method,
			statusCode,
		});
		this.url = url;
		this.method = method;
		this.statusCode = statusCode;
	}
}

/**
 * Timeout error
 */
export class TimeoutError extends CategorizedError {
	readonly operation: string;
	readonly timeout: number;

	constructor(operation: string, timeout: number) {
		super(ErrorType.TIMEOUT, `Operation "${operation}" timed out after ${timeout}ms`, {
			operation,
			timeout,
		});
		this.operation = operation;
		this.timeout = timeout;
	}
}

/**
 * Permission error
 */
export class PermissionError extends CategorizedError {
	readonly resource: string;
	readonly required: string;

	constructor(resource: string, required: string) {
		super(ErrorType.PERMISSION, `Permission denied: ${required} required for ${resource}`, {
			resource,
			required,
		});
		this.resource = resource;
		this.required = required;
	}
}
