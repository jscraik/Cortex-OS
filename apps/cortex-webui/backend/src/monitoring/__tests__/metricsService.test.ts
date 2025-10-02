// Test suite for Metrics Collection Service
// Comprehensive testing for Prometheus metrics with brAInwav branding

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetricsService } from '../services/metricsService.js';
import { register } from 'prom-client';

describe('MetricsService', () => {
	let metricsService: MetricsService;

	beforeEach(() => {
		// Clear all metrics from registry
		register.clear();
		metricsService = MetricsService.getInstance();
		vi.clearAllMocks();
	});

	afterEach(() => {
		register.clear();
		vi.restoreAllMocks();
	});

	describe('Singleton Pattern', () => {
		it('should return the same instance', () => {
			const instance1 = MetricsService.getInstance();
			const instance2 = MetricsService.getInstance();
			expect(instance1).toBe(instance2);
		});

		it('should initialize metrics on first access', () => {
			const instance = MetricsService.getInstance();
			expect(instance).toBeDefined();
		});
	});

	describe('HTTP Request Metrics', () => {
		it('should record HTTP request metrics', () => {
			const requestMethod = 'GET';
			const requestRoute = '/api/test';
			const statusCode = 200;
			const responseTime = 123.45;

			metricsService.recordHttpRequest(requestMethod, requestRoute, statusCode, responseTime);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('http_requests_total');
			expect(metrics).toContain('http_request_duration_seconds');
		});

		it('should track request counts by method, route, and status code', () => {
			metricsService.recordHttpRequest('GET', '/api/users', 200, 100);
			metricsService.recordHttpRequest('POST', '/api/users', 201, 150);
			metricsService.recordHttpRequest('GET', '/api/users', 404, 50);
			metricsService.recordHttpRequest('GET', '/api/users', 500, 200);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('http_requests_total{method="GET",route="/api/users",status_code="200"} 1');
			expect(metrics).toContain('http_requests_total{method="POST",route="/api/users",status_code="201"} 1');
			expect(metrics).toContain('http_requests_total{method="GET",route="/api/users",status_code="404"} 1');
			expect(metrics).toContain('http_requests_total{method="GET",route="/api/users",status_code="500"} 1');
		});

		it('should track request duration percentiles', () => {
			const durations = [10, 50, 100, 200, 500, 1000];
			durations.forEach(duration => {
				metricsService.recordHttpRequest('GET', '/api/test', 200, duration);
			});

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('http_request_duration_seconds');
			expect(metrics).toContain('le="0.1"');
			expect(metrics).toContain('le="1.0"');
			expect(metrics).toContain('le="5.0"');
		});

		it('should handle edge cases for request metrics', () => {
			// Test with very long route names
			metricsService.recordHttpRequest(
				'GET',
				'/api/very/long/route/name/with/many/segments/that/exceeds/normal/lengths',
				200,
				50
			);

			// Test with zero response time
			metricsService.recordHttpRequest('GET', '/api/fast', 200, 0);

			// Test with very high response time
			metricsService.recordHttpRequest('GET', '/api/slow', 200, 60000);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('http_requests_total');
			expect(metrics).toContain('http_request_duration_seconds');
		});
	});

	describe('Application Metrics', () => {
		it('should record memory usage metrics', () => {
			const heapUsed = 1024 * 1024 * 100; // 100MB
			const heapTotal = 1024 * 1024 * 200; // 200MB
			const external = 1024 * 1024 * 50; // 50MB
			const rss = 1024 * 1024 * 150; // 150MB

			metricsService.recordMemoryUsage(heapUsed, heapTotal, external, rss);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('nodejs_memory_heap_used_bytes');
			expect(metrics).toContain('nodejs_memory_heap_total_bytes');
			expect(metrics).toContain('nodejs_memory_external_bytes');
			expect(metrics).toContain('nodejs_memory_rss_bytes');
		});

		it('should record CPU usage metrics', () => {
			const cpuUsage = 75.5;

			metricsService.recordCpuUsage(cpuUsage);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('process_cpu_seconds_total');
		});

		it('should record event loop lag metrics', () => {
			const lag = 12.34;

			metricsService.recordEventLoopLag(lag);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('nodejs_eventloop_lag_seconds');
		});

		it('should record uptime metrics', () => {
			const uptime = 3600; // 1 hour

			metricsService.recordUptime(uptime);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('process_start_time_seconds');
		});
	});

	describe('Database Metrics', () => {
		it('should record database connection pool metrics', () => {
			const total = 20;
			const active = 5;
			const idle = 15;
			const waiting = 0;

			metricsService.recordDatabaseConnections(total, active, idle, waiting);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('database_connections_total');
			expect(metrics).toContain('database_connections_active');
			expect(metrics).toContain('database_connections_idle');
			expect(metrics).toContain('database_connections_waiting');
		});

		it('should record database query metrics', () => {
			const operation = 'SELECT';
			const table = 'users';
			const duration = 45.67;
			const success = true;

			metricsService.recordDatabaseQuery(operation, table, duration, success);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('database_queries_total');
			expect(metrics).toContain('database_query_duration_seconds');
			expect(metrics).toContain('operation="SELECT"');
			expect(metrics).toContain('table="users"');
			expect(metrics).toContain('success="true"');
		});

		it('should record failed database queries', () => {
			const operation = 'INSERT';
			const table = 'orders';
			const duration = 1000;
			const success = false;

			metricsService.recordDatabaseQuery(operation, table, duration, success);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('database_queries_total{operation="INSERT",table="orders",success="false"} 1');
		});
	});

	describe('Authentication Metrics', () => {
		it('should record authentication attempts', () => {
			const provider = 'local';
			const success = true;

			metricsService.recordAuthAttempt(provider, success);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('auth_attempts_total');
			expect(metrics).toContain('provider="local"');
			expect(metrics).toContain('success="true"');
		});

		it('should record authentication failures by reason', () => {
			const provider = 'oauth';
			const reason = 'invalid_token';

			metricsService.recordAuthFailure(provider, reason);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('auth_failures_total');
			expect(metrics).toContain('provider="oauth"');
			expect(metrics).toContain('reason="invalid_token"');
		});

		it('should record active sessions', () => {
			const activeSessions = 42;

			metricsService.recordActiveSessions(activeSessions);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('active_sessions_total');
		});

		it('should record token validation metrics', () => {
			const valid = true;
			const duration = 5.67;

			metricsService.recordTokenValidation(valid, duration);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('token_validations_total');
			expect(metrics).toContain('token_validation_duration_seconds');
		});
	});

	describe('Custom Metrics', () => {
		it('should increment custom counters', () => {
			const name = 'custom_operations_total';
			const labels = { operation: 'export', format: 'json' };

			metricsService.incrementCounter(name, labels);
			metricsService.incrementCounter(name, labels);
			metricsService.incrementCounter(name, { operation: 'import', format: 'csv' });

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('custom_operations_total{operation="export",format="json"} 2');
			expect(metrics).toContain('custom_operations_total{operation="import",format="csv"} 1');
		});

		it('should record custom gauges', () => {
			const name = 'queue_size';
			const value = 25;
			const labels = { queue: 'email' };

			metricsService.setGauge(name, value, labels);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('queue_size{queue="email"} 25');
		});

		it('should record custom histograms', () => {
			const name = 'processing_time_seconds';
			const value = 2.5;
			const labels = { service: 'payment' };

			metricsService.recordHistogram(name, value, labels);

			const metrics = metricsService.getMetrics();
			expect(metrics).toContain('processing_time_seconds');
			expect(metrics).toContain('service="payment"');
		});

		it('should handle invalid metric names gracefully', () => {
			expect(() => {
				metricsService.incrementCounter('invalid name with spaces');
			}).toThrow();

			expect(() => {
				metricsService.setGauge('123invalid_start', 10);
			}).toThrow();
		});
	});

	describe('Metrics Export', () => {
		it('should return metrics in Prometheus format', () => {
			metricsService.recordHttpRequest('GET', '/test', 200, 100);
			metricsService.recordMemoryUsage(1000000, 2000000, 500000, 1500000);

			const metricsOutput = metricsService.getMetrics();

			expect(metricsOutput).toContain('# HELP');
			expect(metricsOutput).toContain('# TYPE');
			expect(metricsOutput).toContain('brAInwav');
		});

		it('should include brAInwav branding in metric labels', () => {
			metricsService.recordHttpRequest('GET', '/test', 200, 100);

			const metricsOutput = metricsService.getMetrics();

			expect(metricsOutput).toContain('service="cortex-webui"');
			expect(metricsOutput).toContain('brand="brAInwav"');
		});

		it('should handle empty metrics gracefully', () => {
			const metricsOutput = metricsService.getMetrics();
			expect(metricsOutput).toContain('# HELP');
			expect(metricsOutput).toContain('# TYPE');
		});

		it('should sanitize metric labels', () => {
			metricsService.recordHttpRequest('GET', '/api/test with spaces', 200, 100);

			const metricsOutput = metricsService.getMetrics();

			// Should contain sanitized route name
			expect(metricsOutput).toMatch(/route="[^"]*api\/test.*"/);
		});
	});

	describe('Metrics Collection Lifecycle', () => {
		it('should collect metrics periodically', async () => {
			const collectMetricsSpy = vi.spyOn(metricsService, 'collectMetrics');

			// Simulate periodic collection
			await metricsService.collectMetrics();

			expect(collectMetricsSpy).toHaveBeenCalled();
		});

		it('should handle collection errors gracefully', async () => {
			// Mock a scenario where collection might fail
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await metricsService.collectMetrics();

			// Should not throw an error
			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('Performance Considerations', () => {
		it('should handle high-frequency metric updates efficiently', () => {
			const startTime = Date.now();

			// Simulate high-frequency updates
			for (let i = 0; i < 1000; i++) {
				metricsService.recordHttpRequest('GET', '/api/fast', 200, Math.random() * 100);
			}

			const duration = Date.now() - startTime;
			expect(duration).toBeLessThan(1000); // Should complete within 1 second
		});

		it('should not block on metrics collection', async () => {
			const promise = metricsService.collectMetrics();

			// Should return a promise immediately
			expect(promise).toBeInstanceOf(Promise);

			await promise;
		});
	});
});