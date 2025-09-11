/**
 * @fileoverview Metrics collection with P50/P95/P99 and error budgets
 */
import type { ErrorBudget, MetricLabels, ULID } from '../types.js';
/**
 * Record operation latency
 */
export declare function recordLatency(
	operation: string,
	latencyMs: number,
	labels?: MetricLabels,
): void;
/**
 * Record operation success/failure for error budget
 */
export declare function recordOperation(
	operation: string,
	success: boolean,
	runId: ULID,
	labels?: MetricLabels,
): void;
/**
 * Update provider health score
 */
export declare function updateProviderHealth(
	provider: string,
	health: number,
): void;
/**
 * Update VRAM usage
 */
export declare function updateVRAMUsage(
	provider: string,
	usageRatio: number,
): void;
/**
 * Calculate error budget from metrics (simplified)
 */
export declare function calculateErrorBudget(
	successCount: number,
	totalCount: number,
	slo?: number,
): ErrorBudget;
//# sourceMappingURL=index.d.ts.map
