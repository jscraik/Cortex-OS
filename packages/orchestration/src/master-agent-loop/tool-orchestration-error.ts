/**
 * @fileoverview Tool Orchestration Error - Phase 3.6
 * @module ToolOrchestrationError
 * @description Specialized error class for tool orchestration failures
 * @author brAInwav Development Team
 * @version 3.6.0
 * @since 2024-12-09
 */

/**
 * Tool orchestration error codes
 */
export enum ToolOrchestrationErrorCode {
	ORCHESTRATION_FAILED = 'ORCHESTRATION_FAILED',
	DEPENDENCY_CYCLE = 'DEPENDENCY_CYCLE',
	LAYER_NOT_FOUND = 'LAYER_NOT_FOUND',
	TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
	EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
	RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
	CROSS_LAYER_COMMUNICATION_FAILED = 'CROSS_LAYER_COMMUNICATION_FAILED',
	UNSUPPORTED_DATA_FORMAT = 'UNSUPPORTED_DATA_FORMAT',
	DEPENDENCY_RESOLUTION_FAILED = 'DEPENDENCY_RESOLUTION_FAILED',
	ROLLBACK_FAILED = 'ROLLBACK_FAILED',
	PERFORMANCE_ANOMALY = 'PERFORMANCE_ANOMALY',
	CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
	CACHE_ERROR = 'CACHE_ERROR',
	SECURITY_VALIDATION_FAILED = 'SECURITY_VALIDATION_FAILED',
	CONTEXT_SUBSTITUTION_FAILED = 'CONTEXT_SUBSTITUTION_FAILED',
}

/**
 * Tool orchestration error context
 */
export interface ToolOrchestrationErrorContext {
	chainId?: string;
	stepId?: string;
	failedStep?: string;
	layer?: string;
	tool?: string;
	executionId?: string;
	dependencyGraph?: unknown;
	resourceUsage?: unknown;
	performanceMetrics?: unknown;
	timestamp?: Date;
	correlationId?: string;
}

/**
 * Specialized error class for tool orchestration failures
 */
export class ToolOrchestrationError extends Error {
	public readonly code: ToolOrchestrationErrorCode;
	public readonly context: ToolOrchestrationErrorContext;
	public readonly timestamp: Date;
	public readonly retryable: boolean;

	constructor(
		code: ToolOrchestrationErrorCode,
		message: string,
		context: ToolOrchestrationErrorContext = {},
		options: {
			retryable?: boolean;
			cause?: Error;
		} = {},
	) {
		super(message);
		this.name = 'ToolOrchestrationError';
		this.code = code;
		this.context = context;
		this.timestamp = new Date();
		this.retryable = options.retryable ?? false;

		// Preserve original error if provided
		if (options.cause) {
			this.cause = options.cause;
		}

		// Ensure proper prototype chain
		Object.setPrototypeOf(this, ToolOrchestrationError.prototype);
	}

	/**
	 * Create a dependency cycle error
	 */
	static dependencyCycle(
		chainId: string,
		dependencyGraph: unknown,
		context?: Partial<ToolOrchestrationErrorContext>,
	): ToolOrchestrationError {
		return new ToolOrchestrationError(
			ToolOrchestrationErrorCode.DEPENDENCY_CYCLE,
			`Circular dependency detected in tool chain: ${chainId}`,
			{
				chainId,
				dependencyGraph,
				...context,
			},
			{ retryable: false },
		);
	}

	/**
	 * Create a layer not found error
	 */
	static layerNotFound(
		layer: string,
		chainId: string,
		context?: Partial<ToolOrchestrationErrorContext>,
	): ToolOrchestrationError {
		return new ToolOrchestrationError(
			ToolOrchestrationErrorCode.LAYER_NOT_FOUND,
			`Tool layer not found: ${layer}`,
			{
				layer,
				chainId,
				...context,
			},
			{ retryable: false },
		);
	}

	/**
	 * Create a tool not found error
	 */
	static toolNotFound(
		tool: string,
		layer: string,
		stepId: string,
		context?: Partial<ToolOrchestrationErrorContext>,
	): ToolOrchestrationError {
		return new ToolOrchestrationError(
			ToolOrchestrationErrorCode.TOOL_NOT_FOUND,
			`Tool not found: ${tool} in layer ${layer}`,
			{
				tool,
				layer,
				stepId,
				failedStep: stepId,
				...context,
			},
			{ retryable: false },
		);
	}

	/**
	 * Create an execution timeout error
	 */
	static executionTimeout(
		stepId: string,
		timeout: number,
		context?: Partial<ToolOrchestrationErrorContext>,
	): ToolOrchestrationError {
		return new ToolOrchestrationError(
			ToolOrchestrationErrorCode.EXECUTION_TIMEOUT,
			`Tool execution timeout after ${timeout}ms: ${stepId}`,
			{
				stepId,
				failedStep: stepId,
				...context,
			},
			{ retryable: true },
		);
	}

	/**
	 * Create a resource exhausted error
	 */
	static resourceExhausted(
		resourceType: string,
		resourceUsage: unknown,
		context?: Partial<ToolOrchestrationErrorContext>,
	): ToolOrchestrationError {
		return new ToolOrchestrationError(
			ToolOrchestrationErrorCode.RESOURCE_EXHAUSTED,
			`Resource exhausted: ${resourceType}`,
			{
				resourceUsage,
				...context,
			},
			{ retryable: true },
		);
	}

	/**
	 * Create a cross-layer communication error
	 */
	static crossLayerCommunicationFailed(
		sourceLayer: string,
		targetLayer: string,
		_dataFormat: string,
		context?: Partial<ToolOrchestrationErrorContext>,
	): ToolOrchestrationError {
		return new ToolOrchestrationError(
			ToolOrchestrationErrorCode.CROSS_LAYER_COMMUNICATION_FAILED,
			`Cross-layer communication failed from ${sourceLayer} to ${targetLayer}`,
			{
				layer: sourceLayer,
				...context,
			},
			{ retryable: true },
		);
	}

	/**
	 * Create an unsupported data format error
	 */
	static unsupportedDataFormat(
		format: string,
		step: string,
		context?: Partial<ToolOrchestrationErrorContext>,
	): ToolOrchestrationError {
		return new ToolOrchestrationError(
			ToolOrchestrationErrorCode.UNSUPPORTED_DATA_FORMAT,
			`Unsupported data format: ${format} in step ${step}`,
			{
				stepId: step,
				failedStep: step,
				...context,
			},
			{ retryable: false },
		);
	}

	/**
	 * Create a dependency resolution error
	 */
	static dependencyResolutionFailed(
		stepId: string,
		dependencies: string[],
		context?: Partial<ToolOrchestrationErrorContext>,
	): ToolOrchestrationError {
		return new ToolOrchestrationError(
			ToolOrchestrationErrorCode.DEPENDENCY_RESOLUTION_FAILED,
			`Failed to resolve dependencies for step ${stepId}: ${dependencies.join(', ')}`,
			{
				stepId,
				failedStep: stepId,
				...context,
			},
			{ retryable: true },
		);
	}

	/**
	 * Create a rollback failed error
	 */
	static rollbackFailed(
		stepId: string,
		rollbackSteps: string[],
		context?: Partial<ToolOrchestrationErrorContext>,
	): ToolOrchestrationError {
		return new ToolOrchestrationError(
			ToolOrchestrationErrorCode.ROLLBACK_FAILED,
			`Rollback failed for step ${stepId}. Affected steps: ${rollbackSteps.join(', ')}`,
			{
				stepId,
				failedStep: stepId,
				...context,
			},
			{ retryable: false },
		);
	}

	/**
	 * Create a circuit breaker error
	 */
	static circuitBreakerOpen(
		tool: string,
		layer: string,
		context?: Partial<ToolOrchestrationErrorContext>,
	): ToolOrchestrationError {
		return new ToolOrchestrationError(
			ToolOrchestrationErrorCode.CIRCUIT_BREAKER_OPEN,
			`Circuit breaker open for tool ${tool} in layer ${layer}`,
			{
				tool,
				layer,
				...context,
			},
			{ retryable: true },
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
			context: this.context,
			timestamp: this.timestamp.toISOString(),
			retryable: this.retryable,
			stack: this.stack,
		};
	}

	/**
	 * Get sanitized error for client response
	 */
	toClientError(): { code: string; message: string; retryable: boolean; timestamp: string } {
		return {
			code: this.code,
			message: this.getSanitizedMessage(),
			retryable: this.retryable,
			timestamp: this.timestamp.toISOString(),
		};
	}

	/**
	 * Get sanitized error message
	 */
	private getSanitizedMessage(): string {
		switch (this.code) {
			case ToolOrchestrationErrorCode.ORCHESTRATION_FAILED:
				return 'Tool orchestration failed';
			case ToolOrchestrationErrorCode.DEPENDENCY_CYCLE:
				return 'Circular dependency in tool chain';
			case ToolOrchestrationErrorCode.LAYER_NOT_FOUND:
				return 'Tool layer not available';
			case ToolOrchestrationErrorCode.TOOL_NOT_FOUND:
				return 'Requested tool not found';
			case ToolOrchestrationErrorCode.EXECUTION_TIMEOUT:
				return 'Tool execution timeout';
			case ToolOrchestrationErrorCode.RESOURCE_EXHAUSTED:
				return 'System resources exhausted';
			case ToolOrchestrationErrorCode.CROSS_LAYER_COMMUNICATION_FAILED:
				return 'Inter-layer communication failed';
			case ToolOrchestrationErrorCode.UNSUPPORTED_DATA_FORMAT:
				return 'Data format not supported';
			case ToolOrchestrationErrorCode.CIRCUIT_BREAKER_OPEN:
				return 'Service temporarily unavailable';
			default:
				return 'Orchestration error occurred';
		}
	}
}
