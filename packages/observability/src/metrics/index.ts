/**
 * @fileoverview Metrics collection with P50/P95/P99 and error budgets
 */

import { metrics } from "@opentelemetry/api";
import type { ErrorBudget, MetricLabels, ULID } from "../types.js";

const meter = metrics.getMeter("@cortex-os/observability");

// Latency histogram for P50/P95/P99
const latencyHistogram = meter.createHistogram("cortex_latency_ms", {
	description: "Request latency in milliseconds",
	unit: "ms",
});

// Success/failure counter for error budget
const operationCounter = meter.createCounter("cortex_operations_total", {
	description: "Total operations by status",
});

// Provider health gauge
const providerHealthGauge = meter.createGauge("cortex_provider_health", {
	description: "Provider health score (0-1)",
});

// VRAM usage gauge
const vramGauge = meter.createGauge("cortex_vram_usage_ratio", {
	description: "VRAM usage ratio (0-1)",
});

/**
 * Record operation latency
 */
export function recordLatency(
	operation: string,
	latencyMs: number,
	labels?: MetricLabels,
): void {
	latencyHistogram.record(Math.max(0, latencyMs), {
		operation,
		...labels,
	});
}

/**
 * Record operation success/failure for error budget
 */
export function recordOperation(
	operation: string,
	success: boolean,
	runId: ULID,
	labels?: MetricLabels,
): void {
	operationCounter.add(1, {
		operation,
		status: success ? "success" : "error",
		run_id: runId,
		...labels,
	});
}

/**
 * Update provider health score
 */
export function updateProviderHealth(
	provider: string,
	health: number, // 0-1
): void {
	providerHealthGauge.record(Math.max(0, Math.min(1, health)), {
		provider,
	});
}

/**
 * Update VRAM usage
 */
export function updateVRAMUsage(
	provider: string,
	usageRatio: number, // 0-1
): void {
	vramGauge.record(Math.max(0, Math.min(1, usageRatio)), {
		provider,
	});
}

/**
 * Calculate error budget from metrics (simplified)
 */
export function calculateErrorBudget(
	successCount: number,
	totalCount: number,
	slo: number = 0.99,
): ErrorBudget {
	if (totalCount === 0) {
		return {
			slo,
			actual: 1.0,
			budget: 1.0,
			burnRate: 0,
			window: "30d",
		};
	}

	const actual = successCount / totalCount;
	const budget = Math.max(0, (actual - slo) / (1 - slo));
	const burnRate = Math.max(0, (slo - actual) / (1 - slo));

	return {
		slo,
		actual,
		budget,
		burnRate,
		window: "30d",
	};
}
