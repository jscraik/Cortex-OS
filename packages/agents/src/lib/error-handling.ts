/**
 * Error Boundary Protection System
 * Implements comprehensive error handling with graceful degradation
 * Following TDD plan requirements for production readiness
 */

import { z } from 'zod';

// Error severity levels
export const ErrorSeverity = {
	LOW: 'low',
	MEDIUM: 'medium',
	HIGH: 'high',
	CRITICAL: 'critical',
} as const;

export type ErrorSeverityType = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

// Error categories
export const ErrorCategory = {
	VALIDATION: 'validation',
	NETWORK: 'network',
	TIMEOUT: 'timeout',
	SECURITY: 'security',
	MEMORY: 'memory',
	UNKNOWN: 'unknown',
} as const;

export type ErrorCategoryType = (typeof ErrorCategory)[keyof typeof ErrorCategory];

// Error schema for validation
export const AgentErrorSchema = z.object({
	id: z.string(),
	message: z.string(),
	category: z.enum(['validation', 'network', 'timeout', 'security', 'memory', 'unknown']),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	timestamp: z.string(),
	stack: z.string().optional(),
	context: z.record(z.unknown()).optional(),
	retryable: z.boolean().default(false),
	handled: z.boolean().default(false),
});

export type AgentErrorType = z.infer<typeof AgentErrorSchema>;

/**
 * Enhanced error class for agents
 */
export class AgentError extends Error {
	public readonly id: string;
	public category: ErrorCategoryType;
	public severity: ErrorSeverityType;
	public readonly timestamp: string;
	public readonly context?: Record<string, unknown>;
	public readonly retryable: boolean;
	public handled: boolean;

	constructor(
		message: string,
		category: ErrorCategoryType = ErrorCategory.UNKNOWN,
		severity: ErrorSeverityType = ErrorSeverity.MEDIUM,
		context?: Record<string, unknown>,
		retryable = false,
	) {
		super(message);
		this.name = 'AgentError';
		this.id = crypto.randomUUID();
		this.category = category;
		this.severity = severity;
		this.timestamp = new Date().toISOString();
		this.context = context;
		this.retryable = retryable;
		this.handled = false;

		// Maintain proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AgentError);
		}
	}

	/**
	 * Create AgentError from unknown error
	 */
	static fromUnknown(error: unknown, context?: Record<string, unknown>): AgentError {
		if (error instanceof AgentError) {
			return error;
		}

		if (error instanceof Error) {
			const agentError = new AgentError(
				error.message,
				ErrorCategory.UNKNOWN,
				ErrorSeverity.MEDIUM,
				context,
				false,
			);
			agentError.stack = error.stack;
			return agentError;
		}

		return new AgentError(
			typeof error === 'string' ? error : 'Unknown error occurred',
			ErrorCategory.UNKNOWN,
			ErrorSeverity.MEDIUM,
			{ originalError: error, ...context },
			false,
		);
	}

	/**
	 * Convert to JSON for logging
	 */
	toJSON(): AgentErrorType {
		return {
			id: this.id,
			message: this.message,
			category: this.category,
			severity: this.severity,
			timestamp: this.timestamp,
			stack: this.stack,
			context: this.context,
			retryable: this.retryable,
			handled: this.handled,
		};
	}
}

/**
 * Error handler interface
 */
export interface ErrorHandler {
	handleError(error: AgentError, source: string): Promise<void>;
	isRetryable(error: AgentError): boolean;
	shouldExit(error: AgentError): boolean;
}

/**
 * Production error handler implementation
 */
export class ProductionErrorHandler implements ErrorHandler {
	private errorCounts = new Map<string, number>();
	private maxRetries = 3;
	private exitOnCritical = true;

	constructor(
		private config: {
			maxRetries?: number;
			exitOnCritical?: boolean;
			notificationCallback?: (error: AgentError) => Promise<void>;
		} = {},
	) {
		this.maxRetries = config.maxRetries ?? 3;
		this.exitOnCritical = config.exitOnCritical ?? true;
	}

	async handleError(error: AgentError, source: string): Promise<void> {
		error.handled = true;

		// Log error with context
		const logData = {
			...error.toJSON(),
			source,
			retryCount: this.errorCounts.get(error.id) || 0,
		};

		switch (error.severity) {
			case ErrorSeverity.LOW:
				console.warn('Agent Warning:', logData);
				break;
			case ErrorSeverity.MEDIUM:
				console.error('Agent Error:', logData);
				break;
			case ErrorSeverity.HIGH:
				console.error('Agent High Severity Error:', logData);
				break;
			case ErrorSeverity.CRITICAL:
				console.error('Agent CRITICAL Error:', logData);
				if (this.config.notificationCallback) {
					await this.config.notificationCallback(error);
				}
				break;
		}

		// Track error count for retry logic
		const currentCount = this.errorCounts.get(error.id) || 0;
		this.errorCounts.set(error.id, currentCount + 1);

		// Cleanup old error counts to prevent memory leaks
		if (this.errorCounts.size > 1000) {
			const entries = Array.from(this.errorCounts.entries());
			const toDelete = entries.slice(0, entries.length - 500);
			for (const [id] of toDelete) {
				this.errorCounts.delete(id);
			}
		}
	}

	isRetryable(error: AgentError): boolean {
		if (!error.retryable) {
			return false;
		}

		const retryCount = this.errorCounts.get(error.id) || 0;
		return retryCount < this.maxRetries;
	}

	shouldExit(error: AgentError): boolean {
		return (
			error.severity === ErrorSeverity.CRITICAL && this.exitOnCritical && !this.isRetryable(error)
		);
	}
}

/**
 * Resource manager for graceful shutdown
 */
export class ResourceManager {
	private resources: Array<{ name: string; cleanup: () => Promise<void> }> = [];
	private isShuttingDown = false;

	register(name: string, cleanup: () => Promise<void>): void {
		this.resources.push({ name, cleanup });
	}

	async cleanup(): Promise<void> {
		if (this.isShuttingDown) {
			return;
		}

		this.isShuttingDown = true;
		console.log('🧹 Starting resource cleanup...');

		for (const resource of this.resources) {
			try {
				console.log(`  ↳ Cleaning up ${resource.name}...`);
				await resource.cleanup();
			} catch (error) {
				console.error(`Failed to cleanup ${resource.name}:`, error);
			}
		}

		console.log('✅ Resource cleanup completed');
	}
}

/**
 * Global error boundary setup
 */
export function setupErrorBoundary(
	errorHandler: ErrorHandler,
	resourceManager: ResourceManager,
): void {
	const handleGlobalError = async (error: AgentError, source: string) => {
		await errorHandler.handleError(error, source);

		if (errorHandler.shouldExit(error)) {
			console.error('💀 Critical error detected, initiating graceful shutdown...');
			await gracefulShutdown(resourceManager);
			process.exit(1);
		}
	};

	// Unhandled promise rejections
	process.on('unhandledRejection', async (reason, promise) => {
		const error = AgentError.fromUnknown(reason, {
			promise: promise.toString(),
			type: 'unhandledRejection',
		});
		// Set after creation since properties are mutable
		error.category = ErrorCategory.UNKNOWN;
		error.severity = ErrorSeverity.HIGH;

		await handleGlobalError(error, 'unhandled-rejection');
	});

	// Uncaught exceptions
	process.on('uncaughtException', async (error) => {
		const agentError = AgentError.fromUnknown(error, {
			type: 'uncaughtException',
		});
		// Set after creation since properties are mutable
		agentError.category = ErrorCategory.UNKNOWN;
		agentError.severity = ErrorSeverity.CRITICAL;

		await handleGlobalError(agentError, 'uncaught-exception');
	});

	// Graceful shutdown signals
	process.on('SIGTERM', async () => {
		console.log('📡 Received SIGTERM signal, starting graceful shutdown...');
		await gracefulShutdown(resourceManager);
		process.exit(0);
	});

	process.on('SIGINT', async () => {
		console.log('⚡ Received SIGINT signal, starting graceful shutdown...');
		await gracefulShutdown(resourceManager);
		process.exit(0);
	});
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(resourceManager: ResourceManager): Promise<void> {
	console.log('🔄 Starting graceful shutdown...');

	try {
		// Stop accepting new requests
		console.log('  ↳ Stopping request acceptance...');

		// Clean up resources
		await resourceManager.cleanup();

		console.log('✅ Graceful shutdown completed');
	} catch (error) {
		console.error('❌ Error during shutdown:', error);
	}
}
