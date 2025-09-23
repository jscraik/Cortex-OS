/**
 * MLX Performance Metrics for Monitoring and Observability
 *
 * This module provides comprehensive metrics collection for MLX operations
 * to enable production monitoring, alerting, and performance optimization.
 */

// Simple in-memory metrics store (would use Prometheus client in production)
interface MetricValue {
	value: number;
	labels: Record<string, string>;
	timestamp: number;
}

interface CounterMetric {
	name: string;
	help: string;
	values: MetricValue[];
}

interface GaugeMetric {
	name: string;
	help: string;
	value: number;
	labels: Record<string, string>;
	timestamp: number;
}

interface HistogramMetric {
	name: string;
	help: string;
	buckets: number[];
	observations: { value: number; labels: Record<string, string>; timestamp: number }[];
}

class MLXMetrics {
	private readonly counters: Map<string, CounterMetric> = new Map();
	private readonly gauges: Map<string, GaugeMetric> = new Map();
	private readonly histograms: Map<string, HistogramMetric> = new Map();

	// Counter Operations
	incrementCounter(name: string, labels: Record<string, string> = {}, value = 1) {
		if (!this.counters.has(name)) {
			this.counters.set(name, {
				name,
				help: `Auto-generated counter: ${name}`,
				values: [],
			});
		}

		const counter = this.counters.get(name);
		if (!counter) return;

		counter.values.push({
			value,
			labels,
			timestamp: Date.now(),
		});
	}

	// Gauge Operations
	setGauge(name: string, value: number, labels: Record<string, string> = {}) {
		this.gauges.set(name, {
			name,
			help: `Auto-generated gauge: ${name}`,
			value,
			labels,
			timestamp: Date.now(),
		});
	}

	// Histogram Operations
	observeHistogram(name: string, value: number, labels: Record<string, string> = {}) {
		if (!this.histograms.has(name)) {
			this.histograms.set(name, {
				name,
				help: `Auto-generated histogram: ${name}`,
				buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
				observations: [],
			});
		}

		const histogram = this.histograms.get(name);
		if (!histogram) return;

		histogram.observations.push({
			value,
			labels,
			timestamp: Date.now(),
		});
	}

	// Query Operations
	getCounterValue(name: string, labels: Record<string, string> = {}): number {
		const counter = this.counters.get(name);
		if (!counter) return 0;

		return counter.values
			.filter((v) => this.labelsMatch(v.labels, labels))
			.reduce((sum, v) => sum + v.value, 0);
	}

	getGaugeValue(name: string): number {
		return this.gauges.get(name)?.value ?? 0;
	}

	getHistogramStats(name: string): { count: number; sum: number; avg: number } {
		const histogram = this.histograms.get(name);
		if (!histogram) return { count: 0, sum: 0, avg: 0 };

		const values = histogram.observations.map((o) => o.value);
		const sum = values.reduce((a, b) => a + b, 0);
		const count = values.length;
		const avg = count > 0 ? sum / count : 0;

		return { count, sum, avg };
	}

	// Export for monitoring
	exportMetrics() {
		const now = Date.now();
		const recentOnly = (timestamp: number) => now - timestamp < 300000; // 5 minutes

		return {
			counters: Array.from(this.counters.entries()).map(([name, counter]) => ({
				name,
				help: counter.help,
				total: counter.values.reduce((sum, v) => sum + v.value, 0),
				recent: counter.values.filter((v) => recentOnly(v.timestamp)).length,
			})),
			gauges: Array.from(this.gauges.entries()).map(([name, gauge]) => ({
				name,
				help: gauge.help,
				value: gauge.value,
				labels: gauge.labels,
				timestamp: gauge.timestamp,
			})),
			histograms: Array.from(this.histograms.entries()).map(([name, histogram]) => {
				const stats = this.getHistogramStats(name);
				return {
					name,
					help: histogram.help,
					...stats,
				};
			}),
		};
	}

	private labelsMatch(labels1: Record<string, string>, labels2: Record<string, string>): boolean {
		const keys2 = Object.keys(labels2);
		return keys2.every((key) => labels1[key] === labels2[key]);
	}

	// Reset for testing
	reset() {
		this.counters.clear();
		this.gauges.clear();
		this.histograms.clear();
	}
}

// Global metrics instance
const mlxMetrics = new MLXMetrics();

/**
 * MLX-specific metric recording functions
 */

export const recordRequest = (operation: string, model: string) => {
	mlxMetrics.incrementCounter('mlx_requests_total', { operation, status: 'started', model });
};

export const recordRequestComplete = (
	operation: string,
	model: string,
	durationSeconds: number,
	tokensGenerated?: number,
) => {
	mlxMetrics.incrementCounter('mlx_requests_total', { operation, status: 'completed', model });
	mlxMetrics.observeHistogram('mlx_request_duration_seconds', durationSeconds, {
		operation,
		model,
	});

	if (tokensGenerated) {
		mlxMetrics.incrementCounter('mlx_tokens_generated_total', { model }, tokensGenerated);
		const tokensPerSec = tokensGenerated / durationSeconds;
		mlxMetrics.setGauge('mlx_tokens_per_second', tokensPerSec, { model });
	}
};

export const recordRequestError = (operation: string, model: string, errorType: string) => {
	mlxMetrics.incrementCounter('mlx_requests_total', { operation, status: 'error', model });
	mlxMetrics.incrementCounter('mlx_errors_total', { operation, error_type: errorType, model });
};

export const recordFirstTokenLatency = (model: string, latencySeconds: number) => {
	mlxMetrics.observeHistogram('mlx_first_token_latency_seconds', latencySeconds, { model });
};

export const updateMemoryMetrics = (stats: {
	heapUsed: number;
	gpuUsed: number;
	totalUsed: number;
	pressure: number;
}) => {
	mlxMetrics.setGauge('mlx_memory_usage_bytes_heap', stats.heapUsed);
	mlxMetrics.setGauge('mlx_memory_usage_bytes_gpu', stats.gpuUsed);
	mlxMetrics.setGauge('mlx_memory_usage_bytes_total', stats.totalUsed);
	mlxMetrics.setGauge('mlx_memory_pressure_ratio', stats.pressure);
};

export const updateGpuUtilization = (utilization: number) => {
	mlxMetrics.setGauge('mlx_gpu_utilization_ratio', utilization);
};

export const updateModelCount = (count: number) => {
	mlxMetrics.setGauge('mlx_models_loaded_count', count);
};

export const updateQueueDepth = (depth: number) => {
	mlxMetrics.setGauge('mlx_queue_depth', depth);
};

export const updateCircuitBreakerState = (state: 'closed' | 'open' | 'half-open') => {
	let stateValue: number;
	if (state === 'closed') {
		stateValue = 0;
	} else if (state === 'open') {
		stateValue = 1;
	} else {
		stateValue = 2;
	}
	mlxMetrics.setGauge('mlx_circuit_breaker_state', stateValue);
};

export const recordFailoverEvent = (reason: string) => {
	mlxMetrics.incrementCounter('mlx_failover_events_total', { reason });
};

/**
 * Metrics Query Functions
 */
export const getRequestCount = (operation?: string, status?: string) => {
	const labels: Record<string, string> = {};
	if (operation) labels.operation = operation;
	if (status) labels.status = status;
	return mlxMetrics.getCounterValue('mlx_requests_total', labels);
};

export const getErrorCount = (operation?: string, errorType?: string) => {
	const labels: Record<string, string> = {};
	if (operation) labels.operation = operation;
	if (errorType) labels.error_type = errorType;
	return mlxMetrics.getCounterValue('mlx_errors_total', labels);
};

export const getAverageLatency = () => {
	const { avg } = mlxMetrics.getHistogramStats('mlx_request_duration_seconds');
	return avg;
};

export const getMemoryUsage = () => ({
	heap: mlxMetrics.getGaugeValue('mlx_memory_usage_bytes_heap'),
	gpu: mlxMetrics.getGaugeValue('mlx_memory_usage_bytes_gpu'),
	total: mlxMetrics.getGaugeValue('mlx_memory_usage_bytes_total'),
	pressure: mlxMetrics.getGaugeValue('mlx_memory_pressure_ratio'),
});

/**
 * Export all metrics for monitoring dashboards
 */
export const exportAllMetrics = () => mlxMetrics.exportMetrics();

/**
 * Health Check for Metrics
 */
export const getMetricsHealth = () => {
	const metrics = mlxMetrics.exportMetrics();
	return {
		status: 'healthy',
		counters_count: metrics.counters.length,
		gauges_count: metrics.gauges.length,
		histograms_count: metrics.histograms.length,
		last_updated: new Date().toISOString(),
	};
};

/**
 * Reset metrics (for testing)
 */
export const resetMetrics = () => mlxMetrics.reset();
