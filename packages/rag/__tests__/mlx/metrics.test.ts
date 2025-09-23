import { beforeEach, describe, expect, it } from 'vitest';
import {
	exportAllMetrics,
	getAverageLatency,
	getErrorCount,
	getMemoryUsage,
	getMetricsHealth,
	getRequestCount,
	recordFailoverEvent,
	recordFirstTokenLatency,
	recordRequest,
	recordRequestComplete,
	recordRequestError,
	resetMetrics,
	updateCircuitBreakerState,
	updateGpuUtilization,
	updateMemoryMetrics,
	updateModelCount,
	updateQueueDepth,
} from '../../src/lib/mlx/metrics';

describe('MLX Metrics', () => {
	beforeEach(() => {
		resetMetrics();
	});

	describe('Request Metrics', () => {
		it('should record and count requests', () => {
			recordRequest('generate', 'llama3');
			recordRequest('generate', 'llama3');
			recordRequest('embed', 'llama3');

			expect(getRequestCount('generate', 'started')).toBe(2);
			expect(getRequestCount('embed', 'started')).toBe(1);
			expect(getRequestCount()).toBe(3); // Total
		});

		it('should record completed requests with duration and tokens', () => {
			recordRequestComplete('generate', 'llama3', 2.5, 150);
			recordRequestComplete('generate', 'llama3', 1.8, 100);

			expect(getRequestCount('generate', 'completed')).toBe(2);

			const avgLatency = getAverageLatency();
			expect(avgLatency).toBeCloseTo(2.15, 1); // (2.5 + 1.8) / 2
		});

		it('should record request errors', () => {
			recordRequestError('generate', 'llama3', 'timeout');
			recordRequestError('generate', 'llama3', 'memory_error');
			recordRequestError('embed', 'llama3', 'timeout');

			expect(getErrorCount('generate')).toBe(2);
			expect(getErrorCount('embed')).toBe(1);
			expect(getErrorCount()).toBe(3); // Total
		});

		it('should record first token latency', () => {
			recordFirstTokenLatency('llama3', 0.5);
			recordFirstTokenLatency('llama3', 0.3);

			const metrics = exportAllMetrics();
			const latencyHistogram = metrics.histograms.find(
				(h) => h.name === 'mlx_first_token_latency_seconds',
			);

			expect(latencyHistogram).toBeDefined();
			expect(latencyHistogram?.count).toBe(2);
			expect(latencyHistogram?.avg).toBeCloseTo(0.4, 1);
		});
	});

	describe('Resource Metrics', () => {
		it('should update memory metrics', () => {
			const memoryStats = {
				heapUsed: 400000000, // 400MB
				gpuUsed: 800000000, // 800MB
				totalUsed: 1200000000, // 1.2GB
				pressure: 0.6, // 60%
			};

			updateMemoryMetrics(memoryStats);

			const usage = getMemoryUsage();
			expect(usage.heap).toBe(400000000);
			expect(usage.gpu).toBe(800000000);
			expect(usage.total).toBe(1200000000);
			expect(usage.pressure).toBe(0.6);
		});

		it('should update GPU utilization', () => {
			updateGpuUtilization(0.85);

			const metrics = exportAllMetrics();
			const gpuGauge = metrics.gauges.find((g) => g.name === 'mlx_gpu_utilization_ratio');

			expect(gpuGauge).toBeDefined();
			expect(gpuGauge?.value).toBe(0.85);
		});

		it('should track model count', () => {
			updateModelCount(3);

			const metrics = exportAllMetrics();
			const modelGauge = metrics.gauges.find((g) => g.name === 'mlx_models_loaded_count');

			expect(modelGauge).toBeDefined();
			expect(modelGauge?.value).toBe(3);
		});

		it('should track queue depth', () => {
			updateQueueDepth(5);

			const metrics = exportAllMetrics();
			const queueGauge = metrics.gauges.find((g) => g.name === 'mlx_queue_depth');

			expect(queueGauge).toBeDefined();
			expect(queueGauge?.value).toBe(5);
		});
	});

	describe('Circuit Breaker Metrics', () => {
		it('should track circuit breaker states', () => {
			updateCircuitBreakerState('closed');
			let metrics = exportAllMetrics();
			let cbGauge = metrics.gauges.find((g) => g.name === 'mlx_circuit_breaker_state');
			expect(cbGauge?.value).toBe(0);

			updateCircuitBreakerState('open');
			metrics = exportAllMetrics();
			cbGauge = metrics.gauges.find((g) => g.name === 'mlx_circuit_breaker_state');
			expect(cbGauge?.value).toBe(1);

			updateCircuitBreakerState('half-open');
			metrics = exportAllMetrics();
			cbGauge = metrics.gauges.find((g) => g.name === 'mlx_circuit_breaker_state');
			expect(cbGauge?.value).toBe(2);
		});

		it('should record failover events', () => {
			recordFailoverEvent('memory_pressure');
			recordFailoverEvent('timeout');
			recordFailoverEvent('memory_pressure');

			const metrics = exportAllMetrics();
			const failoverCounter = metrics.counters.find((c) => c.name === 'mlx_failover_events_total');

			expect(failoverCounter).toBeDefined();
			expect(failoverCounter?.total).toBe(3);
		});
	});

	describe('Metrics Export', () => {
		it('should export all metrics in structured format', () => {
			// Add some test data
			recordRequest('generate', 'llama3');
			recordRequestComplete('generate', 'llama3', 1.5, 75);
			updateMemoryMetrics({
				heapUsed: 500000000,
				gpuUsed: 1000000000,
				totalUsed: 1500000000,
				pressure: 0.7,
			});
			updateGpuUtilization(0.9);

			const metrics = exportAllMetrics();

			expect(metrics).toHaveProperty('counters');
			expect(metrics).toHaveProperty('gauges');
			expect(metrics).toHaveProperty('histograms');

			expect(metrics.counters.length).toBeGreaterThan(0);
			expect(metrics.gauges.length).toBeGreaterThan(0);
			expect(metrics.histograms.length).toBeGreaterThan(0);

			// Verify counter structure
			const requestCounter = metrics.counters.find((c) => c.name === 'mlx_requests_total');
			expect(requestCounter).toBeDefined();
			expect(requestCounter).toHaveProperty('total');
			expect(requestCounter).toHaveProperty('recent');

			// Verify gauge structure
			const memoryGauge = metrics.gauges.find((g) => g.name === 'mlx_memory_usage_bytes_total');
			expect(memoryGauge).toBeDefined();
			expect(memoryGauge).toHaveProperty('value');
			expect(memoryGauge).toHaveProperty('timestamp');

			// Verify histogram structure
			const durationHistogram = metrics.histograms.find(
				(h) => h.name === 'mlx_request_duration_seconds',
			);
			expect(durationHistogram).toBeDefined();
			expect(durationHistogram).toHaveProperty('count');
			expect(durationHistogram).toHaveProperty('sum');
			expect(durationHistogram).toHaveProperty('avg');
		});

		it('should provide health check information', () => {
			// Add some metrics first
			recordRequest('generate', 'llama3');
			updateGpuUtilization(0.8);

			const health = getMetricsHealth();

			expect(health).toHaveProperty('status', 'healthy');
			expect(health).toHaveProperty('counters_count');
			expect(health).toHaveProperty('gauges_count');
			expect(health).toHaveProperty('histograms_count');
			expect(health).toHaveProperty('last_updated');

			expect(health.counters_count).toBeGreaterThan(0);
			expect(health.gauges_count).toBeGreaterThan(0);
			expect(health.last_updated).toBeDefined();
		});
	});

	describe('Edge Cases', () => {
		it('should handle querying non-existent metrics gracefully', () => {
			expect(getRequestCount('non-existent', 'status')).toBe(0);
			expect(getErrorCount('non-existent')).toBe(0);
			expect(getAverageLatency()).toBe(0);
		});

		it('should handle empty memory usage query', () => {
			const usage = getMemoryUsage();
			expect(usage.heap).toBe(0);
			expect(usage.gpu).toBe(0);
			expect(usage.total).toBe(0);
			expect(usage.pressure).toBe(0);
		});

		it('should reset all metrics', () => {
			// Add some data
			recordRequest('generate', 'llama3');
			updateGpuUtilization(0.5);
			recordFailoverEvent('test');

			// Verify data exists
			expect(getRequestCount()).toBeGreaterThan(0);

			// Reset and verify clean state
			resetMetrics();
			expect(getRequestCount()).toBe(0);
			expect(getErrorCount()).toBe(0);
			expect(getAverageLatency()).toBe(0);

			const metrics = exportAllMetrics();
			expect(metrics.counters).toHaveLength(0);
			expect(metrics.gauges).toHaveLength(0);
			expect(metrics.histograms).toHaveLength(0);
		});
	});

	describe('Performance', () => {
		it('should handle high-frequency metric updates efficiently', () => {
			const start = performance.now();

			// Simulate high-frequency updates
			for (let i = 0; i < 1000; i++) {
				recordRequest('generate', 'llama3');
				if (i % 10 === 0) {
					recordRequestComplete(
						'generate',
						'llama3',
						Math.random() * 2,
						Math.floor(Math.random() * 200),
					);
				}
				if (i % 50 === 0) {
					updateMemoryMetrics({
						heapUsed: Math.random() * 1000000000,
						gpuUsed: Math.random() * 2000000000,
						totalUsed: Math.random() * 3000000000,
						pressure: Math.random(),
					});
				}
			}

			const duration = performance.now() - start;

			// Should complete 1000 updates in reasonable time (< 100ms)
			expect(duration).toBeLessThan(100);

			// Verify data integrity
			expect(getRequestCount('generate', 'started')).toBe(1000);
			expect(getRequestCount('generate', 'completed')).toBe(100);

			const metrics = exportAllMetrics();
			expect(metrics.counters.length).toBeGreaterThan(0);
			expect(metrics.histograms.length).toBeGreaterThan(0);
		});
	});
});
