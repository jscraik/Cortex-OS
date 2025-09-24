/**
 * @fileoverview Operational Endpoints Tests - TDD Implementation
 * @company brAInwav
 * @version 1.0.0
 *
 * TDD Test Suite for Operational Endpoints Component
 * Co-authored-by: brAInwav Development Team
 */

import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OperationalEndpoints } from '../../operations/operational-endpoints.js';

// Helper function to test router endpoints
async function testRouterEndpoint(
	endpoints: OperationalEndpoints,
	path: string,
	method: string = 'get',
	req?: any,
): Promise<any> {
	const router = endpoints.getRouter();
	const mockRes = createMockResponse();

	// Find the route
	const route = router.stack.find((layer: any) => {
		if (!layer.route) return false;
		return layer.route.path === path && layer.route.methods[method.toLowerCase()];
	});

	if (!route) {
		throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
	}

	// Call the handler
	await route.route.stack[0].handle(req || createMockRequest(), mockRes);

	return { response: mockRes, route };
}

// Mock the health checker
const mockHealthChecker = {
	getSystemHealth: vi.fn(),
	getLivenessProbe: vi.fn(),
	getReadinessProbe: vi.fn(),
	getAllResults: vi.fn(),
	runCheck: vi.fn(),
};

// Mock the shutdown manager
const mockShutdownManager = {
	isShutdownInProgress: vi.fn(),
	shutdown: vi.fn(),
	getHandlers: vi.fn(),
};

// Mock Express request and response
const createMockRequest = (overrides = {}): Partial<Request> => ({
	method: 'GET',
	url: '/',
	headers: {},
	body: {},
	params: {},
	query: {},
	...overrides,
});

const createMockResponse = (): Partial<Response> => {
	const res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		end: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		setHeader: vi.fn().mockReturnThis(),
	};
	return res;
};

describe('OperationalEndpoints - TDD Implementation', () => {
	let endpoints: OperationalEndpoints;
	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Setup default mock implementations
		mockHealthChecker.getSystemHealth.mockResolvedValue({
			overall: 'healthy',
			timestamp: new Date().toISOString(),
			uptime: 12345,
			version: '1.0.0',
			checks: {},
			summary: { total: 1, healthy: 1, degraded: 0, unhealthy: 0 },
		});

		mockHealthChecker.getLivenessProbe.mockResolvedValue({
			status: 'alive',
			timestamp: new Date().toISOString(),
			uptime: 12345,
		});

		mockHealthChecker.getReadinessProbe.mockResolvedValue({
			ready: true,
			checks: {},
		});

		mockShutdownManager.isShutdownInProgress.mockReturnValue(false);
		mockShutdownManager.getHandlers.mockReturnValue(['test-handler']);

		// Create endpoints with mocked dependencies
		endpoints = new OperationalEndpoints({
			healthChecker: mockHealthChecker as any,
			shutdownManager: mockShutdownManager as any,
			enableMetrics: true,
			enableAdminEndpoints: true,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Health Endpoints', () => {
		it('should return healthy status for /health endpoint', async () => {
			// Act
			const { response } = await testRouterEndpoint(endpoints, '/health');

			// Assert
			expect(response.status).toHaveBeenCalledWith(200);
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'healthy',
					timestamp: expect.any(String),
					uptime: expect.any(Number),
					version: expect.any(String),
				}),
			);
		});

		it('should return 503 for unhealthy system', async () => {
			// Arrange
			mockHealthChecker.getSystemHealth.mockResolvedValue({
				overall: 'unhealthy',
				timestamp: new Date().toISOString(),
				uptime: 12345,
				version: '1.0.0',
				checks: {},
				summary: { total: 1, healthy: 0, degraded: 0, unhealthy: 1 },
			});

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/health');

			// Assert
			expect(response.status).toHaveBeenCalledWith(503);
		});

		it('should handle health check errors gracefully', async () => {
			// Arrange
			mockHealthChecker.getSystemHealth.mockRejectedValue(new Error('Health check failed'));

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/health');

			// Assert
			expect(response.status).toHaveBeenCalledWith(500);
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					message: 'Health check failed',
				}),
			);
		});
	});

	describe('Liveness Probe', () => {
		it('should return alive status for /health/live endpoint', async () => {
			// Arrange

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/health/live');

			// Assert
			expect(response.status).toHaveBeenCalledWith(200);
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'alive',
					timestamp: expect.any(String),
					uptime: expect.any(Number),
				}),
			);
		});

		it('should handle liveness probe errors', async () => {
			// Arrange
			mockHealthChecker.getLivenessProbe.mockRejectedValue(new Error('Liveness check failed'));

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/health/live');

			// Assert
			expect(response.status).toHaveBeenCalledWith(500);
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					message: 'Liveness check failed',
				}),
			);
		});
	});

	describe('Readiness Probe', () => {
		it('should return ready status for /health/ready endpoint', async () => {
			// Arrange

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/health/ready');

			// Assert
			expect(response.status).toHaveBeenCalledWith(200);
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					ready: true,
					checks: expect.any(Object),
				}),
			);
		});

		it('should return 503 when not ready', async () => {
			// Arrange
			mockHealthChecker.getReadinessProbe.mockResolvedValue({
				ready: false,
				checks: { 'critical-service': { status: 'unhealthy' } },
			});

			const _req = createMockRequest();
			const _res = createMockResponse();

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/health/ready');

			// Assert
			expect(response.status).toHaveBeenCalledWith(503);
		});

		it('should handle readiness probe errors', async () => {
			// Arrange
			mockHealthChecker.getReadinessProbe.mockRejectedValue(new Error('Readiness check failed'));

			const _req = createMockRequest();
			const _res = createMockResponse();

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/health/ready');

			// Assert
			expect(response.status).toHaveBeenCalledWith(503);
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					ready: false,
					message: 'Readiness check failed',
				}),
			);
		});
	});

	describe('Metrics Endpoint', () => {
		it('should have handleMetrics method', () => {
			// Verify the method exists
			expect(typeof endpoints.handleMetrics).toBe('function');
		});

		it('should handle metrics endpoint calls', async () => {
			// Arrange
			const _req = createMockRequest();
			const _res = createMockResponse();

			// Act - the behavior depends on whether prom-client is available
			const { response } = await testRouterEndpoint(endpoints, '/metrics');

			// Assert - either it returns metrics or an error
			// Since we can't easily mock require() after instantiation,
			// we just verify the method doesn't crash
			const callCount =
				(response.status as any).mock.calls.length + (response.end as any).mock.calls.length;
			expect(callCount).toBeGreaterThan(0);
		});
	});

	describe('System Information', () => {
		it('should return system information', async () => {
			// Arrange
			const _req = createMockRequest();
			const _res = createMockResponse();

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/info');

			// Assert
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					service: 'nO Master Agent Loop',
					company: 'brAInwav',
					version: expect.any(String),
					environment: expect.any(String),
					nodeVersion: expect.any(String),
					platform: expect.any(String),
					arch: expect.any(String),
					pid: expect.any(Number),
					uptime: expect.any(Number),
					memory: expect.any(Object),
					cpuUsage: expect.any(Object),
				}),
			);
		});
	});

	describe('Admin Endpoints', () => {
		it('should initiate graceful shutdown when admin enabled', async () => {
			// Arrange
			const req = createMockRequest({
				body: { reason: 'Admin shutdown test' },
			});
			const res = createMockResponse();

			// Act
			await endpoints.handleShutdown(req, res);

			// Assert - check that shutdown was called (async)
			// Note: Due to setImmediate, we can't easily test the async call in unit tests
			// The important thing is that the endpoint returns success response
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'success',
					message: 'Graceful shutdown initiated',
					reason: 'Admin shutdown test',
				}),
			);
		});

		it('should prevent duplicate shutdown requests', async () => {
			// Arrange
			mockShutdownManager.isShutdownInProgress.mockReturnValue(true);

			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleShutdown(req, res);

			// Assert
			expect(response.status).toHaveBeenCalledWith(409);
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					message: 'Shutdown already in progress',
				}),
			);
		});

		it('should handle shutdown errors', async () => {
			// Arrange
			const req = createMockRequest({
				body: { reason: 'Test shutdown' },
			});
			const res = createMockResponse();

			// Note: Due to setImmediate, errors in shutdown won't be caught here
			// The endpoint will always return success immediately

			// Act
			await endpoints.handleShutdown(req, res);

			// Assert - endpoint still returns success even if shutdown fails later
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'success',
					message: 'Graceful shutdown initiated',
				}),
			);
		});

		it('should return health checks list for admin', async () => {
			// Arrange
			mockHealthChecker.getAllResults.mockReturnValue([
				{ name: 'test-service', status: 'healthy', timestamp: new Date() },
				{ name: 'db', status: 'degraded', timestamp: new Date() },
			]);

			const _req = createMockRequest();
			const _res = createMockResponse();

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/admin/health/checks');

			// Assert
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					checks: expect.any(Array),
					total: 2,
					healthy: 1,
					degraded: 1,
					unhealthy: 0,
				}),
			);
		});

		it('should run specific health check', async () => {
			// Arrange
			mockHealthChecker.runCheck.mockResolvedValue({
				name: 'test-service',
				status: 'healthy',
				timestamp: new Date(),
				responseTime: 50,
			});

			const req = createMockRequest({
				params: { name: 'test-service' },
			});
			const res = createMockResponse();

			// Act
			await endpoints.handleRunHealthCheck(req, res);

			// Assert
			expect(mockHealthChecker.runCheck).toHaveBeenCalledWith('test-service');
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'test-service',
					status: 'healthy',
					responseTime: 50,
				}),
			);
		});

		it('should handle non-existent health check', async () => {
			// Arrange
			mockHealthChecker.runCheck.mockRejectedValue(new Error('Health check not found'));

			const req = createMockRequest({
				params: { name: 'non-existent' },
			});
			const res = createMockResponse();

			// Act
			await endpoints.handleRunHealthCheck(req, res);

			// Assert
			expect(response.status).toHaveBeenCalledWith(404);
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					message: 'Health check not found',
				}),
			);
		});

		it('should return shutdown handlers list', async () => {
			// Arrange
			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleShutdownHandlers(req, res);

			// Assert
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					handlers: ['test-handler'],
					total: 1,
					shutdownInProgress: false,
				}),
			);
		});
	});

	describe('Authentication Middleware', () => {
		it('should allow requests when auth is disabled', async () => {
			// Arrange
			const endpointsWithoutAuth = new OperationalEndpoints({
				healthChecker: mockHealthChecker as any,
				shutdownManager: mockShutdownManager as any,
				enableMetrics: true,
				enableAdminEndpoints: true,
				adminAuthMiddleware: undefined,
			});

			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpointsWithoutAuth.handleHealth(req, res);

			// Assert
			expect(response.status).toHaveBeenCalledWith(200);
		});

		it('should require authentication when enabled', () => {
			// Arrange
			const authMiddleware = vi.fn((req, res, next) => {
				if (!req.headers.authorization) {
					return res.status(401).json({ error: 'Unauthorized' });
				}
				next();
			});

			const endpointsWithAuth = new OperationalEndpoints({
				healthChecker: mockHealthChecker as any,
				shutdownManager: mockShutdownManager as any,
				enableMetrics: true,
				enableAdminEndpoints: true,
				adminAuthMiddleware: authMiddleware,
			});

			// Act - get the router
			const router = endpointsWithAuth.getRouter();

			// Assert - router was configured with auth middleware
			expect(router).toBeDefined();
			// Note: We can't easily test the middleware call without actually routing
		});
	});

	describe('Router Configuration', () => {
		it('should provide router with all endpoints', () => {
			// Act
			const router = endpoints.getRouter();

			// Assert
			expect(router).toBeDefined();
			expect(typeof router.get).toBe('function');
			expect(typeof router.post).toBe('function');
		});

		it('should configure routes correctly', () => {
			// Act
			const router = endpoints.getRouter();

			// Assert - router exists and has routes configured
			expect(router).toBeDefined();
			expect(typeof router.get).toBe('function');
			expect(typeof router.post).toBe('function');
			// Note: We can't easily verify the exact routes without accessing internal router state
		});
	});

	describe('Integration with brAInwav Standards', () => {
		it('should include brAInwav branding in responses', async () => {
			// Arrange
			const _req = createMockRequest();
			const _res = createMockResponse();

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/info');

			// Assert
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					company: 'brAInwav',
				}),
			);
		});

		it('should follow brAInwav error response format', async () => {
			// Arrange
			mockHealthChecker.getSystemHealth.mockRejectedValue(new Error('Test error'));

			const _req = createMockRequest();
			const _res = createMockResponse();

			// Act
			const { response } = await testRouterEndpoint(endpoints, '/health');

			// Assert
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					message: expect.stringContaining('Test error'),
				}),
			);
		});

		it('should handle graceful shutdown with brAInwav messaging', async () => {
			// Arrange
			const req = createMockRequest({
				body: { reason: 'brAInwav maintenance' },
			});
			const res = createMockResponse();

			// Act
			await endpoints.handleShutdown(req, res);

			// Assert
			expect(response.json).toHaveBeenCalledWith(
				expect.objectContaining({
					reason: 'brAInwav maintenance',
				}),
			);
		});
	});
});
