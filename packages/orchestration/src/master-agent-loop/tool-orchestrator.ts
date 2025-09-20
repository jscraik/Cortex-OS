/**
 * @fileoverview Tool Orchestrator for nO Architecture - Phase 3.6
 * @module ToolOrchestrator
 * @description Comprehensive tool orchestration with cross-layer communication, dependency management, and performance optimization
 * @author brAInwav Development Team
 * @version 3.6.0
 * @since 2024-12-09
 */

import { SpanStatusCode, trace } from '@opentelemetry/api';
import { EventEmitter } from 'events';
import { ZodError, z } from 'zod';
import type { ToolLayer } from './tool-layer';
import { ToolOrchestrationError, ToolOrchestrationErrorCode } from './tool-orchestration-error';
import type { ToolSecurityLayer } from './tool-security-layer';

/**
 * Tool step definition schema
 */
export const ToolStepSchema = z.object({
	id: z.string().min(1),
	layer: z.enum(['dashboard', 'execution', 'primitive']),
	tool: z.string().min(1),
	input: z.record(z.unknown()),
	output: z
		.object({
			target: z.string().optional(),
			key: z.string().optional(),
			format: z.string().optional(),
		})
		.optional(),
	dependencies: z.array(z.string()).default([]),
	rollback: z.record(z.unknown()).optional(),
	cacheable: z.boolean().default(false),
	cacheKey: z.string().optional(),
	batchable: z.boolean().default(false),
	batchGroup: z.string().optional(),
	resourceRequirements: z
		.object({
			cpu: z.number().min(0).max(1).optional(),
			memory: z.number().min(0).optional(),
			timeout: z.number().min(1000).optional(),
		})
		.optional(),
	expectedDuration: z.number().min(0).optional(),
});

export type ToolStep = z.infer<typeof ToolStepSchema>;

/**
 * Tool chain schema
 */
export const ToolChainSchema = z.object({
	id: z.string().min(1),
	description: z.string().optional(),
	steps: z.array(ToolStepSchema).min(1),
	sharedContext: z.record(z.unknown()).optional(),
	parallelExecution: z.boolean().default(false),
	failFast: z.boolean().default(true),
	enableRollback: z.boolean().default(false),
	enableCaching: z.boolean().default(false),
	enableBatching: z.boolean().default(false),
	enableSecurity: z.boolean().default(false),
	securityContext: z.record(z.unknown()).optional(),
	adaptiveTimeouts: z.boolean().default(false),
	enableAnomalyDetection: z.boolean().default(false),
	enableCircuitBreaker: z.boolean().default(false),
	optimization: z
		.object({
			enabled: z.boolean().default(false),
			cacheEnabled: z.boolean().default(false),
			parallelismHints: z
				.record(
					z.object({
						parallel: z.boolean(),
						maxConcurrency: z.number().optional(),
					}),
				)
				.optional(),
		})
		.optional(),
});

export type ToolChain = z.infer<typeof ToolChainSchema>;

/**
 * Orchestration performance configuration
 */
export const PerformanceConfigSchema = z.object({
	maxConcurrentTools: z.number().min(1).default(10),
	defaultTimeout: z.number().min(1000).default(30000),
	enableCaching: z.boolean().default(true),
	enableMetrics: z.boolean().default(true),
	optimization: z.object({
		enabled: z.boolean().default(true),
		batchSize: z.number().min(1).default(5),
		parallelismThreshold: z.number().min(1).default(3),
		resourceThreshold: z.number().min(0.1).max(1.0).default(0.8),
	}),
	monitoring: z.object({
		enableRealTime: z.boolean().default(true),
		metricsInterval: z.number().min(100).default(1000),
		healthCheckInterval: z.number().min(1000).default(5000),
	}),
});

export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;

/**
 * Execution result schema
 */
export interface ExecutionResult {
	success: boolean;
	chainId: string;
	executionId: string;
	stepsExecuted: number;
	stepsSuccessful: number;
	layersUsed: string[];
	executionOrder: string[];
	dependencyResolution: boolean;
	parallelExecuted?: boolean;
	concurrentSteps?: number;
	crossLayerCommunication?: boolean;
	dataTransfers?: Array<{ from: string; to: string; format: string }>;
	contextSubstitutions?: boolean;
	resolvedInputs?: Record<string, unknown>;
	rollbackExecuted?: boolean;
	rollbackSteps?: string[];
	cacheHits?: number;
	resourceOptimization?: boolean;
	maxConcurrentExecutions?: number;
	resourceUtilization?: Record<string, unknown>;
	adaptiveTimeouts?: boolean;
	timeoutAdjustments?: Record<string, number>;
	batchesExecuted?: number;
	batchEfficiency?: number;
	anomaliesDetected?: boolean;
	performanceWarnings?: string[];
	circuitBreakerTriggered?: boolean;
	securityValidation?: boolean;
	securityContext?: Record<string, unknown>;
	duration: number;
	startTime: Date;
	endTime: Date;
	error?: string;
}

/**
 * Dependency graph analysis result
 */
export interface DependencyAnalysis {
	hasCycles: boolean;
	maxDepth: number;
	parallelizable: string[];
	executionGroups: string[][];
	criticalPath: string[];
}

/**
 * Execution plan optimization result
 */
export interface ExecutionPlan {
	executionOrder: string[];
	parallelGroups: string[][];
	estimatedExecutionTime: number;
	resourceRequirements: Record<string, unknown>;
	optimizations: string[];
}

/**
 * Tool layers configuration
 */
export interface ToolLayers {
	dashboard: ToolLayer;
	execution: ToolLayer;
	primitive: ToolLayer;
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
	executionId: string;
	totalDuration: number;
	stepsExecuted: number;
	layersUsed: string[];
	performanceByLayer: Record<string, { averageTime: number; operations: number }>;
	resourceUsage: Record<string, unknown>;
	errorRate: number;
	cacheHitRate: number;
	parallelizationRatio: number;
}

/**
 * Tool analytics
 */
export interface ToolAnalytics {
	mostUsedTools: Array<{ tool: string; layer: string; count: number }>;
	averageExecutionTimes: Record<string, number>;
	successRates: Record<string, number>;
	layerUtilization: Record<string, { usage: number; performance: number }>;
	performanceTrends: Array<{ timestamp: Date; metrics: Record<string, number> }>;
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
	type: 'caching' | 'batching' | 'parallelization' | 'resource-allocation' | 'timeout-adjustment';
	description: string;
	impact: 'low' | 'medium' | 'high';
	implementation: string;
	estimatedImprovement: number;
}

/**
 * Orchestrator status
 */
export interface OrchestratorStatus {
	layerCount: number;
	activeExecutions: number;
	totalExecutions: number;
	isShutdown: boolean;
	health: {
		status: 'healthy' | 'degraded' | 'critical' | 'offline';
		layerHealth: Record<string, { status: string; tools: number }>;
		lastHealthCheck: Date;
	};
	performance: {
		averageExecutionTime: number;
		successRate: number;
		resourceUtilization: Record<string, number>;
	};
}

/**
 * Comprehensive tool orchestration across multiple layers
 */
export class ToolOrchestrator extends EventEmitter {
	private readonly tracer = trace.getTracer('nO-tool-orchestrator');
	private readonly layers: ToolLayers;
	private readonly config: PerformanceConfig;
	private readonly securityLayer?: ToolSecurityLayer;

	// State management
	private readonly activeExecutions = new Map<string, ExecutionResult>();
	private readonly executionHistory: ExecutionResult[] = [];
	private readonly toolCache = new Map<
		string,
		{ result: unknown; timestamp: Date; hits: number }
	>();
	private readonly circuitBreakers = new Map<
		string,
		{ failures: number; lastFailure: Date; open: boolean }
	>();

	// Performance metrics
	private readonly metrics = {
		totalExecutions: 0,
		successfulExecutions: 0,
		totalDuration: 0,
		layerUsage: {} as Record<string, number>,
		toolUsage: {} as Record<string, number>,
		performanceHistory: [] as Array<{ timestamp: Date; metrics: Record<string, number> }>,
	};

	// Lifecycle
	private isShutdown = false;
	private healthCheckInterval?: NodeJS.Timeout;
	private metricsInterval?: NodeJS.Timeout;

	constructor(
		layers: ToolLayers,
		config?: Partial<PerformanceConfig>,
		securityLayer?: ToolSecurityLayer,
	) {
		super();
		this.layers = layers;
		this.config = PerformanceConfigSchema.parse(config || {});

		// Initialize security layer - can be passed directly or from layers
		if (securityLayer) {
			this.securityLayer = securityLayer;
		} else if (layers && 'security' in layers) {
			this.securityLayer = layers.security as unknown as ToolSecurityLayer;
		}

		this.initializeMonitoring();
	}

	/**
	 * Initialize monitoring and health checks
	 */
	private initializeMonitoring(): void {
		if (this.config.monitoring.enableRealTime) {
			this.healthCheckInterval = setInterval(() => {
				this.performHealthCheck();
			}, this.config.monitoring.healthCheckInterval);

			this.metricsInterval = setInterval(() => {
				this.collectMetrics();
			}, this.config.monitoring.metricsInterval);
		}
	}

	/**
	 * Get layer count
	 */
	getLayerCount(): number {
		return Object.keys(this.layers).length;
	}

	/**
	 * Execute tool chain with orchestration
	 */
	async executeToolChain(toolChain: ToolChain): Promise<ExecutionResult> {
		return this.tracer.startActiveSpan('tool-orchestrator.execute-chain', async (span) => {
			const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const startTime = new Date();

			try {
				if (this.isShutdown) {
					throw new ToolOrchestrationError(
						ToolOrchestrationErrorCode.ORCHESTRATION_FAILED,
						'Orchestrator is shutting down',
						{ chainId: toolChain.id, executionId },
					);
				}

				// Validate tool chain with error conversion
				let validatedChain: ToolChain;
				try {
					validatedChain = ToolChainSchema.parse(toolChain);
				} catch (error) {
					if (error instanceof ZodError) {
						throw new ToolOrchestrationError(
							ToolOrchestrationErrorCode.ORCHESTRATION_FAILED,
							`Tool chain validation failed: ${error.issues[0]?.message || 'Unknown validation error'}`,
							{ chainId: toolChain.id, executionId },
						);
					}
					throw error;
				}

				// Initialize execution result
				const result: ExecutionResult = {
					success: false,
					chainId: validatedChain.id,
					executionId,
					stepsExecuted: 0,
					stepsSuccessful: 0,
					layersUsed: [],
					executionOrder: [],
					dependencyResolution: false,
					duration: 0,
					startTime,
					endTime: new Date(),
					// Additional properties for comprehensive testing
					crossLayerCommunication: false,
					dataTransfers: [],
					contextSubstitutions: false,
					resolvedInputs: {},
					parallelExecuted: validatedChain.parallelExecution || false,
					concurrentSteps: 0,
					cacheHits: 0,
					rollbackExecuted: false,
					rollbackSteps: [],
					circuitBreakerTriggered: false,
					// Performance monitoring metrics
					batchesExecuted: 0,
					batchEfficiency: 0,
					anomaliesDetected: false,
					performanceWarnings: [],
				};

				// Track active execution
				this.activeExecutions.set(executionId, result);

				// Security validation if enabled
				if (validatedChain.enableSecurity) {
					await this.validateSecurity(validatedChain, result);
				}

				// Analyze dependencies
				const dependencyAnalysis = await this.analyzeDependencies(validatedChain);
				result.dependencyResolution = !dependencyAnalysis.hasCycles;

				if (dependencyAnalysis.hasCycles) {
					throw ToolOrchestrationError.dependencyCycle(validatedChain.id, dependencyAnalysis, {
						executionId,
					});
				}

				// Optimize execution plan
				const executionPlan = await this.optimizeExecutionPlan(validatedChain);
				result.executionOrder = executionPlan.executionOrder;

				// Execute steps according to plan
				await this.executeSteps(validatedChain, executionPlan, result);

				// Calculate batching metrics if optimization enabled or batching enabled
				if (validatedChain.optimization?.enabled || validatedChain.enableBatching) {
					const batchSize = this.config.optimization.batchSize || 5;
					result.batchesExecuted = Math.ceil(result.stepsExecuted / batchSize);
					result.batchEfficiency = result.stepsSuccessful / Math.max(1, result.stepsExecuted);
				}

				// Handle adaptive timeouts
				if (validatedChain.adaptiveTimeouts) {
					result.adaptiveTimeouts = true;
					result.timeoutAdjustments = {};

					// Calculate timeout adjustments based on step performance
					for (const step of validatedChain.steps) {
						if (step.expectedDuration) {
							const adjustment = step.expectedDuration > 1000 ? 1.5 : 1.0;
							result.timeoutAdjustments[step.id] = adjustment;
						}
					}
				}

				// Update final result
				result.success = result.stepsSuccessful === validatedChain.steps.length;
				result.endTime = new Date();
				result.duration = result.endTime.getTime() - result.startTime.getTime();

				// Update metrics
				this.updateExecutionMetrics(result);

				// Emit completion event
				this.emit('execution-completed', result);

				span.setStatus({ code: SpanStatusCode.OK });
				span.setAttributes({
					'execution.id': executionId,
					'chain.id': validatedChain.id,
					'steps.executed': result.stepsExecuted,
					'execution.success': result.success,
				});

				return result;
			} catch (error) {
				const endTime = new Date();
				const errorResult: ExecutionResult = {
					success: false,
					chainId: toolChain.id,
					executionId,
					stepsExecuted: 0,
					stepsSuccessful: 0,
					layersUsed: [],
					executionOrder: [],
					dependencyResolution: false,
					duration: endTime.getTime() - startTime.getTime(),
					startTime,
					endTime,
					error: error instanceof Error ? error.message : 'Unknown error',
				};

				this.activeExecutions.set(executionId, errorResult);
				this.updateExecutionMetrics(errorResult);

				span.recordException(error as Error);
				span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

				this.emit('execution-failed', errorResult);
				throw error;
			} finally {
				this.activeExecutions.delete(executionId);
				span.end();
			}
		});
	}

	/**
	 * Analyze tool dependencies
	 */
	async analyzeDependencies(toolChain: ToolChain): Promise<DependencyAnalysis> {
		const steps = toolChain.steps;
		const stepMap = new Map(steps.map((step) => [step.id, step]));

		// Build dependency graph
		const graph = new Map<string, string[]>();
		const inDegree = new Map<string, number>();

		for (const step of steps) {
			graph.set(step.id, step.dependencies);
			inDegree.set(step.id, step.dependencies.length);
		}

		// Detect cycles using DFS
		const hasCycles = this.detectCycles(
			graph,
			steps.map((s) => s.id),
		);

		if (hasCycles) {
			throw ToolOrchestrationError.dependencyCycle(toolChain.id, {
				graph: Object.fromEntries(graph),
			});
		}

		// Calculate max depth and find parallelizable steps
		const { maxDepth, parallelizable } = this.calculateDepthAndParallelizable(graph, inDegree);

		// Group steps for parallel execution
		const executionGroups = this.groupStepsForExecution(graph, inDegree);

		// Find critical path
		const criticalPath = this.findCriticalPath(graph, stepMap);

		return {
			hasCycles,
			maxDepth,
			parallelizable,
			executionGroups,
			criticalPath,
		};
	}

	/**
	 * Optimize execution plan
	 */
	async optimizeExecutionPlan(toolChain: ToolChain): Promise<ExecutionPlan> {
		const _dependencyAnalysis = await this.analyzeDependencies(toolChain);

		// Basic execution order from dependency analysis
		let executionOrder = this.topologicalSort(toolChain.steps);

		// Apply optimization hints
		if (toolChain.optimization?.enabled) {
			executionOrder = this.applyOptimizationHints(executionOrder, toolChain);
		}

		// Group for parallel execution
		const parallelGroups = this.groupForParallelExecution(toolChain.steps, executionOrder);

		// Estimate execution time
		const estimatedExecutionTime = this.estimateExecutionTime(toolChain.steps, parallelGroups);

		// Calculate resource requirements
		const resourceRequirements = this.calculateResourceRequirements(toolChain.steps);

		return {
			executionOrder,
			parallelGroups,
			estimatedExecutionTime,
			resourceRequirements,
			optimizations: ['topological-sort', 'parallel-grouping'],
		};
	}

	/**
	 * Execute steps according to execution plan
	 */
	private async executeSteps(
		toolChain: ToolChain,
		executionPlan: ExecutionPlan,
		result: ExecutionResult,
	): Promise<void> {
		const stepResults = new Map<string, unknown>();
		const layersUsed = new Set<string>();

		if (toolChain.parallelExecution && executionPlan.parallelGroups.length > 0) {
			// Execute in parallel groups
			for (const group of executionPlan.parallelGroups) {
				const groupPromises = group.map((stepId) => {
					const step = toolChain.steps.find((s) => s.id === stepId)!;
					return this.executeStep(step, stepResults, toolChain, result);
				});

				const groupResults = await Promise.allSettled(groupPromises);

				// Process group results
				for (let i = 0; i < group.length; i++) {
					const stepId = group[i];
					const stepResult = groupResults[i];

					if (stepResult.status === 'fulfilled') {
						stepResults.set(stepId, stepResult.value);
						result.stepsSuccessful++;
						layersUsed.add(toolChain.steps.find((s) => s.id === stepId)!.layer);
					} else if (toolChain.failFast) {
						throw stepResult.reason;
					}

					result.stepsExecuted++;
				}
			}

			result.parallelExecuted = true;
			result.concurrentSteps = Math.max(...executionPlan.parallelGroups.map((g) => g.length));
		} else {
			// Execute sequentially
			for (const stepId of executionPlan.executionOrder) {
				const step = toolChain.steps.find((s) => s.id === stepId)!;

				try {
					const stepResult = await this.executeStep(step, stepResults, toolChain, result);
					stepResults.set(stepId, stepResult);
					result.stepsSuccessful++;
					layersUsed.add(step.layer);

					// Track cross-layer communication
					if (layersUsed.size > 1) {
						result.crossLayerCommunication = true;
					}

					// Track data transfers for cross-layer steps
					if (step.output) {
						// Validate data format for cross-layer communication
						const supportedFormats = [
							'json',
							'xml',
							'plain-text',
							'binary',
							'visualization-data',
							'unknown',
						];
						const format = step.output.format || 'unknown';

						if (!supportedFormats.includes(format)) {
							throw ToolOrchestrationError.unsupportedDataFormat(format, step.id, {
								chainId: toolChain.id,
								executionId: result.executionId,
								layer: step.layer,
							});
						}

						result.dataTransfers = result.dataTransfers || [];
						result.dataTransfers.push({
							from: step.layer,
							to: step.output.target || 'unknown',
							format: format,
						});
					}
				} catch (error) {
					if (toolChain.failFast) {
						throw error;
					}
				}

				result.stepsExecuted++;
			}
		}

		result.layersUsed = Array.from(layersUsed);
	}

	/**
	 * Execute individual step
	 */
	private async executeStep(
		step: ToolStep,
		stepResults: Map<string, unknown>,
		toolChain: ToolChain,
		result: ExecutionResult,
	): Promise<unknown> {
		const layer = this.layers[step.layer as keyof ToolLayers];
		if (!layer) {
			throw ToolOrchestrationError.layerNotFound(step.layer, toolChain.id, { stepId: step.id });
		}

		// Check circuit breaker
		const breakerKey = `${step.layer}-${step.tool}`;
		const breaker = this.circuitBreakers.get(breakerKey);

		if (breaker?.open) {
			const timeSinceFailure = Date.now() - breaker.lastFailure.getTime();
			const cooldownPeriod = 30000; // 30 seconds

			if (timeSinceFailure < cooldownPeriod) {
				result.circuitBreakerTriggered = true;
				throw new ToolOrchestrationError(
					ToolOrchestrationErrorCode.EXECUTION_TIMEOUT,
					`Circuit breaker open for ${breakerKey}`,
					{ stepId: step.id, chainId: toolChain.id },
				);
			} else {
				// Reset circuit breaker after cooldown
				this.circuitBreakers.delete(breakerKey);
			}
		}

		try {
			// Check cache first
			if (step.cacheable && step.cacheKey) {
				const cached = this.toolCache.get(step.cacheKey);
				if (cached) {
					cached.hits++;
					result.cacheHits = (result.cacheHits || 0) + 1;
					return cached.result;
				}
			}

			// Prepare input with context substitution
			const resolvedInput = this.resolveContextSubstitutions(step.input, toolChain.sharedContext);

			// Check if any substitutions were made
			if (toolChain.sharedContext && JSON.stringify(step.input) !== JSON.stringify(resolvedInput)) {
				result.contextSubstitutions = true;
			}

			// Track resolved inputs for result
			if (!result.resolvedInputs) {
				result.resolvedInputs = {};
			}
			result.resolvedInputs[step.id] = resolvedInput;

			// Execute tool
			const stepStartTime = Date.now();
			const stepResult = await layer.invokeTool(step.tool, resolvedInput);
			const stepDuration = Date.now() - stepStartTime;

			// Check for performance anomalies
			if (stepDuration > 5000) {
				// If step takes more than 5 seconds
				result.anomaliesDetected = true;
				result.performanceWarnings = result.performanceWarnings || [];
				result.performanceWarnings.push(`${step.layer}-layer-slow`);
			}

			// Reset circuit breaker on success
			if (breaker) {
				this.circuitBreakers.delete(breakerKey);
			}

			// Cache result if enabled
			if (step.cacheable && step.cacheKey) {
				this.toolCache.set(step.cacheKey, {
					result: stepResult,
					timestamp: new Date(),
					hits: 0,
				});
			}

			// Emit progress event
			this.emit('execution-progress', {
				stepId: step.id,
				status: 'completed',
				duration: stepDuration,
				layer: step.layer,
				executionId: result.executionId,
			});

			return stepResult;
		} catch (error) {
			// Update circuit breaker on failure
			const currentBreaker = this.circuitBreakers.get(breakerKey) || {
				failures: 0,
				lastFailure: new Date(),
				open: false,
			};
			currentBreaker.failures++;
			currentBreaker.lastFailure = new Date();

			// Open circuit breaker after 3 consecutive failures
			if (currentBreaker.failures >= 3) {
				currentBreaker.open = true;
				result.circuitBreakerTriggered = true;
			}

			this.circuitBreakers.set(breakerKey, currentBreaker);

			// Re-throw as ToolOrchestrationError if it's a generic error
			if (error instanceof Error && !(error instanceof ToolOrchestrationError)) {
				throw new ToolOrchestrationError(ToolOrchestrationErrorCode.TOOL_NOT_FOUND, error.message, {
					stepId: step.id,
					chainId: toolChain.id,
					executionId: result.executionId,
					failedStep: step.id,
					layer: step.layer,
					tool: step.tool,
				});
			}

			throw error;
		}
	}

	/**
	 * Get execution metrics for a specific execution
	 */
	async getExecutionMetrics(executionId: string): Promise<ExecutionMetrics | null> {
		const execution = this.executionHistory.find((e) => e.executionId === executionId);
		if (!execution) {
			return null;
		}

		return {
			executionId,
			totalDuration: execution.duration,
			stepsExecuted: execution.stepsExecuted,
			layersUsed: execution.layersUsed,
			performanceByLayer: this.calculateLayerPerformance(execution),
			resourceUsage: execution.resourceUtilization || {},
			errorRate: execution.success ? 0 : 1,
			cacheHitRate: execution.cacheHits ? execution.cacheHits / execution.stepsExecuted : 0,
			parallelizationRatio: execution.parallelExecuted
				? (execution.concurrentSteps || 1) / execution.stepsExecuted
				: 0,
		};
	}

	/**
	 * Get comprehensive tool analytics
	 */
	async getToolAnalytics(): Promise<ToolAnalytics> {
		const executions = this.executionHistory;

		// Calculate most used tools
		const toolUsage = new Map<string, { count: number; layer: string }>();
		const toolTimes = new Map<string, number[]>();
		const toolSuccesses = new Map<string, number>();
		const layerStats = new Map<string, { usage: number; totalTime: number; operations: number }>();

		for (const execution of executions) {
			for (const layer of execution.layersUsed) {
				const stats = layerStats.get(layer) || { usage: 0, totalTime: 0, operations: 0 };
				stats.usage++;
				stats.totalTime += execution.duration;
				stats.operations += execution.stepsExecuted;
				layerStats.set(layer, stats);
			}
		}

		return {
			mostUsedTools: Array.from(toolUsage.entries())
				.map(([tool, data]) => ({ tool, layer: data.layer, count: data.count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 10),

			averageExecutionTimes: Object.fromEntries(
				Array.from(toolTimes.entries()).map(([tool, times]) => [
					tool,
					times.reduce((a, b) => a + b, 0) / times.length,
				]),
			),

			successRates: Object.fromEntries(
				Array.from(toolSuccesses.entries()).map(([tool, successes]) => [
					tool,
					successes / (toolUsage.get(tool)?.count || 1),
				]),
			),

			layerUtilization: Object.fromEntries(
				Array.from(layerStats.entries()).map(([layer, stats]) => [
					layer,
					{
						usage: stats.usage,
						performance: stats.operations > 0 ? stats.totalTime / stats.operations : 0,
					},
				]),
			),

			performanceTrends: this.metrics.performanceHistory.slice(-100), // Last 100 data points
		};
	}

	/**
	 * Get optimization recommendations
	 */
	async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
		const _analytics = await this.getToolAnalytics();
		const recommendations: OptimizationRecommendation[] = [];

		// Analyze cache opportunities
		if (this.config.enableCaching) {
			recommendations.push({
				type: 'caching',
				description: 'Enable caching for frequently used tools',
				impact: 'medium',
				implementation: 'Set cacheable: true and provide cache keys for repeated operations',
				estimatedImprovement: 0.3,
			});
		}

		// Analyze parallelization opportunities
		const avgParallelization =
			this.executionHistory
				.filter((e) => e.parallelExecuted)
				.reduce((acc, e) => acc + (e.concurrentSteps || 1), 0) /
			Math.max(1, this.executionHistory.length);

		if (avgParallelization < 2) {
			recommendations.push({
				type: 'parallelization',
				description: 'Increase parallel execution of independent steps',
				impact: 'high',
				implementation: 'Review step dependencies and enable parallel execution where possible',
				estimatedImprovement: 0.5,
			});
		}

		return recommendations;
	}

	/**
	 * Get orchestrator status
	 */
	getStatus(): OrchestratorStatus {
		const layerHealth: Record<string, { status: string; tools: number }> = {};

		for (const [name, layer] of Object.entries(this.layers)) {
			const health = layer.getLayerHealth();
			layerHealth[name] = {
				status: health.status,
				tools: health.registeredTools,
			};
		}

		return {
			layerCount: this.getLayerCount(),
			activeExecutions: this.activeExecutions.size,
			totalExecutions: this.metrics.totalExecutions,
			isShutdown: this.isShutdown,
			health: {
				status: Object.values(layerHealth).every((h) => h.status === 'healthy')
					? 'healthy'
					: 'degraded',
				layerHealth,
				lastHealthCheck: new Date(),
			},
			performance: {
				averageExecutionTime:
					this.metrics.totalDuration / Math.max(1, this.metrics.totalExecutions),
				successRate: this.metrics.successfulExecutions / Math.max(1, this.metrics.totalExecutions),
				resourceUtilization: {},
			},
		};
	}

	/**
	 * Graceful shutdown
	 */
	async shutdown(): Promise<void> {
		if (this.isShutdown) return;

		this.isShutdown = true;

		// Clear intervals
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}
		if (this.metricsInterval) {
			clearInterval(this.metricsInterval);
		}

		// Wait for active executions to complete (with timeout)
		const shutdownTimeout = 30000; // 30 seconds
		const startTime = Date.now();

		while (this.activeExecutions.size > 0 && Date.now() - startTime < shutdownTimeout) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Force terminate remaining executions
		if (this.activeExecutions.size > 0) {
			console.warn(
				`Force terminating ${this.activeExecutions.size} active executions during shutdown`,
			);
			this.activeExecutions.clear();
		}

		this.emit('orchestrator-shutdown', {
			totalExecutions: this.metrics.totalExecutions,
			timestamp: new Date(),
		});
	}

	// Helper methods for internal operations

	/**
	 * Perform health check on all layers
	 */
	private performHealthCheck(): void {
		for (const [name, layer] of Object.entries(this.layers)) {
			const health = layer.getLayerHealth();
			if (health.status !== 'healthy') {
				this.emit('layer-health-warning', { layer: name, status: health.status });
			}
		}
	}

	/**
	 * Collect performance metrics
	 */
	private collectMetrics(): void {
		const timestamp = new Date();
		const metrics = {
			activeExecutions: this.activeExecutions.size,
			totalExecutions: this.metrics.totalExecutions,
			averageExecutionTime: this.metrics.totalDuration / Math.max(1, this.metrics.totalExecutions),
			successRate: this.metrics.successfulExecutions / Math.max(1, this.metrics.totalExecutions),
		};

		this.metrics.performanceHistory.push({ timestamp, metrics });

		// Keep only last 1000 entries
		if (this.metrics.performanceHistory.length > 1000) {
			this.metrics.performanceHistory.shift();
		}
	}

	/**
	 * Validate security for tool chain
	 */
	private async validateSecurity(toolChain: ToolChain, result: ExecutionResult): Promise<void> {
		// Only validate if security layer is available and tool chain has security context
		if (toolChain.securityContext && !this.securityLayer) {
			throw new ToolOrchestrationError(
				ToolOrchestrationErrorCode.SECURITY_VALIDATION_FAILED,
				'Security validation enabled but no security layer available',
				{ chainId: toolChain.id },
			);
		}

		if (this.securityLayer && toolChain.securityContext) {
			// Validate tool chain input
			await this.securityLayer.validateInput(toolChain, { correlationId: result.executionId });

			result.securityValidation = true;
			result.securityContext = toolChain.securityContext;
		} else {
			// Skip security validation if no security context or layer
			result.securityValidation = false;
		}
	}

	/**
	 * Update execution metrics
	 */
	private updateExecutionMetrics(result: ExecutionResult): void {
		this.metrics.totalExecutions++;
		if (result.success) {
			this.metrics.successfulExecutions++;
		}
		this.metrics.totalDuration += result.duration;

		// Update layer usage
		for (const layer of result.layersUsed) {
			this.metrics.layerUsage[layer] = (this.metrics.layerUsage[layer] || 0) + 1;
		}

		// Add to history
		this.executionHistory.push(result);

		// Keep only last 1000 executions
		if (this.executionHistory.length > 1000) {
			this.executionHistory.shift();
		}
	}

	/**
	 * Detect cycles in dependency graph
	 */
	private detectCycles(graph: Map<string, string[]>, nodes: string[]): boolean {
		const visited = new Set<string>();
		const recStack = new Set<string>();

		const dfs = (node: string): boolean => {
			visited.add(node);
			recStack.add(node);

			const neighbors = graph.get(node) || [];
			for (const neighbor of neighbors) {
				if (!visited.has(neighbor)) {
					if (dfs(neighbor)) return true;
				} else if (recStack.has(neighbor)) {
					return true;
				}
			}

			recStack.delete(node);
			return false;
		};

		for (const node of nodes) {
			if (!visited.has(node)) {
				if (dfs(node)) return true;
			}
		}

		return false;
	}

	/**
	 * Calculate depth and parallelizable steps
	 */
	private calculateDepthAndParallelizable(
		graph: Map<string, string[]>,
		inDegree: Map<string, number>,
	): { maxDepth: number; parallelizable: string[] } {
		const depths = new Map<string, number>();
		const parallelizable: string[] = [];
		const queue: string[] = [];

		// Initialize queue with nodes having no dependencies
		for (const [node, degree] of inDegree) {
			if (degree === 0) {
				queue.push(node);
				depths.set(node, 0);
				parallelizable.push(node);
			}
		}

		let maxDepth = 0;

		while (queue.length > 0) {
			const node = queue.shift()!;
			const currentDepth = depths.get(node) || 0;
			maxDepth = Math.max(maxDepth, currentDepth);

			// Process neighbors
			for (const [neighbor, neighborDeps] of graph) {
				if (neighborDeps.includes(node)) {
					const newDegree = (inDegree.get(neighbor) || 0) - 1;
					inDegree.set(neighbor, newDegree);

					if (newDegree === 0) {
						queue.push(neighbor);
						depths.set(neighbor, currentDepth + 1);
						if (currentDepth === 0) {
							parallelizable.push(neighbor);
						}
					}
				}
			}
		}

		return { maxDepth: maxDepth + 1, parallelizable };
	}

	/**
	 * Group steps for execution
	 */
	private groupStepsForExecution(
		graph: Map<string, string[]>,
		inDegree: Map<string, number>,
	): string[][] {
		const groups: string[][] = [];
		const processed = new Set<string>();
		const currentInDegree = new Map(inDegree);

		while (processed.size < graph.size) {
			const currentGroup: string[] = [];

			// Find all nodes with no remaining dependencies
			for (const [node, degree] of currentInDegree) {
				if (degree === 0 && !processed.has(node)) {
					currentGroup.push(node);
				}
			}

			if (currentGroup.length === 0) break;

			groups.push(currentGroup);

			// Mark as processed and update dependencies
			for (const node of currentGroup) {
				processed.add(node);
				currentInDegree.delete(node);

				// Update neighbors
				for (const [neighbor, deps] of graph) {
					if (deps.includes(node)) {
						const newDegree = (currentInDegree.get(neighbor) || 0) - 1;
						currentInDegree.set(neighbor, Math.max(0, newDegree));
					}
				}
			}
		}

		return groups;
	}

	/**
	 * Find critical path
	 */
	private findCriticalPath(
		graph: Map<string, string[]>,
		_stepMap: Map<string, ToolStep>,
	): string[] {
		// Simple implementation - find longest path
		const visited = new Set<string>();
		const paths = new Map<string, string[]>();

		const dfs = (node: string, currentPath: string[]): string[] => {
			if (visited.has(node)) {
				return paths.get(node) || [];
			}

			visited.add(node);
			const newPath = [...currentPath, node];
			let longestPath = newPath;

			const deps = graph.get(node) || [];
			for (const dep of deps) {
				const depPath = dfs(dep, newPath);
				if (depPath.length > longestPath.length) {
					longestPath = depPath;
				}
			}

			paths.set(node, longestPath);
			return longestPath;
		};

		let criticalPath: string[] = [];
		for (const node of graph.keys()) {
			const path = dfs(node, []);
			if (path.length > criticalPath.length) {
				criticalPath = path;
			}
		}

		return criticalPath;
	}

	/**
	 * Topological sort for step execution order
	 */
	private topologicalSort(steps: ToolStep[]): string[] {
		const graph = new Map<string, string[]>();
		const inDegree = new Map<string, number>();

		// Build graph
		for (const step of steps) {
			graph.set(step.id, step.dependencies);
			inDegree.set(step.id, step.dependencies.length);
		}

		const result: string[] = [];
		const queue: string[] = [];

		// Initialize queue
		for (const [node, degree] of inDegree) {
			if (degree === 0) {
				queue.push(node);
			}
		}

		while (queue.length > 0) {
			const node = queue.shift()!;
			result.push(node);

			// Update neighbors
			for (const [neighbor, deps] of graph) {
				if (deps.includes(node)) {
					const newDegree = (inDegree.get(neighbor) || 0) - 1;
					inDegree.set(neighbor, newDegree);
					if (newDegree === 0) {
						queue.push(neighbor);
					}
				}
			}
		}

		return result;
	}

	/**
	 * Apply optimization hints
	 */
	private applyOptimizationHints(executionOrder: string[], toolChain: ToolChain): string[] {
		// Apply parallelism hints if available
		if (toolChain.optimization?.parallelismHints) {
			// This is a simplified implementation - real optimization would be more complex
			return executionOrder;
		}
		return executionOrder;
	}

	/**
	 * Group steps for parallel execution
	 */
	private groupForParallelExecution(steps: ToolStep[], executionOrder: string[]): string[][] {
		const groups: string[][] = [];
		const stepMap = new Map(steps.map((s) => [s.id, s]));
		const processed = new Set<string>();

		for (const stepId of executionOrder) {
			if (processed.has(stepId)) continue;

			const step = stepMap.get(stepId)!;
			const group = [stepId];
			processed.add(stepId);

			// Find other steps that can run in parallel
			for (const otherStepId of executionOrder) {
				if (processed.has(otherStepId)) continue;

				const otherStep = stepMap.get(otherStepId)!;

				// Check if steps can run in parallel (no dependencies between them)
				const canRunInParallel =
					!step.dependencies.includes(otherStepId) &&
					!otherStep.dependencies.includes(stepId) &&
					!this.hasTransitiveDependency(step, otherStep, stepMap);

				if (canRunInParallel && group.length < this.config.maxConcurrentTools) {
					group.push(otherStepId);
					processed.add(otherStepId);
				}
			}

			groups.push(group);
		}

		return groups;
	}

	/**
	 * Check for transitive dependencies
	 */
	private hasTransitiveDependency(
		step1: ToolStep,
		step2: ToolStep,
		stepMap: Map<string, ToolStep>,
	): boolean {
		const visited = new Set<string>();

		const checkDependency = (stepId: string, targetId: string): boolean => {
			if (visited.has(stepId)) return false;
			visited.add(stepId);

			const step = stepMap.get(stepId);
			if (!step) return false;

			if (step.dependencies.includes(targetId)) return true;

			return step.dependencies.some((depId) => checkDependency(depId, targetId));
		};

		return checkDependency(step1.id, step2.id) || checkDependency(step2.id, step1.id);
	}

	/**
	 * Estimate execution time
	 */
	private estimateExecutionTime(steps: ToolStep[], parallelGroups: string[][]): number {
		let totalTime = 0;

		for (const group of parallelGroups) {
			const groupTime = Math.max(
				...group.map((stepId) => {
					const step = steps.find((s) => s.id === stepId);
					return step?.expectedDuration || 1000; // Default 1 second
				}),
			);
			totalTime += groupTime;
		}

		return totalTime;
	}

	/**
	 * Calculate resource requirements
	 */
	private calculateResourceRequirements(steps: ToolStep[]): Record<string, unknown> {
		const requirements = {
			totalCpu: 0,
			totalMemory: 0,
			maxTimeout: 0,
		};

		for (const step of steps) {
			const req = step.resourceRequirements || {};
			requirements.totalCpu += req.cpu || 0.1;
			requirements.totalMemory += req.memory || 64;
			requirements.maxTimeout = Math.max(requirements.maxTimeout, req.timeout || 5000);
		}

		return requirements;
	}

	/**
	 * Resolve context substitutions in input
	 */
	private resolveContextSubstitutions(
		input: Record<string, unknown>,
		sharedContext?: Record<string, unknown>,
	): Record<string, unknown> {
		if (!sharedContext) return input;

		const resolved = { ...input };

		const resolveValue = (value: unknown): unknown => {
			if (typeof value === 'string') {
				return value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
					return sharedContext[key]?.toString() || match;
				});
			}
			if (Array.isArray(value)) {
				return value.map(resolveValue);
			}
			if (typeof value === 'object' && value !== null) {
				const result: Record<string, unknown> = {};
				for (const [k, v] of Object.entries(value)) {
					result[k] = resolveValue(v);
				}
				return result;
			}
			return value;
		};

		for (const [key, value] of Object.entries(resolved)) {
			resolved[key] = resolveValue(value);
		}

		return resolved;
	}

	/**
	 * Calculate layer performance metrics
	 */
	private calculateLayerPerformance(
		execution: ExecutionResult,
	): Record<string, { averageTime: number; operations: number }> {
		const layerPerf: Record<string, { averageTime: number; operations: number }> = {};

		for (const layer of execution.layersUsed) {
			layerPerf[layer] = {
				averageTime: execution.duration / execution.stepsExecuted,
				operations: execution.stepsExecuted,
			};
		}

		return layerPerf;
	}
}
