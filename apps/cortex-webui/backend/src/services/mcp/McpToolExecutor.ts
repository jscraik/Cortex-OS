/**
 * MCP Tool Execution Engine for cortex-webui
 *
 * Provides secure sandboxed execution of MCP tools with parameter validation,
 * async execution with timeout handling, and comprehensive error handling.
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import logger from '../utils/logger.js';
import type { McpSecurityManager } from './McpSecurityManager.js';
import type { ExecutionContext, McpToolRegistration, ResourceLimits } from './McpToolRegistry.js';
import { mcpToolRegistry } from './McpToolRegistry.js';

export interface ExecutionRequest {
	toolId: string;
	params: unknown;
	context: ExecutionContext;
	timeout?: number;
}

export interface ExecutionResult {
	success: boolean;
	toolId: string;
	data?: unknown;
	error?: {
		code: string;
		message: string;
		details?: string[];
	};
	metadata: {
		correlationId: string;
		executionTime: number;
		timestamp: string;
		memoryUsage?: number;
	};
}

export interface ExecutionStats {
	totalExecutions: number;
	successfulExecutions: number;
	failedExecutions: number;
	averageExecutionTime: number;
	mostExecutedTools: Array<{ toolId: string; count: number }>;
	recentExecutions: Array<{ toolId: string; timestamp: string; success: boolean }>;
}

// Error codes
export enum McpExecutionError {
	TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	PERMISSION_DENIED = 'PERMISSION_DENIED',
	TIMEOUT_ERROR = 'TIMEOUT_ERROR',
	RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
	EXECUTION_ERROR = 'EXECUTION_ERROR',
	SECURITY_VIOLATION = 'SECURITY_VIOLATION',
}

export class McpToolExecutor extends EventEmitter {
	private executionStats = {
		totalExecutions: 0,
		successfulExecutions: 0,
		failedExecutions: 0,
		totalExecutionTime: 0,
		toolExecutionCounts: new Map<string, number>(),
		recentExecutions: [] as Array<{ toolId: string; timestamp: string; success: boolean }>,
	};

	private activeExecutions = new Map<string, AbortController>();
	private readonly MAX_RECENT_EXECUTIONS = 100;

	constructor(private securityManager: McpSecurityManager) {
		super();
	}

	/**
	 * Execute an MCP tool with security validation and timeout handling
	 */
	public async execute(request: ExecutionRequest): Promise<ExecutionResult> {
		const correlationId = request.context.correlationId || randomUUID();
		const startTime = Date.now();
		const abortController = new AbortController();

		// Store for potential cancellation
		this.activeExecutions.set(correlationId, abortController);

		try {
			// Update stats
			this.executionStats.totalExecutions++;
			this.updateToolExecutionCount(request.toolId);

			// Get tool registration
			const tool = mcpToolRegistry.getTool(request.toolId);
			if (!tool) {
				throw new Error(McpExecutionError.TOOL_NOT_FOUND);
			}

			// Security validation
			await this.securityManager.validateExecution(request, tool);

			// Set timeout
			const timeout = request.timeout || tool.metadata.resourceLimits?.maxExecutionTime || 30000;

			// Execute with timeout
			const result = await this.executeWithTimeout(
				tool,
				request.params,
				request.context,
				timeout,
				abortController.signal,
			);

			const executionTime = Date.now() - startTime;

			// Record usage and update stats
			mcpToolRegistry.recordToolUsage(request.toolId);
			this.executionStats.successfulExecutions++;
			this.executionStats.totalExecutionTime += executionTime;
			this.addRecentExecution(request.toolId, true);

			// Emit success event
			this.emit('executionSuccess', {
				toolId: request.toolId,
				correlationId,
				executionTime,
			});

			return {
				success: true,
				toolId: request.toolId,
				data: result,
				metadata: {
					correlationId,
					executionTime,
					timestamp: new Date().toISOString(),
				},
			};
		} catch (error) {
			const executionTime = Date.now() - startTime;
			this.executionStats.failedExecutions++;
			this.executionStats.totalExecutionTime += executionTime;
			this.addRecentExecution(request.toolId, false);

			// Emit error event
			this.emit('executionError', {
				toolId: request.toolId,
				correlationId,
				error,
				executionTime,
			});

			// Log error with brAInwav branding
			logger.warn('brAInwav MCP tool execution failed', {
				toolId: request.toolId,
				correlationId,
				error: error instanceof Error ? error.message : 'Unknown error',
				executionTime,
			});

			return {
				success: false,
				toolId: request.toolId,
				error: this.formatError(error),
				metadata: {
					correlationId,
					executionTime,
					timestamp: new Date().toISOString(),
				},
			};
		} finally {
			// Cleanup
			this.activeExecutions.delete(correlationId);
		}
	}

	/**
	 * Execute tool with timeout and abort signal
	 */
	private async executeWithTimeout(
		tool: McpToolRegistration,
		params: unknown,
		context: ExecutionContext,
		timeout: number,
		signal: AbortSignal,
	): Promise<unknown> {
		return new Promise(async (resolve, reject) => {
			// Handle abort
			const handleAbort = () => {
				reject(new Error(McpExecutionError.TIMEOUT_ERROR));
			};

			if (signal.aborted) {
				handleAbort();
				return;
			}

			signal.addEventListener('abort', handleAbort);

			// Set timeout
			const timeoutHandle = setTimeout(() => {
				abortController.abort();
				reject(new Error(McpExecutionError.TIMEOUT_ERROR));
			}, timeout);

			try {
				// Validate input parameters
				const validatedParams = tool.schema.inputSchema.parse(params);

				// Execute tool
				const result = await tool.handler(validatedParams, context);

				// Validate output
				const validatedResult = tool.schema.outputSchema.parse(result);

				clearTimeout(timeoutHandle);
				signal.removeEventListener('abort', handleAbort);
				resolve(validatedResult);
			} catch (error) {
				clearTimeout(timeoutHandle);
				signal.removeEventListener('abort', handleAbort);
				reject(error);
			}
		});
	}

	/**
	 * Cancel an active execution
	 */
	public async cancelExecution(correlationId: string): Promise<boolean> {
		const controller = this.activeExecutions.get(correlationId);
		if (controller) {
			controller.abort();
			this.activeExecutions.delete(correlationId);
			logger.info('brAInwav MCP tool execution cancelled', { correlationId });
			return true;
		}
		return false;
	}

	/**
	 * Get execution statistics
	 */
	public getStats(): ExecutionStats {
		const averageExecutionTime =
			this.executionStats.totalExecutions > 0
				? this.executionStats.totalExecutionTime / this.executionStats.totalExecutions
				: 0;

		const mostExecutedTools = Array.from(this.executionStats.toolExecutionCounts.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([toolId, count]) => ({ toolId, count }));

		return {
			totalExecutions: this.executionStats.totalExecutions,
			successfulExecutions: this.executionStats.successfulExecutions,
			failedExecutions: this.executionStats.failedExecutions,
			averageExecutionTime,
			mostExecutedTools,
			recentExecutions: [...this.executionStats.recentExecutions],
		};
	}

	/**
	 * Get active executions
	 */
	public getActiveExecutions(): string[] {
		return Array.from(this.activeExecutions.keys());
	}

	/**
	 * Format error for response
	 */
	private formatError(error: unknown): ExecutionResult['error'] {
		if (error instanceof Error) {
			// Map known error codes
			const errorCode = Object.values(McpExecutionError).includes(
				error.message as McpExecutionError,
			)
				? error.message
				: McpExecutionError.EXECUTION_ERROR;

			return {
				code: errorCode,
				message: error.message,
				...(error.message.includes('validation') && {
					details: ['Input validation failed'],
				}),
			};
		}

		return {
			code: McpExecutionError.EXECUTION_ERROR,
			message: 'An unexpected error occurred during tool execution',
			details: ['Unknown error'],
		};
	}

	/**
	 * Update tool execution count
	 */
	private updateToolExecutionCount(toolId: string): void {
		const current = this.executionStats.toolExecutionCounts.get(toolId) || 0;
		this.executionStats.toolExecutionCounts.set(toolId, current + 1);
	}

	/**
	 * Add recent execution record
	 */
	private addRecentExecution(toolId: string, success: boolean): void {
		this.executionStats.recentExecutions.push({
			toolId,
			timestamp: new Date().toISOString(),
			success,
		});

		// Keep only recent executions
		if (this.executionStats.recentExecutions.length > this.MAX_RECENT_EXECUTIONS) {
			this.executionStats.recentExecutions = this.executionStats.recentExecutions.slice(
				-this.MAX_RECENT_EXECUTIONS,
			);
		}
	}

	/**
	 * Reset statistics (for testing)
	 */
	public resetStats(): void {
		this.executionStats = {
			totalExecutions: 0,
			successfulExecutions: 0,
			failedExecutions: 0,
			totalExecutionTime: 0,
			toolExecutionCounts: new Map(),
			recentExecutions: [],
		};
	}

	/**
	 * Gracefully shutdown
	 */
	public async shutdown(): Promise<void> {
		// Cancel all active executions
		for (const [correlationId, controller] of this.activeExecutions) {
			controller.abort();
			logger.info('brAInwav MCP tool execution cancelled during shutdown', { correlationId });
		}
		this.activeExecutions.clear();

		// Emit shutdown event
		this.emit('shutdown');
		logger.info('brAInwav MCP tool executor shutdown complete');
	}
}
