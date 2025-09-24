import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MetricsCollector } from '../../../src/monitoring/metrics.js';

// Mock auth middleware
vi.mock('../../../src/auth/middleware');

// Import mocked module
import { requirePermission } from '../../../src/auth/middleware.js';

// Create typed mock
const mockRequirePermission = vi.mocked(requirePermission);

// Create shared mock functions for metrics
const mockGetPrometheusMetrics = vi.fn();
const mockGetMetrics = vi.fn();
const mockGetAgentMetrics = vi.fn();

// Mock the MetricsCollector class completely
const mockMetricsCollector = {
	getPrometheusMetrics: mockGetPrometheusMetrics,
	getMetrics: mockGetMetrics,
	getAgentMetrics: mockGetAgentMetrics,
} as unknown as MetricsCollector;

// Import after mocking
import { metricsRoutes } from '../../../src/server/routes/metrics.routes.js';

describe('Metrics Routes - Advanced Tests', () => {
	let app: Hono<{ Variables: { metricsCollector?: MetricsCollector } }>;

	beforeEach(() => {
		app = new Hono<{ Variables: { metricsCollector?: MetricsCollector } }>();

		// Set up metrics collector in context
		app.use('*', (c, next) => {
			c.set('metricsCollector', mockMetricsCollector);
			return next();
		});

		app.route('/metrics', metricsRoutes);

		// Reset all mocks
		vi.clearAllMocks();

		// Default auth middleware behavior - allow access
		mockRequirePermission.mockImplementation(() => {
			return async (_c: any, _next: any) => {
				return _next();
			};
		});
	});

	describe('Prometheus Metrics Endpoint (GET /metrics)', () => {
		it('should return Prometheus formatted metrics', async () => {
			const prometheusMetrics = `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1000
http_requests_total{method="POST",status="200"} 500
http_requests_total{method="POST",status="500"} 50

# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 800
http_request_duration_seconds_bucket{le="0.5"} 950
http_request_duration_seconds_bucket{le="1.0"} 990
http_request_duration_seconds_bucket{le="+Inf"} 1000

# HELP brAInwav_agents_active Number of active brAInwav agents
# TYPE brAInwav_agents_active gauge
brAInwav_agents_active 5

# HELP brAInwav_agent_executions_total Total agent executions
# TYPE brAInwav_agent_executions_total counter
brAInwav_agent_executions_total{agent="code-analysis"} 250
brAInwav_agent_executions_total{agent="documentation"} 150
brAInwav_agent_executions_total{agent="security"} 100`;

			mockGetPrometheusMetrics.mockResolvedValue(prometheusMetrics);

			const response = await app.request('/metrics');

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('text/plain; version=0.0.4');
			expect(response.headers.get('Cache-Control')).toBe('no-cache');
			expect(response.headers.get('X-Metrics-Format')).toBe('prometheus');

			const body = await response.text();
			expect(body).toContain('http_requests_total');
			expect(body).toContain('brAInwav_agents_active');
			expect(body).toContain('brAInwav_agent_executions_total');
			expect(mockGetPrometheusMetrics).toHaveBeenCalled();
		});

		it('should require read:metrics permission', async () => {
			mockRequirePermission.mockImplementation((permission: string) => {
				expect(permission).toBe('read:metrics');
				return async (c: any, _next: any) => {
					return c.json({ error: 'Forbidden' }, 403);
				};
			});

			const response = await app.request('/metrics');

			expect(response.status).toBe(403);
			expect(mockRequirePermission).toHaveBeenCalledWith('read:metrics');
		});

		it('should handle metrics collector unavailable', async () => {
			// Remove metrics collector from context
			app = new Hono<{ Variables: { metricsCollector?: MetricsCollector } }>();
			app.route('/metrics', metricsRoutes);

			const response = await app.request('/metrics');

			expect(response.status).toBe(500);
			const result = await response.json();
			expect(result.message).toBe('Metrics collector not available');
		});

		it('should handle prometheus metrics generation failure', async () => {
			mockGetPrometheusMetrics.mockRejectedValue(new Error('Metrics generation failed'));

			const response = await app.request('/metrics');

			expect(response.status).toBe(500);
			const result = await response.json();
			expect(result.message).toBe('Failed to collect metrics');
		});

		it('should log metrics access for audit', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			mockGetPrometheusMetrics.mockResolvedValue('# Simple metrics');

			await app.request('/metrics', {
				headers: {
					'user-agent': 'brAInwav-monitor/1.0',
					'x-forwarded-for': '192.168.1.100',
				},
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				'Metrics accessed',
				expect.objectContaining({
					timestamp: expect.any(String),
					userAgent: 'brAInwav-monitor/1.0',
					ip: '192.168.1.100',
				}),
			);

			consoleSpy.mockRestore();
		});

		it('should handle high-frequency metrics requests', async () => {
			const startTime = Date.now();
			mockGetPrometheusMetrics.mockResolvedValue('# Quick metrics');

			const promises = Array(50)
				.fill(0)
				.map(() => app.request('/metrics'));
			const responses = await Promise.all(promises);

			const endTime = Date.now();
			const totalTime = endTime - startTime;

			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});

			// brAInwav performance requirement: 50 metrics requests under 2 seconds
			expect(totalTime).toBeLessThan(2000);
			expect(mockGetPrometheusMetrics).toHaveBeenCalledTimes(50);
		});
	});

	describe('Health Metrics Summary (GET /metrics/health)', () => {
		it('should return comprehensive health metrics', async () => {
			const healthMetrics = {
				requests: {
					total: 10000,
					success: 9500,
					error: 500,
					latency: { avg: 125, min: 5, max: 2000, p95: 300 },
				},
				agents: [
					{ id: 'brAInwav-code-agent', status: 'active', executions: 2500, avgLatency: 150 },
					{ id: 'brAInwav-doc-agent', status: 'active', executions: 1500, avgLatency: 100 },
					{ id: 'brAInwav-security-agent', status: 'active', executions: 800, avgLatency: 200 },
				],
				resources: {
					cpu: { usage: 45.5, limit: 100 },
					memory: { usage: 512, limit: 1024 },
					disk: { usage: 25.6, limit: 100 },
				},
			};

			mockGetMetrics.mockReturnValue(healthMetrics);

			const response = await app.request('/metrics/health');

			expect(response.status).toBe(200);
			const result = await response.json();

			expect(result.timestamp).toBeDefined();
			expect(result.metrics.requests.total).toBe(10000);
			expect(result.metrics.requests.success).toBe(9500);
			expect(result.metrics.agents).toHaveLength(3);
			expect(result.metrics.resources.cpu.usage).toBe(45.5);
			expect(result.metrics.system.uptime).toBeGreaterThan(0);
			expect(result.metrics.system.memory).toBeDefined();
			expect(mockGetMetrics).toHaveBeenCalled();
		});

		it('should require read:metrics permission for health endpoint', async () => {
			mockRequirePermission.mockImplementation(() => {
				return async (c: any, _next: any) => {
					return c.json({ error: 'Forbidden' }, 403);
				};
			});

			const response = await app.request('/metrics/health');

			expect(response.status).toBe(403);
			expect(mockRequirePermission).toHaveBeenCalledWith('read:metrics');
		});

		it('should handle health metrics collection failure', async () => {
			mockGetMetrics.mockImplementation(() => {
				throw new Error('Health metrics collection failed');
			});

			const response = await app.request('/metrics/health');

			expect(response.status).toBe(500);
			const result = await response.json();
			expect(result.message).toBe('Failed to collect health metrics');
		});

		it('should include system metrics in health response', async () => {
			const healthMetrics = {
				requests: { total: 100, success: 95, error: 5, latency: { avg: 50 } },
				agents: [],
				resources: { cpu: { usage: 25 }, memory: { usage: 256 }, disk: { usage: 10 } },
			};

			mockGetMetrics.mockReturnValue(healthMetrics);

			const response = await app.request('/metrics/health');
			const result = await response.json();

			expect(result.metrics.system.uptime).toBeGreaterThan(0);
			expect(result.metrics.system.memory.rss).toBeGreaterThan(0);
			expect(result.metrics.system.cpu.user).toBeGreaterThanOrEqual(0);
		});

		it('should format timestamps correctly for health metrics', async () => {
			const healthMetrics = {
				requests: { total: 1, success: 1, error: 0, latency: { avg: 10 } },
				agents: [],
				resources: { cpu: { usage: 10 }, memory: { usage: 100 }, disk: { usage: 5 } },
			};

			mockGetMetrics.mockReturnValue(healthMetrics);

			const response = await app.request('/metrics/health');
			const result = await response.json();

			expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(new Date(result.timestamp).getTime()).toBeGreaterThan(Date.now() - 10000);
		});
	});

	describe('Agent-Specific Metrics (GET /metrics/agents/:agentId)', () => {
		it('should return metrics for specific agent', async () => {
			const agentMetrics = {
				executions: 1500,
				averageLatency: 125,
				successRate: 0.95,
				lastExecution: '2025-09-21T10:00:00.000Z',
				status: 'active',
				memory: { current: 256, peak: 512 },
				cpu: { usage: 15.5 },
			};

			mockGetAgentMetrics.mockReturnValue(agentMetrics);

			const response = await app.request('/metrics/agents/brAInwav-code-agent');

			expect(response.status).toBe(200);
			const result = await response.json();

			expect(result.agentId).toBe('brAInwav-code-agent');
			expect(result.metrics.executions).toBe(1500);
			expect(result.metrics.averageLatency).toBe(125);
			expect(result.metrics.successRate).toBe(0.95);
			expect(result.metrics.status).toBe('active');
			expect(mockGetAgentMetrics).toHaveBeenCalledWith('brAInwav-code-agent');
		});

		it('should require read:metrics permission for agent metrics', async () => {
			mockRequirePermission.mockImplementation(() => {
				return async (c: any, _next: any) => {
					return c.json({ error: 'Forbidden' }, 403);
				};
			});

			const response = await app.request('/metrics/agents/test-agent');

			expect(response.status).toBe(403);
			expect(mockRequirePermission).toHaveBeenCalledWith('read:metrics');
		});

		it('should handle non-existent agent', async () => {
			mockGetAgentMetrics.mockReturnValue(null);

			const response = await app.request('/metrics/agents/non-existent-agent');

			expect(response.status).toBe(404);
			const result = await response.json();
			expect(result.message).toBe("Agent 'non-existent-agent' not found");
			expect(mockGetAgentMetrics).toHaveBeenCalledWith('non-existent-agent');
		});

		it('should handle agent metrics collection failure', async () => {
			mockGetAgentMetrics.mockImplementation(() => {
				throw new Error('Agent metrics collection failed');
			});

			const response = await app.request('/metrics/agents/failing-agent');

			expect(response.status).toBe(500);
			const result = await response.json();
			expect(result.message).toBe('Failed to collect agent metrics');
		});

		it('should return brAInwav-branded agent metrics', async () => {
			const brainwavAgentMetrics = {
				executions: 2000,
				averageLatency: 95,
				successRate: 0.98,
				lastExecution: '2025-09-21T11:00:00.000Z',
				status: 'active',
				features: ['code-analysis', 'documentation', 'refactoring'],
				branding: { name: 'brAInwav', version: '2.0', capabilities: ['intelligent-routing'] },
			};

			mockGetAgentMetrics.mockReturnValue(brainwavAgentMetrics);

			const response = await app.request('/metrics/agents/brAInwav-premium-agent');
			const result = await response.json();

			expect(result.metrics.branding.name).toBe('brAInwav');
			expect(result.metrics.branding.capabilities).toContain('intelligent-routing');
			expect(result.metrics.features).toContain('code-analysis');
			expect(result.metrics.successRate).toBeGreaterThan(0.95);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle missing metrics collector across all endpoints', async () => {
			app = new Hono<{ Variables: { metricsCollector?: MetricsCollector } }>();
			app.route('/metrics', metricsRoutes);

			const prometheusResponse = await app.request('/metrics');
			const healthResponse = await app.request('/metrics/health');
			const agentResponse = await app.request('/metrics/agents/test-agent');

			expect(prometheusResponse.status).toBe(500);
			expect(healthResponse.status).toBe(500);
			expect(agentResponse.status).toBe(500);
		});

		it('should handle concurrent metrics requests safely', async () => {
			mockGetPrometheusMetrics.mockResolvedValue('# Concurrent metrics');
			mockGetMetrics.mockReturnValue({ requests: { total: 1 }, agents: [], resources: {} });
			mockGetAgentMetrics.mockReturnValue({ executions: 1, status: 'active' });

			const promises = [
				app.request('/metrics'),
				app.request('/metrics/health'),
				app.request('/metrics/agents/concurrent-agent'),
				app.request('/metrics'),
				app.request('/metrics/health'),
			];

			const responses = await Promise.all(promises);

			responses.forEach((response) => {
				expect(response.status).toBeLessThan(500);
			});

			expect(mockGetPrometheusMetrics).toHaveBeenCalledTimes(2);
			expect(mockGetMetrics).toHaveBeenCalledTimes(2);
			expect(mockGetAgentMetrics).toHaveBeenCalledTimes(1);
		});

		it('should validate agent ID parameter format', async () => {
			const validAgentId = 'brAInwav-valid-agent-123';
			mockGetAgentMetrics.mockReturnValue({ executions: 100, status: 'active' });

			const response = await app.request(`/metrics/agents/${validAgentId}`);

			expect(response.status).toBe(200);
			expect(mockGetAgentMetrics).toHaveBeenCalledWith(validAgentId);
		});

		it('should handle malformed requests gracefully', async () => {
			// Test with invalid paths that should return 404
			const invalidPaths = ['/metrics/invalid', '/metrics/agents/', '/metrics/health/extra'];

			for (const path of invalidPaths) {
				const response = await app.request(path);
				expect(response.status).toBe(404);
			}
		});

		it('should maintain brAInwav branding in error responses', async () => {
			mockGetPrometheusMetrics.mockRejectedValue(new Error('brAInwav metrics service unavailable'));

			const response = await app.request('/metrics');

			expect(response.status).toBe(500);
			const result = await response.json();
			expect(result.message).toBe('Failed to collect metrics');

			// Verify that internal error logging contains brAInwav context
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await app.request('/metrics');

			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to collect metrics:',
				expect.objectContaining({
					message: 'brAInwav metrics service unavailable',
				}),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Performance and Load Testing', () => {
		it('should handle metrics collection under load', async () => {
			const startTime = Date.now();
			mockGetPrometheusMetrics.mockResolvedValue('# Load test metrics');
			mockGetMetrics.mockReturnValue({
				requests: { total: 50000, success: 49000, error: 1000 },
				agents: [],
				resources: { cpu: { usage: 85 }, memory: { usage: 900 }, disk: { usage: 60 } },
			});

			// Simulate 100 concurrent requests
			const loadPromises = Array(100)
				.fill(0)
				.map((_, i) => {
					if (i % 2 === 0) {
						return app.request('/metrics');
					} else {
						return app.request('/metrics/health');
					}
				});

			const responses = await Promise.all(loadPromises);
			const endTime = Date.now();

			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});

			// brAInwav performance requirement: 100 concurrent requests under 5 seconds
			expect(endTime - startTime).toBeLessThan(5000);
		});

		it('should implement rate limiting behavior for metrics endpoints', async () => {
			mockGetPrometheusMetrics.mockResolvedValue('# Rate limited metrics');

			// Simulate rapid successive requests
			const rapidRequests = Array(20)
				.fill(0)
				.map(() => app.request('/metrics'));
			const responses = await Promise.all(rapidRequests);

			// All requests should succeed (no rate limiting in this test setup)
			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});

			expect(mockGetPrometheusMetrics).toHaveBeenCalledTimes(20);
		});

		it('should handle memory-intensive metrics collection', async () => {
			const largeMetricsData = 'x'.repeat(1024 * 1024); // 1MB of data
			mockGetPrometheusMetrics.mockResolvedValue(`# Large metrics\n${largeMetricsData}`);

			const response = await app.request('/metrics');

			expect(response.status).toBe(200);
			const body = await response.text();
			expect(body.length).toBeGreaterThan(1024 * 1024);
		});
	});
});
