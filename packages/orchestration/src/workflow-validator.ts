import { createHash } from 'node:crypto';
import type { Logger } from 'winston';
import winston from 'winston';
import type { z } from 'zod';
import { type retryZ, type stepZ, workflowZ } from './schemas/workflow.zod.js';

// Strongly typed workflow structures derived from Zod schemas (eliminates drift risk)
export type Workflow = z.infer<typeof workflowZ>;
export type WorkflowStep = z.infer<typeof stepZ>;
export type WorkflowRetryConfig = z.infer<typeof retryZ>;
export type WorkflowStepKind = Workflow['steps'][string]['kind'];
export type WorkflowBranch = NonNullable<WorkflowStep['branches']>[number];
export type WorkflowBudget = NonNullable<Workflow['budget']>;
export type WorkflowMetadata = NonNullable<Workflow['metadata']>;

/**
 * Metrics emitter abstraction for telemetry integration
 */
export interface ValidationMetricsEmitter {
	incrementCounter(
		metric: string,
		tags?: Record<string, string | number | boolean>,
	): void;
	recordTiming(
		metric: string,
		value: number,
		tags?: Record<string, string | number | boolean>,
	): void;
	recordHistogram(
		metric: string,
		value: number,
		tags?: Record<string, string | number | boolean>,
	): void;
}

/**
 * Logger-based metrics emitter implementation
 */
export class LoggerMetricsEmitter implements ValidationMetricsEmitter {
	constructor(
		private readonly logger: Logger = winston.createLogger({
			level: 'info',
			format: winston.format.json(),
			transports: [new winston.transports.Console()],
		}),
	) {}

	incrementCounter(
		metric: string,
		tags?: Record<string, string | number | boolean>,
	): void {
		this.logger.info(`counter.${metric}`, { ...tags, value: 1 });
	}

	recordTiming(
		metric: string,
		value: number,
		tags?: Record<string, string | number | boolean>,
	): void {
		this.logger.info(`timing.${metric}`, { ...tags, value, unit: 'ms' });
	}

	recordHistogram(
		metric: string,
		value: number,
		tags?: Record<string, string | number | boolean>,
	): void {
		this.logger.info(`histogram.${metric}`, { ...tags, value });
	}
}

// Global metrics emitter (can be replaced for testing or integration)
let metricsEmitter: ValidationMetricsEmitter = new LoggerMetricsEmitter();

/**
 * Set a custom metrics emitter (for testing or telemetry integration)
 */
export function setMetricsEmitter(emitter: ValidationMetricsEmitter): void {
	metricsEmitter = emitter;
}

// Validation cache to avoid re-validating identical workflows
const validationCache = new Map<
	string,
	{
		valid: boolean;
		result?: ValidationResult;
		error?: Error;
		timestamp: number;
		softExpiry?: number;
	}
>();

// Maximum workflow depth to prevent stack overflow
const MAX_WORKFLOW_DEPTH = 1000;

// Cache cleanup interval (10 minutes)
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000;
let cacheCleanupTimer: NodeJS.Timeout | null = null;

interface ValidationResult {
	workflow: Workflow;
	stats: {
		totalSteps: number;
		unreachableSteps: string[];
		maxDepth: number;
		cycleDetected: boolean;
	};
	topologicalOrder: string[];
}

/**
 * Create a hash key for workflow caching
 */
function createWorkflowHash(workflow: Workflow): string {
	// Create a hash based on the workflow structure for caching
	const structureData = JSON.stringify({
		entry: workflow.entry,
		steps: Object.keys(workflow.steps).sort(),
		connections: Object.fromEntries(
			Object.entries(workflow.steps).map(([id, step]: [string, any]) => [
				id,
				{
					next: step.next,
					branches: step.branches?.map((b: any) => b.to).sort(),
				},
			]),
		),
	});

	return createHash('md5').update(structureData, 'utf8').digest('hex');
}

/**
 * Initialize cache cleanup if not already started
 */
function initializeCacheCleanup(): void {
	if (cacheCleanupTimer) return;

	cacheCleanupTimer = setInterval(() => {
		// Clear cache periodically to prevent memory leaks
		validationCache.clear();
	}, CACHE_CLEANUP_INTERVAL);

	// Don't keep the process alive
	if (cacheCleanupTimer.unref) {
		cacheCleanupTimer.unref();
	}
}

function topologicalSort(wf: Workflow, nodes: Set<string>): string[] {
	const inDegree = new Map<string, number>();
	const adj = new Map<string, string[]>();

	for (const id of nodes) {
		inDegree.set(id, 0);
		adj.set(id, []);
	}

	for (const id of nodes) {
		const step = wf.steps[id];

		if (step.next && nodes.has(step.next)) {
			adj.get(id)?.push(step.next);
			inDegree.set(step.next, (inDegree.get(step.next) ?? 0) + 1);
		}

		if (step.branches) {
			for (const branch of step.branches) {
				if (nodes.has(branch.to)) {
					adj.get(id)?.push(branch.to);
					inDegree.set(branch.to, (inDegree.get(branch.to) ?? 0) + 1);
				}
			}
		}
	}

	const queue = Array.from(inDegree.entries())
		.filter(([, deg]) => deg === 0)
		.map(([id]) => id)
		.sort();

	const order: string[] = [];

	while (queue.length > 0) {
		const id = queue.shift();
		if (id === undefined) {
			// Should not happen, but break defensively
			break;
		}
		order.push(id);

		const neighbors = adj.get(id) ?? [];
		for (const next of neighbors) {
			const nextInDegree = inDegree.get(next);
			if (nextInDegree === undefined) {
				// Defensive: skip if next is not in inDegree map
				continue;
			}
			inDegree.set(next, nextInDegree - 1);
			if (inDegree.get(next) === 0) {
				queue.push(next);
				queue.sort();
			}
		}
	}

	if (order.length !== nodes.size) {
		throw new Error('Cycle detected during topological sort');
	}

	return order;
}

/**
 * Validate a workflow definition and ensure it forms a DAG with performance optimizations.
 */
export function validateWorkflow(input: unknown): ValidationResult {
	// Parse and validate schema first
	const wf = workflowZ.parse(input);

	// Create cache key for performance optimization
	const cacheKey = createWorkflowHash(wf);

	// Check cache first (with soft TTL support)
	if (validationCache.has(cacheKey)) {
		const cached = validationCache.get(cacheKey)!;
		const now = Date.now();

		// Check soft TTL (10 minutes) - mark stale but still usable
		const _softTtl = 10 * 60 * 1000; // 10 minutes
		const isStale = cached.softExpiry && now > cached.softExpiry;

		if (cached.valid && cached.result) {
			if (isStale) {
				metricsEmitter.incrementCounter('validation.cache.stale_hits', {
					cache_key: cacheKey,
				});
				// Return stale result but could trigger background refresh later
			} else {
				metricsEmitter.incrementCounter('validation.cache.hits', {
					cache_key: cacheKey,
				});
			}
			return cached.result;
		} else {
			throw cached.error;
		}
	}

	// Cache miss - emit metric
	metricsEmitter.incrementCounter('validation.cache.misses', {
		cache_key: cacheKey,
	});
	const startTime = Date.now();

	// Initialize cache cleanup on first use
	initializeCacheCleanup();

	try {
		const result = validateWorkflowStructure(wf);

		// Record timing metrics
		const latency = Date.now() - startTime;
		metricsEmitter.recordTiming('validation.latency.ms', latency, {
			step_count: Object.keys(wf.steps).length,
			has_budget: Boolean(wf.budget),
		});

		// Cache successful validation
		const now = Date.now();
		const softTtl = 10 * 60 * 1000; // 10 minutes
		validationCache.set(cacheKey, {
			valid: true,
			result,
			timestamp: now,
			softExpiry: now + softTtl,
		});
		metricsEmitter.incrementCounter('validation.cache.sets', {
			cache_key: cacheKey,
		});

		return result;
	} catch (error) {
		// Cache validation error
		const now = Date.now();
		validationCache.set(cacheKey, {
			valid: false,
			error: error as Error,
			timestamp: now,
		});
		throw error;
	}
}

/**
 * Optimized workflow structure validation
 */
function validateWorkflowStructure(wf: Workflow): ValidationResult {
	const visited = new Set<string>();
	const stack = new Set<string>();
	const unreachableSteps = new Set(Object.keys(wf.steps));
	let maxDepth = 0;
	let cycleDetected = false;

	// Pre-validate all step references
	const stepIds = new Set(Object.keys(wf.steps));

	// Validate entry point exists
	if (!stepIds.has(wf.entry)) {
		throw new Error(`Entry step '${wf.entry}' does not exist`);
	}

	// Pre-validate all next/branch references
	for (const [stepId, step] of Object.entries(wf.steps)) {
		if (step.next && !stepIds.has(step.next)) {
			throw new Error(
				`Step '${stepId}' references non-existent next step: ${step.next}`,
			);
		}

		if (step.branches) {
			for (const branch of step.branches) {
				if (!stepIds.has(branch.to)) {
					throw new Error(
						`Step '${stepId}' references non-existent branch target: ${branch.to}`,
					);
				}
			}
		}
	}

	// Optimized DFS with path tracking and early termination
	const visit = (
		stepId: string,
		depth: number = 0,
		path: string[] = [],
	): void => {
		// Prevent infinite recursion
		if (depth > MAX_WORKFLOW_DEPTH) {
			throw new Error(
				`Workflow depth exceeds maximum (${MAX_WORKFLOW_DEPTH}). Possible infinite loop involving: ${path.slice(-5).join(' -> ')}`,
			);
		}

		// Track maximum depth
		maxDepth = Math.max(maxDepth, depth);

		// Cycle detection
		if (stack.has(stepId)) {
			cycleDetected = true;
			const cycleStart = path.indexOf(stepId);
			const cycle = path.slice(cycleStart).concat(stepId).join(' -> ');
			throw new Error(`Cycle detected: ${cycle}`);
		}

		// Skip if already processed
		if (visited.has(stepId)) {
			unreachableSteps.delete(stepId);
			return;
		}

		// Mark as reachable and being processed
		stack.add(stepId);
		visited.add(stepId);
		unreachableSteps.delete(stepId);

		const step = wf.steps[stepId];
		const currentPath = [...path, stepId];

		// Visit next step
		if (step.next) {
			visit(step.next, depth + 1, currentPath);
		}

		// Visit branch targets
		if (step.branches) {
			for (const branch of step.branches) {
				visit(branch.to, depth + 1, currentPath);
			}
		}

		// Remove from current processing stack
		stack.delete(stepId);
	};

	// Start validation from entry point
	visit(wf.entry);

	const order = topologicalSort(wf, visited);

	const stats = {
		totalSteps: Object.keys(wf.steps).length,
		unreachableSteps: Array.from(unreachableSteps),
		maxDepth,
		cycleDetected,
	};

	// Warn about unreachable steps (don't fail, just warn)
	if (stats.unreachableSteps.length > 0) {
		console.warn(
			`Workflow contains ${stats.unreachableSteps.length} unreachable steps: ${stats.unreachableSteps.join(', ')}`,
		);
	}

	return {
		workflow: wf,
		stats,
		topologicalOrder: order,
	};
}

/**
 * Validate workflow with detailed performance metrics
 */
export function validateWorkflowWithMetrics(input: unknown): {
	result: ValidationResult;
	metrics: {
		validationTimeMs: number;
		cacheHit: boolean;
		stepCount: number;
		complexity: 'low' | 'medium' | 'high';
	};
} {
	const startTime = performance.now();
	const wf = workflowZ.parse(input);
	const cacheKey = createWorkflowHash(wf);
	const cacheHit = validationCache.has(cacheKey);

	const result = validateWorkflow(input);
	const endTime = performance.now();

	const stepCount = result.stats.totalSteps;
	let complexity: 'low' | 'medium' | 'high';

	if (stepCount <= 10) {
		complexity = 'low';
	} else if (stepCount <= 50) {
		complexity = 'medium';
	} else {
		complexity = 'high';
	}

	return {
		result,
		metrics: {
			validationTimeMs: endTime - startTime,
			cacheHit,
			stepCount,
			complexity,
		},
	};
}

/**
 * Clear validation cache (useful for testing or memory management)
 */
export function clearValidationCache(): void {
	validationCache.clear();
}

/**
 * Get validation cache diagnostics for ops monitoring
 */
export function getValidationCache(): {
	size: number;
	hitRate?: number;
	oldestEntryAge?: number;
	staleEntryCount: number;
	memoryUsage: number;
} {
	const now = Date.now();
	let oldestTimestamp = now;
	let staleCount = 0;

	// Calculate oldest entry age and stale count
	for (const entry of validationCache.values()) {
		if (entry.timestamp < oldestTimestamp) {
			oldestTimestamp = entry.timestamp;
		}

		// Check if entry is soft-expired
		if (entry.softExpiry && now > entry.softExpiry) {
			staleCount++;
		}
	}

	const oldestEntryAge =
		validationCache.size > 0 ? now - oldestTimestamp : undefined;

	// Simplified memory usage approximation
	const memoryUsage = JSON.stringify(
		Array.from(validationCache.entries()),
	).length;

	return {
		size: validationCache.size,
		oldestEntryAge,
		staleEntryCount: staleCount,
		memoryUsage,
	};
}

/**
 * Optimized validation for batch processing
 */
export function validateWorkflows(inputs: unknown[]): Array<{
	index: number;
	success: boolean;
	result?: ValidationResult;
	error?: Error;
	fromCache: boolean;
}> {
	return inputs.map((input, index) => {
		try {
			const wf = workflowZ.parse(input);
			const cacheKey = createWorkflowHash(wf);
			const fromCache = validationCache.has(cacheKey);

			const result = validateWorkflow(input);

			return {
				index,
				success: true,
				result,
				fromCache,
			};
		} catch (error) {
			return {
				index,
				success: false,
				error: error as Error,
				fromCache: false,
			};
		}
	});
}

/**
 * Check if workflow is likely to be expensive to validate
 */
export function estimateValidationCost(input: unknown): {
	estimatedCost: 'low' | 'medium' | 'high';
	stepCount: number;
	branchingFactor: number;
	estimatedTimeMs: number;
} {
	try {
		const wf = workflowZ.parse(input);
		const stepCount = Object.keys(wf.steps).length;

		let totalBranches = 0;
		for (const step of Object.values(wf.steps)) {
			if (step.branches) {
				totalBranches += step.branches.length;
			}
			if (step.next) {
				totalBranches += 1;
			}
		}

		const branchingFactor = stepCount > 0 ? totalBranches / stepCount : 0;

		// Rough estimation based on step count and branching
		let estimatedTimeMs: number;
		let estimatedCost: 'low' | 'medium' | 'high';

		if (stepCount <= 10) {
			estimatedTimeMs = 1;
			estimatedCost = 'low';
		} else if (stepCount <= 50) {
			estimatedTimeMs = stepCount * 0.5;
			estimatedCost = 'medium';
		} else {
			estimatedTimeMs = stepCount * branchingFactor * 2;
			estimatedCost = 'high';
		}

		return {
			estimatedCost,
			stepCount,
			branchingFactor,
			estimatedTimeMs,
		};
	} catch {
		return {
			estimatedCost: 'high',
			stepCount: 0,
			branchingFactor: 0,
			estimatedTimeMs: 100,
		};
	}
}
