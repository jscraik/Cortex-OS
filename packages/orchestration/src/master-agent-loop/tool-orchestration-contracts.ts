/**
 * @fileoverview Tool Orchestration Contracts for nO Architecture
 * @module ToolOrchestrationContracts
 * @description Type definitions and schemas for tool orchestration - Phase 3.6
 * @author brAInwav Development Team
 * @version 3.6.0
 * @since 2024-12-21
 */

import { z } from 'zod';
import { createPrefixedId } from '../lib/secure-random.js';

// ================================
// Core Tool Chain Types
// ================================

export const ToolDefinitionSchema = z.object({
	id: z.string().min(1),
	layer: z.enum(['dashboard', 'execution', 'primitive']),
	operation: z.string().min(1),
	dependencies: z.array(z.string()).default([]),
	parallelizable: z.boolean().default(false),
	cacheable: z.boolean().default(false),
	retryable: z.boolean().default(false),
	optimizable: z.boolean().default(false),
	estimatedDuration: z.number().int().positive().optional(),
	variants: z
		.array(
			z.object({
				id: z.string().min(1),
				performanceScore: z.number().min(0).max(1),
				resourceCost: z.enum(['low', 'medium', 'high']),
			}),
		)
		.optional(),
	fallbacks: z
		.array(
			z.object({
				id: z.string().min(1),
				operation: z.string().min(1),
			}),
		)
		.optional(),
	parameters: z.record(z.unknown()).default({}),
});

export const ToolChainSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	tools: z.array(ToolDefinitionSchema).min(1),
	executionStrategy: z.enum([
		'sequential',
		'sequential-with-optimization',
		'dependency-ordered',
		'performance-optimized',
		'fail-fast',
		'message-passing',
		'strict-validation',
		'security-first',
		'dependency-optimized',
		'dependency-validation',
		'dynamic-injection',
		'parallel-optimized',
		'cache-optimized',
		'variant-selection',
		'telemetry-enabled',
		'status-tracking',
		'retry-enabled',
		'fallback-enabled',
		'debug-enabled',
	]),
	timeout: z.number().int().positive(),
	retryPolicy: z
		.object({
			maxRetries: z.number().int().min(0),
			backoffMs: z.number().int().positive(),
			exponentialBackoff: z.boolean().default(false),
		})
		.optional(),
	securityLevel: z.enum(['low', 'medium', 'high']).optional(),
	dynamicDependencies: z.boolean().default(false),
	monitoring: z
		.object({
			telemetryEnabled: z.boolean().default(true),
			metricsCollection: z.boolean().default(true),
		})
		.optional(),
	debugging: z
		.object({
			stackTraceEnabled: z.boolean().default(false),
			contextCapture: z.boolean().default(false),
		})
		.optional(),
	metadata: z.record(z.unknown()).default({}),
});

// ================================
// Execution Results Types
// ================================

export const ToolExecutionResultSchema = z.object({
	toolId: z.string().min(1),
	layerType: z.enum(['dashboard', 'execution', 'primitive']),
	operation: z.string().min(1),
	status: z.enum(['success', 'failure', 'timeout', 'cancelled', 'retrying']),
	result: z.unknown(),
	error: z.string().optional(),
	executionTime: z.number().int().min(0),
	resourceUsage: z
		.object({
			memoryMB: z.number().min(0),
			cpuPercent: z.number().min(0).max(100),
		})
		.optional(),
	cacheHit: z.boolean().default(false),
	retryAttempt: z.number().int().min(0).default(0),
	fallbackUsed: z.string().optional(),
	variantUsed: z.string().optional(),
	telemetry: z.record(z.unknown()).default({}),
});

export const ChainExecutionResultSchema = z.object({
	chainId: z.string().min(1),
	success: z.boolean(),
	layersExecuted: z.number().int().min(0),
	totalTools: z.number().int().min(0),
	executionOrder: z.array(z.string()),
	toolResults: z.array(ToolExecutionResultSchema),
	totalExecutionTime: z.number().int().min(0),
	optimizationsApplied: z.number().int().min(0),
	parallelExecutions: z.number().int().min(0),
	cacheHits: z.number().int().min(0),
	retriesAttempted: z.number().int().min(0),
	fallbacksUsed: z.number().int().min(0),
	optimalVariantsSelected: z.number().int().min(0),
	performanceScore: z.number().min(0).max(1).optional(),
	crossLayerMessages: z
		.array(
			z.object({
				from: z.string(),
				to: z.string(),
				type: z.string(),
				data: z.unknown(),
			}),
		)
		.default([]),
	dataFlowComplete: z.boolean().default(true),
	securityChecksPerformed: z.number().int().min(0).default(0),
	unauthorizedAccessAttempts: z.number().int().min(0).default(0),
	dependenciesResolved: z.boolean().default(true),
	circularDependencies: z.boolean().default(false),
	dynamicDependenciesInjected: z.number().int().min(0).default(0),
	partialResults: z.record(z.unknown()).optional(),
	errors: z
		.array(
			z.object({
				toolId: z.string(),
				error: z.string(),
				context: z.record(z.unknown()).optional(),
			}),
		)
		.default([]),
	telemetry: z.record(z.unknown()).default({}),
});

// ================================
// Execution Status Types
// ================================

export const ExecutionStatusSchema = z.object({
	chainId: z.string().min(1),
	isRunning: z.boolean(),
	startTime: z.date(),
	estimatedEndTime: z.date().optional(),
	completedTools: z.number().int().min(0),
	totalTools: z.number().int().min(0),
	currentTool: z.string().optional(),
	progress: z.number().min(0).max(1),
	errors: z.array(z.string()).default([]),
	warnings: z.array(z.string()).default([]),
});

// ================================
// Message Types for Cross-Layer Communication
// ================================

export const CrossLayerMessageSchema = z.object({
	id: z.string().min(1),
	from: z.object({
		toolId: z.string(),
		layer: z.enum(['dashboard', 'execution', 'primitive']),
	}),
	to: z.object({
		toolId: z.string(),
		layer: z.enum(['dashboard', 'execution', 'primitive']),
	}),
	type: z.enum(['data', 'command', 'status', 'error', 'notification']),
	payload: z.unknown(),
	timestamp: z.date(),
	priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
	securityLevel: z.enum(['public', 'restricted', 'confidential']).default('public'),
	requiresAck: z.boolean().default(false),
	ttl: z.number().int().positive().optional(),
});

// ================================
// Dependency Management Types
// ================================

export const DependencyGraphSchema = z.object({
	nodes: z.array(
		z.object({
			id: z.string(),
			layer: z.enum(['dashboard', 'execution', 'primitive']),
			operation: z.string(),
		}),
	),
	edges: z.array(
		z.object({
			from: z.string(),
			to: z.string(),
			type: z.enum(['sequential', 'data', 'control', 'resource']),
		}),
	),
	topologicalOrder: z.array(z.string()),
	circularDependencies: z.array(z.array(z.string())).default([]),
	parallelGroups: z.array(z.array(z.string())).default([]),
});

// ================================
// Performance Optimization Types
// ================================

export const OptimizationMetricsSchema = z.object({
	toolId: z.string(),
	averageExecutionTime: z.number().min(0),
	successRate: z.number().min(0).max(1),
	resourceEfficiency: z.number().min(0).max(1),
	cacheHitRate: z.number().min(0).max(1),
	parallelizationBenefit: z.number().min(0).max(1),
	lastUpdated: z.date(),
});

export const OptimizationStrategySchema = z.object({
	type: z.enum(['parallelization', 'caching', 'variant-selection', 'resource-allocation']),
	confidence: z.number().min(0).max(1),
	expectedImprovement: z.number().min(0).max(1),
	resourceCost: z.enum(['low', 'medium', 'high']),
	applicableTools: z.array(z.string()),
});

// ================================
// Type Exports
// ================================

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
export type ToolChain = z.infer<typeof ToolChainSchema>;
export type ToolExecutionResult = z.infer<typeof ToolExecutionResultSchema>;
export type ChainExecutionResult = z.infer<typeof ChainExecutionResultSchema>;
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;
export type CrossLayerMessage = z.infer<typeof CrossLayerMessageSchema>;
export type DependencyGraph = z.infer<typeof DependencyGraphSchema>;
export type OptimizationMetrics = z.infer<typeof OptimizationMetricsSchema>;
export type OptimizationStrategy = z.infer<typeof OptimizationStrategySchema>;

// ================================
// Tool Orchestrator Interface
// ================================

export interface ToolOrchestrator {
	/**
	 * Execute a tool chain with all optimizations and monitoring
	 */
	executeChain(chain: ToolChain): Promise<ChainExecutionResult>;

	/**
	 * Get real-time execution status of a running chain
	 */
	getExecutionStatus(chainId: string): Promise<ExecutionStatus>;

	/**
	 * Cancel a running tool chain execution
	 */
	cancelExecution(chainId: string): Promise<boolean>;

	/**
	 * Send a message between tools in different layers
	 */
	sendCrossLayerMessage(message: CrossLayerMessage): Promise<void>;

	/**
	 * Register a tool variant for optimization
	 */
	registerToolVariant(
		toolId: string,
		variantId: string,
		metrics: OptimizationMetrics,
	): Promise<void>;

	/**
	 * Get performance metrics for a tool
	 */
	getToolMetrics(toolId: string): Promise<OptimizationMetrics | null>;

	/**
	 * Shutdown the orchestrator and cleanup resources
	 */
	shutdown(): Promise<void>;

	/**
	 * Event emitter interface for monitoring
	 */
	on(event: string, listener: (...args: any[]) => void): void;
	emit(event: string, ...args: any[]): boolean;
}

// ================================
// Tool Chain Executor Interface
// ================================

export interface ToolChainExecutor {
	/**
	 * Execute a single tool in the chain
	 */
	executeTool(tool: ToolDefinition, context: ExecutionContext): Promise<ToolExecutionResult>;

	/**
	 * Execute multiple tools in parallel
	 */
	executeParallel(
		tools: ToolDefinition[],
		context: ExecutionContext,
	): Promise<ToolExecutionResult[]>;

	/**
	 * Handle tool execution retry with backoff
	 */
	retryTool(
		tool: ToolDefinition,
		context: ExecutionContext,
		attempt: number,
	): Promise<ToolExecutionResult>;

	/**
	 * Execute fallback tool if primary fails
	 */
	executeFallback(
		tool: ToolDefinition,
		fallbackId: string,
		context: ExecutionContext,
	): Promise<ToolExecutionResult>;
}

// ================================
// Dependency Manager Interface
// ================================

export interface DependencyManager {
	/**
	 * Build dependency graph from tool chain
	 */
	buildDependencyGraph(chain: ToolChain): DependencyGraph;

	/**
	 * Detect circular dependencies
	 */
	detectCircularDependencies(graph: DependencyGraph): string[][];

	/**
	 * Get topological order for execution
	 */
	getExecutionOrder(graph: DependencyGraph): string[];

	/**
	 * Identify parallelizable tool groups
	 */
	identifyParallelGroups(graph: DependencyGraph): string[][];

	/**
	 * Inject dynamic dependencies at runtime
	 */
	injectDynamicDependencies(
		graph: DependencyGraph,
		dependencies: Record<string, string[]>,
	): DependencyGraph;
}

// ================================
// Performance Optimizer Interface
// ================================

export interface PerformanceOptimizer {
	/**
	 * Analyze tool chain for optimization opportunities
	 */
	analyzeOptimizations(chain: ToolChain): OptimizationStrategy[];

	/**
	 * Select optimal tool variant based on metrics
	 */
	selectOptimalVariant(tool: ToolDefinition, context: ExecutionContext): string | null;

	/**
	 * Update performance metrics for a tool
	 */
	updateMetrics(toolId: string, result: ToolExecutionResult): Promise<void>;

	/**
	 * Get cache key for a tool execution
	 */
	getCacheKey(tool: ToolDefinition, context: ExecutionContext): string;

	/**
	 * Check if result is cached
	 */
	getCachedResult(cacheKey: string): Promise<ToolExecutionResult | null>;

	/**
	 * Cache tool execution result
	 */
	cacheResult(cacheKey: string, result: ToolExecutionResult): Promise<void>;
}

// ================================
// Execution Context
// ================================

export interface ExecutionContext {
	chainId: string;
	executionId: string;
	userId?: string;
	sessionId?: string;
	securityLevel: 'low' | 'medium' | 'high';
	startTime: Date;
	timeout: number;
	variables: Record<string, unknown>;
	telemetry: Record<string, unknown>;
	debugging: boolean;
}

// ================================
// Validation Utilities
// ================================

/**
 * Validate tool chain structure and dependencies
 */
export function validateToolChain(chain: ToolChain): { valid: boolean; errors: string[] } {
	const result = ToolChainSchema.safeParse(chain);
	if (!result.success) {
		return {
			valid: false,
			errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
		};
	}

	// Additional validation logic
	const errors: string[] = [];
	const toolIds = new Set(chain.tools.map((t) => t.id));

	// Check dependency references
	for (const tool of chain.tools) {
		for (const dep of tool.dependencies) {
			if (!toolIds.has(dep)) {
				errors.push(`Tool ${tool.id} has invalid dependency: ${dep}`);
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Create bounded execution context
 */
export function createExecutionContext(
	chainId: string,
	options: Partial<ExecutionContext> = {},
): ExecutionContext {
	return {
		chainId,
		executionId: createPrefixedId(`exec-${chainId}-${Date.now()}`),
		securityLevel: options.securityLevel || 'medium',
		startTime: new Date(),
		timeout: options.timeout || 30000,
		variables: options.variables || {},
		telemetry: options.telemetry || {},
		debugging: options.debugging || false,
		...options,
	};
}
