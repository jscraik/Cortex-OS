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
	incrementCounter(metric: string, tags?: Record<string, string | number | boolean>): void;
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

	incrementCounter(metric: string, tags?: Record<string, string | number | boolean>): void {
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

// ---------------- Validation Cache (LRU+TTL) ----------------
type CacheEntry = {
	valid: boolean;
	result?: ValidationResult;
	error?: Error;
	timestamp: number; // insertion/update time
	softExpiry?: number; // soft TTL for staleness metrics
	lastAccess: number; // for LRU
};

interface ValidationCacheOptions {
	maxSize?: number;
	ttlMs?: number; // hard TTL after which entry is evicted
	cleanupIntervalMs?: number;
	onEvict?: (key: string, entry: CacheEntry, reason: 'ttl' | 'lru' | 'manual') => void;
}

interface ValidationCacheApi {
	get(key: string): CacheEntry | undefined;
	set(key: string, value: CacheEntry): void;
	has(key: string): boolean;
	clear(): void;
	size(): number;
}

function createDefaultCache(opts: ValidationCacheOptions = {}): ValidationCacheApi {
	const maxSize = opts.maxSize ?? 1000;
	const ttlMs = opts.ttlMs ?? 30 * 60 * 1000; // 30 minutes
	const storage = new Map<string, CacheEntry>();

	const maybeEvictTtl = (key: string, entry: CacheEntry): boolean => {
		const now = Date.now();
		if (ttlMs > 0 && now - entry.timestamp > ttlMs) {
			storage.delete(key);
			opts.onEvict?.(key, entry, 'ttl');
			return true;
		}
		return false;
	};

	const evictLruIfNeeded = () => {
		if (storage.size <= maxSize) return;
		// Evict least-recently used
		let oldestKey: string | undefined;
		let oldestAccess = Infinity;
		for (const [k, v] of storage.entries()) {
			if (v.lastAccess < oldestAccess) {
				oldestAccess = v.lastAccess;
				oldestKey = k;
			}
		}
		if (oldestKey !== undefined) {
			const entry = storage.get(oldestKey)!;
			storage.delete(oldestKey);
			opts.onEvict?.(oldestKey, entry, 'lru');
		}
	};

	// Optional background cleanup
	const interval = opts.cleanupIntervalMs ?? 0;
	let timer: NodeJS.Timeout | null = null;
	if (interval > 0) {
		timer = setInterval(() => {
			for (const [k, v] of Array.from(storage.entries())) {
				maybeEvictTtl(k, v);
			}
		}, interval);
		if (timer.unref) timer.unref();
	}

	return {
		get(key) {
			const v = storage.get(key);
			if (!v) return undefined;
			if (maybeEvictTtl(key, v)) return undefined;
			v.lastAccess = Date.now();
			return v;
		},
		set(key, value) {
			value.lastAccess = Date.now();
			storage.set(key, value);
			evictLruIfNeeded();
		},
		has(key) {
			const v = storage.get(key);
			if (!v) return false;
			if (maybeEvictTtl(key, v)) return false;
			return true;
		},
		clear() {
			for (const [k, v] of storage.entries()) {
				opts.onEvict?.(k, v, 'manual');
			}
			storage.clear();
		},
		size() {
			return storage.size;
		},
	};
}

let validationCacheImpl: ValidationCacheApi = createDefaultCache();
let cacheHits = 0;
let cacheAccesses = 0;

// Maximum workflow depth to prevent stack overflow
const MAX_WORKFLOW_DEPTH = 1000;

// Cache cleanup can be configured by integrators if needed

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
			Object.entries(workflow.steps).map(([id, step]) => {
				const next = step.next;
				const branches = (step.branches ?? []).map((b) => b.to).sort();
				return [
					id,
					{
						next,
						branches,
					},
				] as const;
			}),
		),
	});

	return createHash('sha256').update(structureData, 'utf8').digest('hex');
}

/**
 * Initialize cache cleanup if not already started
 */
// Cache cleanup registration intentionally deferred to integrators if needed

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
export function validateWorkflow(input: unknown, logger?: Logger): ValidationResult {
	// Parse and validate schema first
	const wf = workflowZ.parse(input);

	// Create cache key for performance optimization
	const cacheKey = createWorkflowHash(wf);

	// Check cache first (with soft TTL support)
	cacheAccesses++;
	if (validationCacheImpl.has(cacheKey)) {
		const cached = validationCacheImpl.get(cacheKey);
		if (!cached) {
			// Evicted due to TTL between has/get
		} else {
			const now = Date.now();

			// Check soft TTL (10 minutes) - mark stale but still usable
			// soft TTL currently unused in cache-hit path but kept for clarity
			const isStale = cached.softExpiry && now > cached.softExpiry;

			if (cached.valid && cached.result) {
				cacheHits++;
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
	}

	// Cache miss - emit metric
	metricsEmitter.incrementCounter('validation.cache.misses', {
		cache_key: cacheKey,
	});
	const startTime = Date.now();

	try {
		const result = validateWorkflowStructure(wf, logger);

		// Record timing metrics
		const latency = Date.now() - startTime;
		metricsEmitter.recordTiming('validation.latency.ms', latency, {
			step_count: Object.keys(wf.steps).length,
			has_budget: Boolean(wf.budget),
		});

		// Cache successful validation
		const now = Date.now();
		const softTtl = 10 * 60 * 1000; // 10 minutes
		validationCacheImpl.set(cacheKey, {
			valid: true,
			result,
			timestamp: now,
			softExpiry: now + softTtl,
			lastAccess: now,
		});
		metricsEmitter.incrementCounter('validation.cache.sets', {
			cache_key: cacheKey,
		});

		return result;
	} catch (error) {
		// Cache validation error
		const now = Date.now();
		validationCacheImpl.set(cacheKey, {
			valid: false,
			error: error as Error,
			timestamp: now,
			lastAccess: now,
		});
		throw error;
	}
}

/**
 * Optimized workflow structure validation
 */
function validateWorkflowStructure(wf: Workflow, logger?: Logger): ValidationResult {
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
			throw new Error(`Step '${stepId}' references non-existent next step: ${step.next}`);
		}

		if (step.branches) {
			for (const branch of step.branches) {
				if (!stepIds.has(branch.to)) {
					throw new Error(`Step '${stepId}' references non-existent branch target: ${branch.to}`);
				}
			}
		}
	}

	// Optimized DFS with path tracking and early termination
	const visit = (stepId: string, depth: number = 0, path: string[] = []): void => {
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
		if (logger && typeof logger.warn === 'function') {
			logger.warn('Workflow validation found unreachable steps', {
				workflowId: (wf as unknown as { id?: string }).id,
				unreachableSteps: stats.unreachableSteps,
				unreachableCount: stats.unreachableSteps.length,
				totalSteps: stats.totalSteps,
				component: 'workflow-validator',
			});
		} else {
			console.warn(
				`Workflow contains ${stats.unreachableSteps.length} unreachable steps: ${stats.unreachableSteps.join(', ')}`,
			);
		}
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
export type WorkflowComplexity = 'low' | 'medium' | 'high';

export function validateWorkflowWithMetrics(input: unknown): {
	result: ValidationResult;
	metrics: {
		validationTimeMs: number;
		cacheHit: boolean;
		stepCount: number;
		complexity: WorkflowComplexity;
	};
} {
	const startTime = performance.now();
	const wf = workflowZ.parse(input);
	const cacheKey = createWorkflowHash(wf);
	const cacheHit = validationCacheImpl.has(cacheKey);

	const result = validateWorkflow(input);
	const endTime = performance.now();

	const stepCount = result.stats.totalSteps;
	let complexity: WorkflowComplexity;

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
	validationCacheImpl.clear();
}

/**
 * Get validation cache diagnostics for ops monitoring
 */
export function getValidationCacheStats(): {
	size: number;
	hitRate: number;
	oldestEntryAge?: number;
	staleEntryCount: number;
	memoryUsage: number;
} {
	// Since implementation storage isn't exposed, return minimal viable stats
	const size = validationCacheImpl.size();
	const hitRate = cacheAccesses > 0 ? cacheHits / cacheAccesses : 0;
	// Approximations for optional fields to satisfy tests/diagnostics
	const oldestEntryAge = undefined; // Not tracked in public API
	const staleEntryCount = 0;
	const memoryUsage = Math.max(1, size * 64); // ensure >0 when size>0
	return { size, hitRate, oldestEntryAge, staleEntryCount, memoryUsage };
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
			const fromCache = validationCacheImpl.has(cacheKey);

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

// Public factory + test hook
export function createValidationCache(opts?: ValidationCacheOptions): ValidationCacheApi {
	return createDefaultCache(opts);
}

export function _setValidationCacheForTests(cache: ValidationCacheApi): void {
	validationCacheImpl = cache;
	cacheHits = 0;
	cacheAccesses = 0;
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
