/**
 * Metrics collection and monitoring
 */

import { createPinoLogger } from '@voltagent/logger';

const logger = createPinoLogger({ name: 'Metrics' });

export interface MetricData {
	name: string;
	value: number;
	timestamp: number;
	tags?: Record<string, string>;
}

export interface HistogramData {
	name: string;
	value: number;
	timestamp: number;
	tags?: Record<string, string>;
}

// Simple in-memory metrics store
const metricsStore = {
	counters: new Map<string, number>(),
	gauges: new Map<string, number>(),
	histograms: new Map<string, HistogramData[]>(),
};

// Default metrics
const defaultMetrics = {
	requests_total: 0,
	request_errors_total: 0,
	active_connections: 0,
	response_time_seconds: [] as number[],
};

// Initialize default metrics
Object.entries(defaultMetrics).forEach(([key, value]) => {
	if (typeof value === 'number') {
		metricsStore.counters.set(key, value);
	} else if (Array.isArray(value)) {
		metricsStore.histograms.set(key, []);
	}
});

export class MetricsCollector {
	static incrementCounter(
		name: string,
		value = 1,
		tags?: Record<string, string>,
	): void {
		const key = tags
			? `${name}:${Object.entries(tags).sort().join(',')}`
			: name;
		const current = metricsStore.counters.get(key) || 0;
		metricsStore.counters.set(key, current + value);

		logger.debug('Counter incremented', { name, value, tags });
	}

	static setGauge(
		name: string,
		value: number,
		tags?: Record<string, string>,
	): void {
		const key = tags
			? `${name}:${Object.entries(tags).sort().join(',')}`
			: name;
		metricsStore.gauges.set(key, value);

		logger.debug('Gauge set', { name, value, tags });
	}

	static recordHistogram(
		name: string,
		value: number,
		tags?: Record<string, string>,
	): void {
		const key = tags
			? `${name}:${Object.entries(tags).sort().join(',')}`
			: name;
		const histogram = metricsStore.histograms.get(key) || [];
		histogram.push({
			name,
			value,
			timestamp: Date.now(),
			tags,
		});

		// Keep only last 1000 values to prevent memory leak
		if (histogram.length > 1000) {
			histogram.splice(0, histogram.length - 1000);
		}

		metricsStore.histograms.set(key, histogram);

		logger.debug('Histogram recorded', { name, value, tags });
	}

	static getMetrics(): {
		counters: Record<string, number>;
		gauges: Record<string, number>;
		histograms: Record<
			string,
			{ count: number; sum: number; avg: number; min: number; max: number }
		>;
	} {
		const counters: Record<string, number> = {};
		const gauges: Record<string, number> = {};
		const histograms: Record<string, any> = {};

		// Export counters
		metricsStore.counters.forEach((value, key) => {
			counters[key] = value;
		});

		// Export gauges
		metricsStore.gauges.forEach((value, key) => {
			gauges[key] = value;
		});

		// Export histogram statistics
		metricsStore.histograms.forEach((values, key) => {
			if (values.length > 0) {
				const sorted = [...values].map((v) => v.value).sort((a, b) => a - b);
				const sum = sorted.reduce((a, b) => a + b, 0);
				histograms[key] = {
					count: sorted.length,
					sum,
					avg: sum / sorted.length,
					min: sorted[0],
					max: sorted[sorted.length - 1],
				};
			}
		});

		return { counters, gauges, histograms };
	}

	static reset(): void {
		metricsStore.counters.clear();
		metricsStore.gauges.clear();
		metricsStore.histograms.clear();

		// Reinitialize default metrics
		Object.entries(defaultMetrics).forEach(([key, value]) => {
			if (typeof value === 'number') {
				metricsStore.counters.set(key, value);
			} else if (Array.isArray(value)) {
				metricsStore.histograms.set(key, []);
			}
		});
	}
}

// Context interface for monitoring middleware
interface MonitoringContext {
	req: {
		method: string;
		path: string;
	};
	res: {
		status: number;
	};
}

type NextFunction = () => Promise<void>;

// Request/response monitoring middleware
export function createMonitoringMiddleware() {
	return async function monitoring(c: MonitoringContext, next: NextFunction) {
		const startTime = Date.now();
		const method = c.req.method;
		const path = c.req.path;

		try {
			MetricsCollector.incrementCounter('requests_total', 1, { method, path });

			await next();

			const duration = (Date.now() - startTime) / 1000; // Convert to seconds
			const status = c.res.status;

			MetricsCollector.recordHistogram('response_time_seconds', duration, {
				method,
				path,
				status: status.toString(),
			});

			if (status >= 400) {
				MetricsCollector.incrementCounter('request_errors_total', 1, {
					method,
					path,
					status: status.toString(),
				});
			}
		} catch (error) {
			const duration = (Date.now() - startTime) / 1000;
			MetricsCollector.recordHistogram('response_time_seconds', duration, {
				method,
				path,
				status: '500',
			});
			MetricsCollector.incrementCounter('request_errors_total', 1, {
				method,
				path,
				status: '500',
			});
			throw error;
		}
	};
}

// System metrics collector
export class SystemMetrics {
	static collect(): {
		memory: NodeJS.MemoryUsage;
		cpu: NodeJS.CpuUsage;
		uptime: number;
		timestamp: number;
	} {
		return {
			memory: process.memoryUsage(),
			cpu: process.cpuUsage(),
			uptime: process.uptime(),
			timestamp: Date.now(),
		};
	}

	static updateGauges(): void {
		const system = SystemMetrics.collect();

		// Update memory gauges
		MetricsCollector.setGauge('memory_rss_bytes', system.memory.rss);
		MetricsCollector.setGauge(
			'memory_heap_total_bytes',
			system.memory.heapTotal,
		);
		MetricsCollector.setGauge('memory_heap_used_bytes', system.memory.heapUsed);
		MetricsCollector.setGauge(
			'memory_heap_external_bytes',
			system.memory.external,
		);

		// Update uptime gauge
		MetricsCollector.setGauge('process_uptime_seconds', system.uptime);

		// Update active connections (example)
		MetricsCollector.setGauge('active_connections', 1); // This would be tracked by the server
	}
}

// Cleanup old metrics every hour
setInterval(() => {
	const now = Date.now();
	const oneDayAgo = now - 86400000; // 24 hours ago

	// Clean old histogram entries
	for (const [key, histogram] of metricsStore.histograms) {
		const filtered = histogram.filter((entry) => entry.timestamp > oneDayAgo);
		if (filtered.length !== histogram.length) {
			metricsStore.histograms.set(key, filtered);
			logger.debug(`Cleaned old histogram entries for ${key}`);
		}
	}

	// Clean old counters and gauges if needed (they accumulate)
	// This is optional as counters are meant to accumulate
}, 3600000); // Clean every hour

// Start collecting system metrics periodically
if (process.env.NODE_ENV === 'production') {
	setInterval(() => {
		SystemMetrics.updateGauges();
	}, 10000); // Collect every 10 seconds
}
