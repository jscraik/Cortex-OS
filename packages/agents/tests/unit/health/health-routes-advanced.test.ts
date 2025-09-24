import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the HealthHandler module
vi.mock('../../../src/server/handlers/health.handler');

// Import after mocking to get the mocked version
import { HealthHandler } from '../../../src/server/handlers/health.handler.js';

// Create typed mock for HealthHandler
const MockedHealthHandler = vi.mocked(HealthHandler);

// Create shared mock functions
const mockGetHealth = vi.fn();
const mockGetComponentHealth = vi.fn();
const mockGetMetricsCollector = vi.fn();
const mockGetHealthMonitor = vi.fn();

// Setup the mock implementation
MockedHealthHandler.mockImplementation(
	() =>
		({
			getHealth: mockGetHealth,
			getComponentHealth: mockGetComponentHealth,
			getMetricsCollector: mockGetMetricsCollector,
			getHealthMonitor: mockGetHealthMonitor,
		}) as any,
);

// Import after mocking
import { healthRoutes } from '../../../src/server/routes/health.routes.js';

describe('Health Routes - Advanced Tests', () => {
	let app: Hono;

	beforeEach(() => {
		app = new Hono();
		app.route('/health', healthRoutes);

		// Reset all mocks
		vi.clearAllMocks();
	});

	describe('Basic Health Endpoint (GET /health)', () => {
		it('should return healthy status when all systems operational', async () => {
			const healthyResponse = {
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 3600,
				version: '0.1.0',
				checks: {
					database: {
						name: 'database',
						status: 'healthy',
						timestamp: '2025-09-21T20:00:00.000Z',
						details: { connectionPool: 'active', latency: '5ms' },
					},
					langgraph: {
						name: 'langgraph',
						status: 'healthy',
						timestamp: '2025-09-21T20:00:00.000Z',
						details: { workflows: 'active', nodes: 42 },
					},
				},
				metrics: {
					requests: {
						total: 1000,
						success: 950,
						error: 50,
						latency: { avg: 120, min: 10, max: 500, p95: 200 },
					},
					agents: 5,
					activeSessions: 12,
				},
			};

			mockGetHealth.mockResolvedValue(healthyResponse);

			const response = await app.request('/health');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.status).toBe('healthy');
			expect(result.uptime).toBe(3600);
			expect(result.version).toBe('0.1.0');
			expect(result.checks.database.status).toBe('healthy');
			expect(result.checks.langgraph.status).toBe('healthy');
			expect(result.metrics.requests.total).toBe(1000);
			expect(result.metrics.agents).toBe(5);
		});

		it('should return unhealthy status when components failing', async () => {
			const unhealthyResponse = {
				status: 'unhealthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 3600,
				version: '0.1.0',
				checks: {
					database: {
						name: 'database',
						status: 'unhealthy',
						timestamp: '2025-09-21T20:00:00.000Z',
						details: { error: 'Connection timeout', latency: 'timeout' },
					},
					langgraph: {
						name: 'langgraph',
						status: 'healthy',
						timestamp: '2025-09-21T20:00:00.000Z',
						details: { workflows: 'active', nodes: 42 },
					},
				},
			};

			mockGetHealth.mockResolvedValue(unhealthyResponse);

			const response = await app.request('/health');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.status).toBe('unhealthy');
			expect(result.checks.database.status).toBe('unhealthy');
			expect(result.checks.database.details.error).toBe('Connection timeout');
		});

		it('should return degraded status for partial failures', async () => {
			const degradedResponse = {
				status: 'degraded',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 3600,
				version: '0.1.0',
				checks: {
					database: {
						name: 'database',
						status: 'healthy',
						timestamp: '2025-09-21T20:00:00.000Z',
						details: { connectionPool: 'active', latency: '5ms' },
					},
					langgraph: {
						name: 'langgraph',
						status: 'degraded',
						timestamp: '2025-09-21T20:00:00.000Z',
						details: { workflows: 'limited', nodes: 20, warning: 'High memory usage' },
					},
				},
			};

			mockGetHealth.mockResolvedValue(degradedResponse);

			const response = await app.request('/health');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.status).toBe('degraded');
			expect(result.checks.langgraph.status).toBe('degraded');
			expect(result.checks.langgraph.details.warning).toBe('High memory usage');
		});

		it('should handle health check timeout scenarios', async () => {
			const timeoutResponse = {
				status: 'unhealthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 3600,
				version: '0.1.0',
				checks: {
					system: {
						name: 'system',
						status: 'unhealthy',
						timestamp: '2025-09-21T20:00:00.000Z',
						details: {
							message: 'Health check failed',
							error: 'Request timeout',
						},
					},
				},
			};

			mockGetHealth.mockResolvedValue(timeoutResponse);

			const response = await app.request('/health');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.status).toBe('unhealthy');
			expect(result.checks.system.details.error).toBe('Request timeout');
		});

		it('should include brAInwav system identification', async () => {
			const brAInwavResponse = {
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 3600,
				version: '0.1.0',
				system: 'brAInwav Cortex-OS Agent System',
				checks: {
					brAInwav_agents: {
						name: 'brAInwav_agents',
						status: 'healthy',
						timestamp: '2025-09-21T20:00:00.000Z',
						details: { branding: 'brAInwav', service: 'agent-coordination' },
					},
				},
			};

			mockGetHealth.mockResolvedValue(brAInwavResponse);

			const response = await app.request('/health');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.system).toContain('brAInwav');
			expect(result.checks.brAInwav_agents.details.branding).toBe('brAInwav');
		});
	});

	describe('Component-Specific Health (GET /health/components/:componentName)', () => {
		it('should return specific component health for database', async () => {
			const databaseHealth = {
				name: 'database',
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				details: {
					connectionPool: {
						active: 10,
						idle: 5,
						total: 15,
					},
					queryPerformance: {
						avgResponseTime: 25,
						slowQueries: 0,
					},
					storage: {
						usedSpace: '2.5GB',
						freeSpace: '7.5GB',
					},
				},
			};

			mockGetComponentHealth.mockResolvedValue(databaseHealth);

			const response = await app.request('/health/components/database');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.name).toBe('database');
			expect(result.status).toBe('healthy');
			expect(result.details.connectionPool.active).toBe(10);
			expect(result.details.queryPerformance.avgResponseTime).toBe(25);
		});

		it('should return specific component health for langgraph', async () => {
			const langgraphHealth = {
				name: 'langgraph',
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				details: {
					workflows: {
						active: 5,
						completed: 1000,
						failed: 2,
					},
					nodes: {
						total: 42,
						healthy: 40,
						degraded: 2,
					},
					memory: {
						used: '256MB',
						limit: '1GB',
					},
				},
			};

			mockGetComponentHealth.mockResolvedValue(langgraphHealth);

			const response = await app.request('/health/components/langgraph');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.name).toBe('langgraph');
			expect(result.details.workflows.active).toBe(5);
			expect(result.details.nodes.healthy).toBe(40);
		});

		it('should return 404 for non-existent components', async () => {
			mockGetComponentHealth.mockResolvedValue({
				error: {
					code: 404,
					message: "Component 'nonexistent' not found",
				},
			});

			const response = await app.request('/health/components/nonexistent');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.error.code).toBe(404);
			expect(result.error.message).toContain('not found');
		});

		it('should handle component health check failures', async () => {
			const failedComponentHealth = {
				name: 'external-service',
				status: 'unhealthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				details: {
					error: 'Service unavailable',
					lastSuccessfulCheck: '2025-09-21T19:45:00.000Z',
					retryCount: 3,
				},
			};

			mockGetComponentHealth.mockResolvedValue(failedComponentHealth);

			const response = await app.request('/health/components/external-service');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.status).toBe('unhealthy');
			expect(result.details.error).toBe('Service unavailable');
			expect(result.details.retryCount).toBe(3);
		});
	});

	describe('Detailed Health with Metrics (GET /health/detailed)', () => {
		it('should return comprehensive health and metrics data', async () => {
			const detailedHealth = {
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 3600,
				version: '0.1.0',
				checks: {
					database: { name: 'database', status: 'healthy', timestamp: '2025-09-21T20:00:00.000Z' },
					langgraph: {
						name: 'langgraph',
						status: 'healthy',
						timestamp: '2025-09-21T20:00:00.000Z',
					},
				},
			};

			const mockMetricsCollector = {
				getMetrics: vi.fn().mockReturnValue({
					requests: { total: 1000, success: 950, error: 50, latency: { avg: 120 } },
					agents: [
						{ id: 'agent1', activeSessions: 5 },
						{ id: 'agent2', activeSessions: 7 },
					],
					resources: { cpu: 45, memory: 60 },
				}),
			};

			mockGetHealth.mockResolvedValue(detailedHealth);
			mockGetMetricsCollector.mockReturnValue(mockMetricsCollector);

			const response = await app.request('/health/detailed');

			expect(response.status).toBe(200);
			const result = await response.json();

			expect(result.health.status).toBe('healthy');
			expect(result.metrics.summary.totalRequests).toBe(1000);
			expect(result.metrics.summary.successRate).toBe(95); // 950/1000 * 100
			expect(result.metrics.summary.avgLatency).toBe(120);
			expect(result.metrics.summary.activeAgents).toBe(2);
			expect(result.metrics.agents).toHaveLength(2);
			expect(result.timestamp).toBeDefined();
		});

		it('should handle zero requests in success rate calculation', async () => {
			const healthWithZeroRequests = {
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 60,
				version: '0.1.0',
				checks: {},
			};

			const mockMetricsCollector = {
				getMetrics: vi.fn().mockReturnValue({
					requests: { total: 0, success: 0, error: 0, latency: { avg: 0 } },
					agents: [],
					resources: { cpu: 5, memory: 10 },
				}),
			};

			mockGetHealth.mockResolvedValue(healthWithZeroRequests);
			mockGetMetricsCollector.mockReturnValue(mockMetricsCollector);

			const response = await app.request('/health/detailed');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.metrics.summary.successRate).toBe(0);
			expect(result.metrics.summary.totalRequests).toBe(0);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle health handler failures gracefully', async () => {
			mockGetHealth.mockRejectedValue(new Error('Health check service unavailable'));

			const response = await app.request('/health');

			// Should still return a response, but with error status
			expect(response.status).toBe(200); // Health endpoints should not return 5xx
			expect(mockGetHealth).toHaveBeenCalled();
		});

		it('should handle component health handler failures', async () => {
			mockGetComponentHealth.mockRejectedValue(new Error('Component check failed'));

			const response = await app.request('/health/components/database');

			expect(response.status).toBe(200);
			expect(mockGetComponentHealth).toHaveBeenCalledWith('database');
		});

		it('should handle concurrent health checks', async () => {
			const healthResponse = {
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 3600,
				version: '0.1.0',
				checks: {},
			};

			mockGetHealth.mockResolvedValue(healthResponse);

			const promises = Array(10)
				.fill(0)
				.map(() => app.request('/health'));
			const responses = await Promise.all(promises);

			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});

			expect(mockGetHealth).toHaveBeenCalledTimes(10);
		});

		it('should handle health checks under high load', async () => {
			const startTime = Date.now();

			const healthResponse = {
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 3600,
				version: '0.1.0',
				checks: {},
			};

			mockGetHealth.mockResolvedValue(healthResponse);

			const promises = Array(100)
				.fill(0)
				.map(() => app.request('/health'));
			const responses = await Promise.all(promises);

			const endTime = Date.now();
			const totalTime = endTime - startTime;

			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});

			// brAInwav performance requirement: 100 health checks under 1 second
			expect(totalTime).toBeLessThan(1000);
			expect(mockGetHealth).toHaveBeenCalledTimes(100);
		});
	});

	describe('Response Format Validation', () => {
		it('should return valid health response schema', async () => {
			const validHealthResponse = {
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 3600,
				version: '0.1.0',
				checks: {
					test_component: {
						name: 'test_component',
						status: 'healthy',
						timestamp: '2025-09-21T20:00:00.000Z',
					},
				},
				metrics: {
					requests: {
						total: 100,
						success: 95,
						error: 5,
						latency: { avg: 50, min: 10, max: 200, p95: 100 },
					},
					agents: 3,
					activeSessions: 8,
				},
			};

			mockGetHealth.mockResolvedValue(validHealthResponse);

			const response = await app.request('/health');

			expect(response.status).toBe(200);
			const result = await response.json();

			// Validate response structure
			expect(result).toHaveProperty('status');
			expect(result).toHaveProperty('timestamp');
			expect(result).toHaveProperty('uptime');
			expect(result).toHaveProperty('version');
			expect(['healthy', 'unhealthy', 'degraded']).toContain(result.status);
			expect(typeof result.uptime).toBe('number');
			expect(typeof result.timestamp).toBe('string');
		});

		it('should handle invalid health response gracefully', async () => {
			// Simulate handler returning invalid data
			mockGetHealth.mockResolvedValue({
				invalidField: 'should not be here',
				status: 'invalid-status',
			});

			const response = await app.request('/health');

			// Should still return 200 even with invalid data
			expect(response.status).toBe(200);
			expect(mockGetHealth).toHaveBeenCalled();
		});
	});

	describe('brAInwav Production Requirements', () => {
		it('should meet brAInwav uptime monitoring standards', async () => {
			const brAInwavHealth = {
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 86400, // 24 hours
				version: '0.1.0',
				brAInwav: {
					deployment: 'production',
					region: 'us-east-1',
					cluster: 'brAInwav-agents-prod',
				},
				checks: {
					brAInwav_coordination: {
						name: 'brAInwav_coordination',
						status: 'healthy',
						timestamp: '2025-09-21T20:00:00.000Z',
						details: { agents: 'coordinating', performance: 'optimal' },
					},
				},
			};

			mockGetHealth.mockResolvedValue(brAInwavHealth);

			const response = await app.request('/health');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.brAInwav.deployment).toBe('production');
			expect(result.checks.brAInwav_coordination.status).toBe('healthy');
		});

		it('should support brAInwav observability requirements', async () => {
			const observabilityHealth = {
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				uptime: 3600,
				version: '0.1.0',
				observability: {
					tracing: 'enabled',
					metrics: 'prometheus',
					logging: 'structured',
					brAInwav_audit: 'compliant',
				},
			};

			mockGetHealth.mockResolvedValue(observabilityHealth);

			const response = await app.request('/health');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.observability.brAInwav_audit).toBe('compliant');
			expect(result.observability.tracing).toBe('enabled');
		});
	});
});
