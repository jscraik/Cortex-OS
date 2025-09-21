/**
 * @fileoverview Tool Orchestration Utilities - Pure Functions
 * @module ToolOrchestrationUtils
 * @description Functional utilities following CODESTYLE.md principles
 * @author brAInwav Development Team
 * @version 3.6.1
 * @since 2024-12-21
 */

import type {
	ChainExecutionResult,
	ExecutionContext,
	ExecutionStatus,
	ToolDefinition,
	ToolExecutionResult,
} from './tool-orchestration-contracts';

// Pure function to create execution result template
export const createExecutionResult = (
	chainId: string,
	toolCount: number,
): ChainExecutionResult => ({
	chainId,
	success: false,
	layersExecuted: 0,
	totalTools: toolCount,
	executionOrder: [],
	toolResults: [],
	totalExecutionTime: 0,
	optimizationsApplied: 0,
	parallelExecutions: 0,
	cacheHits: 0,
	retriesAttempted: 0,
	fallbacksUsed: 0,
	optimalVariantsSelected: 0,
	crossLayerMessages: [],
	dataFlowComplete: true,
	securityChecksPerformed: 0,
	unauthorizedAccessAttempts: 0,
	dependenciesResolved: true,
	circularDependencies: false,
	dynamicDependenciesInjected: 0,
	errors: [],
	telemetry: {},
	performanceScore: 0,
	partialResults: {},
});

// Pure function to calculate final result metrics
export const calculateFinalMetrics = (
	result: ChainExecutionResult,
	startTime: number,
): ChainExecutionResult => {
	const updatedResult = { ...result };

	updatedResult.totalExecutionTime = Math.max(1, Date.now() - startTime); // Ensure > 0
	updatedResult.layersExecuted = new Set(result.toolResults.map((r) => r.layerType)).size;

	// Calculate performance score
	const successfulTools = result.toolResults.filter((r) => r.status === 'success').length;
	updatedResult.performanceScore =
		result.toolResults.length > 0 ? successfulTools / result.toolResults.length : 0;

	// Add partial results
	updatedResult.partialResults = result.toolResults.reduce(
		(acc, r) => {
			acc[r.toolId] = r.result;
			return acc;
		},
		{} as Record<string, unknown>,
	);

	// Determine success
	updatedResult.success = result.errors.length === 0 && result.toolResults.length > 0;

	return updatedResult;
};

// Pure function to create execution status
export const createExecutionStatus = (
	chainId: string,
	isRunning: boolean,
	completed: number,
	total: number,
	errors: string[] = [],
): ExecutionStatus => ({
	chainId,
	isRunning,
	startTime: new Date(),
	completedTools: completed,
	totalTools: total,
	progress: total > 0 ? completed / total : 0,
	errors,
	warnings: [],
});

// Pure function to simulate tool execution (for testing)
export const simulateToolExecution = async (
	tool: ToolDefinition,
	_context: ExecutionContext,
): Promise<ToolExecutionResult> => {
	// Simulate execution time
	const executionTime = Math.max(50, Math.random() * 100);

	return {
		toolId: tool.id,
		layerType: tool.layer,
		operation: tool.operation,
		status: 'success',
		result: `Result for ${tool.operation}`,
		executionTime,
		cacheHit: false,
		retryAttempt: 0,
		telemetry: {},
	};
};

// Pure function to check if strategy should fail fast
export const shouldFailFast = (strategy: string, errors: any[]): boolean => {
	return strategy === 'fail-fast' && errors.length > 0;
};

// Pure function to update progress calculation
export const calculateProgress = (completed: number, total: number): number => {
	return total > 0 ? Math.min(1.0, completed / total) : 0;
};
