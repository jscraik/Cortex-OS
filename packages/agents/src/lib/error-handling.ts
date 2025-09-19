/**
 * Comprehensive Error Handling for Cortex-OS Agents
 *
 * Provides structured error handling, resource cleanup, and recovery mechanisms
 * following brAInwav engineering standards.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { EventEmitter } from 'node:events';

// Error types following the architecture diagram
export enum AgentErrorType {
	SECURITY_VALIDATION_FAILED = 'SECURITY_VALIDATION_FAILED',
	INTELLIGENCE_ROUTING_FAILED = 'INTELLIGENCE_ROUTING_FAILED',
	TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
	EXECUTION_SURFACE_FAILED = 'EXECUTION_SURFACE_FAILED',
	COORDINATION_FAILED = 'COORDINATION_FAILED',
	TIMEOUT_ERROR = 'TIMEOUT_ERROR',
	RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
	NETWORK_ERROR = 'NETWORK_ERROR',
	CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
	UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical',
}

// Agent-specific error class
export class AgentError extends Error {
	public readonly type: AgentErrorType;
	public readonly severity: ErrorSeverity;
	public readonly agentName?: string;
	public readonly context?: Record<string, unknown>;
	public readonly timestamp: string;
	public readonly recoverable: boolean;

	constructor(
		message: string,
		type: AgentErrorType = AgentErrorType.UNKNOWN_ERROR,
		severity: ErrorSeverity = ErrorSeverity.MEDIUM,
		options?: {
			agentName?: string;
			context?: Record<string, unknown>;
			recoverable?: boolean;
			cause?: Error;
		},
	) {
		super(message);
		this.name = 'AgentError';
		this.type = type;
		this.severity = severity;
		this.agentName = options?.agentName;
		this.context = options?.context;
		this.timestamp = new Date().toISOString();
		this.recoverable = options?.recoverable ?? true;

		if (options?.cause) {
			this.cause = options.cause;
		}

		// Maintain proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AgentError);
		}
	}

	/**
	 * Convert to structured error object
	 */
	toStructured(): {
		type: string;
		message: string;
		severity: string;
		agentName?: string;
		context?: Record<string, unknown>;
		timestamp: string;
		recoverable: boolean;
		stack?: string;
	} {
		return {
			type: this.type,
			message: this.message,
			severity: this.severity,
			agentName: this.agentName,
			context: this.context,
			timestamp: this.timestamp,
			recoverable: this.recoverable,
			stack: this.stack,
		};
	}
}

// Resource management interface
export interface Resource {
	id: string;
	type: 'timeout' | 'event-listener' | 'stream' | 'connection' | 'memory';
	cleanup: () => Promise<void> | void;
	metadata?: Record<string, unknown>;
}

// Error recovery strategy
export interface RecoveryStrategy {
	name: string;
	canRecover: (error: AgentError) => boolean;
	recover: (error: AgentError) => Promise<unknown>;
	maxRetries: number;
}

/**
 * Resource Manager for proper cleanup
 */
export class ResourceManager {
	private resources = new Map<string, Resource>();
	private cleanupHandlers = new Set<() => Promise<void> | void>();

	/**
	 * Register a resource for cleanup
	 */
	register(resource: Resource): void {
		this.resources.set(resource.id, resource);
	}

	/**
	 * Unregister a resource
	 */
	unregister(resourceId: string): void {
		this.resources.delete(resourceId);
	}

	/**
	 * Add cleanup handler
	 */
	addCleanupHandler(handler: () => Promise<void> | void): void {
		this.cleanupHandlers.add(handler);
	}

	/**
	 * Remove cleanup handler
	 */
	removeCleanupHandler(handler: () => Promise<void> | void): void {
		this.cleanupHandlers.delete(handler);
	}

	/**
	 * Cleanup all registered resources
	 */
	async cleanup(): Promise<void> {
		const cleanupPromises: Array<Promise<void>> = [];

		// Cleanup registered resources
		for (const [resourceId, resource] of this.resources) {
			const promise = (async () => {
				try {
					await resource.cleanup();
					this.resources.delete(resourceId);
				} catch (error) {
					console.error(`Failed to cleanup resource ${resourceId}:`, error);
				}
			})();
			cleanupPromises.push(promise);
		}

		// Execute cleanup handlers
		for (const handler of this.cleanupHandlers) {
			const promise = (async () => {
				try {
					await handler();
				} catch (error) {
					console.error('Cleanup handler failed:', error);
				}
			})();
			cleanupPromises.push(promise);
		}

		// Wait for all cleanup operations
		await Promise.allSettled(cleanupPromises);
		this.cleanupHandlers.clear();
	}

	/**
	 * Get resource count by type
	 */
	getResourceCount(type?: Resource['type']): number {
		if (!type) return this.resources.size;
		return Array.from(this.resources.values()).filter((r) => r.type === type).length;
	}
}

/**
 * Error Handler with recovery strategies
 */
export class ErrorHandler extends EventEmitter {
	private resourceManager: ResourceManager;
	private recoveryStrategies = new Map<AgentErrorType, RecoveryStrategy>();
	private retryCount = new Map<string, number>();

	constructor(resourceManager: ResourceManager) {
		super();
		this.resourceManager = resourceManager;
		this.initializeDefaultStrategies();
	}

	/**
	 * Handle an error with recovery attempts
	 */
	async handleError(
		error: AgentError,
		operationId: string,
	): Promise<{ recovered: boolean; result?: unknown }> {
		this.emit('error-occurred', error);

		const strategy = this.recoveryStrategies.get(error.type);
		if (!strategy || !error.recoverable) {
			this.emit('error-unrecoverable', error);
			return { recovered: false };
		}

		const currentRetries = this.retryCount.get(operationId) || 0;
		if (currentRetries >= strategy.maxRetries) {
			this.emit('error-max-retries', error);
			return { recovered: false };
		}

		try {
			if (strategy.canRecover(error)) {
				this.retryCount.set(operationId, currentRetries + 1);
				const result = await strategy.recover(error);
				this.retryCount.delete(operationId);
				this.emit('error-recovered', { error, result });
				return { recovered: true, result };
			}
		} catch (recoveryError) {
			this.emit('recovery-failed', { originalError: error, recoveryError });
		}

		return { recovered: false };
	}

	/**
	 * Add custom recovery strategy
	 */
	addRecoveryStrategy(errorType: AgentErrorType, strategy: RecoveryStrategy): void {
		this.recoveryStrategies.set(errorType, strategy);
	}

	/**
	 * Initialize default recovery strategies
	 */
	private initializeDefaultStrategies(): void {
		// Timeout error recovery
		this.recoveryStrategies.set(AgentErrorType.TIMEOUT_ERROR, {
			name: 'timeout-retry',
			canRecover: (error) => error.severity !== ErrorSeverity.CRITICAL,
			recover: async (error) => {
				// Implement timeout recovery logic
				console.log(`Recovering from timeout error: ${error.message}`);
				await new Promise((resolve) => setTimeout(resolve, 1000));
				return { retried: true };
			},
			maxRetries: 3,
		});

		// Network error recovery
		this.recoveryStrategies.set(AgentErrorType.NETWORK_ERROR, {
			name: 'network-retry',
			canRecover: (error) => error.severity !== ErrorSeverity.CRITICAL,
			recover: async (error) => {
				console.log(`Recovering from network error: ${error.message}`);
				await new Promise((resolve) => setTimeout(resolve, 2000));
				return { retried: true };
			},
			maxRetries: 2,
		});

		// Tool execution recovery
		this.recoveryStrategies.set(AgentErrorType.TOOL_EXECUTION_FAILED, {
			name: 'tool-fallback',
			canRecover: (error) => error.context?.fallbackAvailable === true,
			recover: async (error) => {
				console.log(`Using fallback for tool execution: ${error.message}`);
				return { fallbackUsed: true };
			},
			maxRetries: 1,
		});
	}

	/**
	 * Create timeout with automatic cleanup
	 */
	createTimeout(ms: number, operationId: string): Promise<never> {
		return new Promise((_, reject) => {
			const timeoutId = setTimeout(() => {
				reject(
					new AgentError(
						`Operation timed out after ${ms}ms`,
						AgentErrorType.TIMEOUT_ERROR,
						ErrorSeverity.HIGH,
						{ context: { timeoutMs: ms, operationId } },
					),
				);
			}, ms);

			// Register for cleanup
			this.resourceManager.register({
				id: `timeout-${operationId}`,
				type: 'timeout',
				cleanup: () => clearTimeout(timeoutId),
				metadata: { ms, operationId },
			});
		});
	}

	/**
	 * Wrap async operation with error handling and timeout
	 */
	async withErrorHandling<T>(
		operation: () => Promise<T>,
		operationId: string,
		options?: {
			timeout?: number;
			agentName?: string;
			context?: Record<string, unknown>;
		},
	): Promise<T> {
		const promises: Array<Promise<T | never>> = [operation()];

		// Add timeout if specified
		if (options?.timeout) {
			promises.push(this.createTimeout(options.timeout, operationId));
		}

		try {
			const result = await Promise.race(promises);
			// Clean up timeout resource if operation completed
			this.resourceManager.unregister(`timeout-${operationId}`);
			return result;
		} catch (error) {
			// Convert to AgentError if needed
			const agentError =
				error instanceof AgentError
					? error
					: new AgentError(
							error instanceof Error ? error.message : String(error),
							AgentErrorType.UNKNOWN_ERROR,
							ErrorSeverity.MEDIUM,
							{
								agentName: options?.agentName,
								context: options?.context,
								cause: error instanceof Error ? error : undefined,
							},
						);

			// Attempt recovery
			const recovery = await this.handleError(agentError, operationId);
			if (recovery.recovered) {
				return recovery.result as T;
			}

			throw agentError;
		}
	}

	/**
	 * Get error statistics
	 */
	getErrorStats(): {
		totalRetries: number;
		activeOperations: number;
		recoveryStrategies: number;
	} {
		return {
			totalRetries: Array.from(this.retryCount.values()).reduce((a, b) => a + b, 0),
			activeOperations: this.retryCount.size,
			recoveryStrategies: this.recoveryStrategies.size,
		};
	}
}

/**
 * Utility functions for error handling
 */
export const errorUtils = {
	/**
	 * Check if error is retryable
	 */
	isRetryable(error: AgentError): boolean {
		return (
			error.recoverable &&
			error.severity !== ErrorSeverity.CRITICAL &&
			![AgentErrorType.SECURITY_VALIDATION_FAILED, AgentErrorType.CONFIGURATION_ERROR].includes(
				error.type,
			)
		);
	},

	/**
	 * Create error from unknown value
	 */
	fromUnknown(error: unknown, agentName?: string, context?: Record<string, unknown>): AgentError {
		if (error instanceof AgentError) {
			return error;
		}

		if (error instanceof Error) {
			return new AgentError(error.message, AgentErrorType.UNKNOWN_ERROR, ErrorSeverity.MEDIUM, {
				agentName,
				context,
				cause: error,
			});
		}

		return new AgentError(String(error), AgentErrorType.UNKNOWN_ERROR, ErrorSeverity.MEDIUM, {
			agentName,
			context,
		});
	},

	/**
	 * Create timeout error
	 */
	createTimeoutError(timeoutMs: number, operationId: string, agentName?: string): AgentError {
		return new AgentError(
			`Operation '${operationId}' timed out after ${timeoutMs}ms`,
			AgentErrorType.TIMEOUT_ERROR,
			ErrorSeverity.HIGH,
			{
				agentName,
				context: { timeoutMs, operationId },
				recoverable: true,
			},
		);
	},

	/**
	 * Create security validation error
	 */
	createSecurityError(
		reason: string,
		agentName?: string,
		context?: Record<string, unknown>,
	): AgentError {
		return new AgentError(
			`Security validation failed: ${reason}`,
			AgentErrorType.SECURITY_VALIDATION_FAILED,
			ErrorSeverity.HIGH,
			{
				agentName,
				context,
				recoverable: false,
			},
		);
	},
};

/**
 * Factory function to create error handler with resource manager
 */
export function createErrorHandler(): {
	errorHandler: ErrorHandler;
	resourceManager: ResourceManager;
} {
	const resourceManager = new ResourceManager();
	const errorHandler = new ErrorHandler(resourceManager);

	// Setup process cleanup handlers
	const cleanup = async () => {
		await resourceManager.cleanup();
	};

	process.on('exit', cleanup);
	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);
	process.on('uncaughtException', (error) => {
		console.error('Uncaught exception:', error);
		cleanup().finally(() => process.exit(1));
	});

	return { errorHandler, resourceManager };
}
