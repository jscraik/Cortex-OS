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
import type { OperationalEndpointsConfig } from '../../operations/operational-endpoints.js';
import { createOperationalEndpoints } from '../../operations/operational-endpoints.js';

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
	let config: OperationalEndpointsConfig;
	let endpoints: unknown;
	beforeEach(() => {
		config = {
			enableAdmin: true,
			adminAuth: undefined,
		};

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

		endpoints = createOperationalEndpoints(config);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Health Endpoints', () => {
		it('should return healthy status for /health endpoint', async () => {
			// Arrange
			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleHealth(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
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

			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleHealth(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(503);
		});

		it('should handle health check errors gracefully', async () => {
			// Arrange
			mockHealthChecker.getSystemHealth.mockRejectedValue(new Error('Health check failed'));

			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleHealth(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith(
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
			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleLiveness(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
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

			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleLiveness(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith(
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
			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleReadiness(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
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

			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleReadiness(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(503);
		});

		it('should handle readiness probe errors', async () => {
			// Arrange
			mockHealthChecker.getReadinessProbe.mockRejectedValue(new Error('Readiness check failed'));

			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleReadiness(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(503);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					ready: false,
					message: 'Readiness check failed',
				}),
			);
		});
	});

	describe('Metrics Endpoint', () => {
		it('should return Prometheus metrics', async () => {
			// Arrange
			const req = createMockRequest();
			const res = createMockResponse();

			// Mock prometheus register
			const mockMetrics =
				'# HELP test_metric A test metric\n# TYPE test_metric counter\ntest_metric 1\n';
			vi.doMock('prom-client', () => ({
				register: {
					metrics: vi.fn().mockResolvedValue(mockMetrics),
					contentType: 'text/plain',
				},
			}));

			// Act
			await endpoints.handleMetrics(req, res);

			// Assert
			expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/plain');
			expect(res.end).toHaveBeenCalledWith(mockMetrics);
		});

		it('should handle metrics endpoint errors', async () => {
			// Arrange
			const req = createMockRequest();
			const res = createMockResponse();

			// Mock prometheus to throw error
			vi.doMock('prom-client', () => {
				throw new Error('Prometheus not available');
			});

			// Act
			await endpoints.handleMetrics(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					message: 'Metrics not available',
				}),
			);
		});
	});

	describe('System Information', () => {
		it('should return system information', async () => {
			// Arrange
			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleSystemInfo(req, res);

			// Assert
			expect(res.json).toHaveBeenCalledWith(
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

			mockShutdownManager.shutdown.mockResolvedValue([
				{ name: 'test-handler', success: true, duration: 100 },
			]);

			// Act
			await endpoints.handleShutdown(req, res);

			// Assert
			expect(mockShutdownManager.shutdown).toHaveBeenCalledWith('Admin shutdown test');
			expect(res.json).toHaveBeenCalledWith(
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
			expect(res.status).toHaveBeenCalledWith(409);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					message: 'Shutdown already in progress',
				}),
			);
		});

		it('should handle shutdown errors', async () => {
			// Arrange
			const req = createMockRequest();
			const res = createMockResponse();

			mockShutdownManager.shutdown.mockRejectedValue(new Error('Shutdown failed'));

			// Act
			await endpoints.handleShutdown(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					message: 'Shutdown failed',
				}),
			);
		});

		it('should return health checks list for admin', async () => {
			// Arrange
			mockHealthChecker.getAllResults.mockReturnValue([
				{ name: 'test-service', status: 'healthy', timestamp: new Date() },
				{ name: 'db', status: 'degraded', timestamp: new Date() },
			]);

			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleHealthChecks(req, res);

			// Assert
			expect(res.json).toHaveBeenCalledWith(
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
			expect(res.json).toHaveBeenCalledWith(
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
			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith(
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
			expect(res.json).toHaveBeenCalledWith(
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
			const configWithoutAuth = { enableAdmin: true, adminAuth: undefined };
			const endpointsWithoutAuth = createOperationalEndpoints(configWithoutAuth);

			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpointsWithoutAuth.handleHealth(req, res);

			// Assert
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should require authentication when enabled', async () => {
			// Arrange
			const authMiddleware = vi.fn((req, res, next) => {
				if (!req.headers.authorization) {
					return res.status(401).json({ error: 'Unauthorized' });
				}
				next();
			});

			const configWithAuth = {
				enableAdmin: true,
				adminAuth: authMiddleware,
			};
			const endpointsWithAuth = createOperationalEndpoints(configWithAuth);

			const req = createMockRequest({
				headers: {},
			});
			const res = createMockResponse();

			// Act
			await endpointsWithAuth.handleShutdown(req, res);

			// Assert
			expect(authMiddleware).toHaveBeenCalled();
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
			// Arrange
			const router = endpoints.getRouter();
			const routerSpy = vi.spyOn(router, 'get');

			// Act
			endpoints.configureRoutes();

			// Assert
			expect(routerSpy).toHaveBeenCalledWith('/health', expect.any(Function));
			expect(routerSpy).toHaveBeenCalledWith('/health/live', expect.any(Function));
			expect(routerSpy).toHaveBeenCalledWith('/health/ready', expect.any(Function));
			expect(routerSpy).toHaveBeenCalledWith('/metrics', expect.any(Function));
		});
	});

	describe('Integration with brAInwav Standards', () => {
		it('should include brAInwav branding in responses', async () => {
			// Arrange
			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleSystemInfo(req, res);

			// Assert
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					company: 'brAInwav',
				}),
			);
		});

		it('should follow brAInwav error response format', async () => {
			// Arrange
			mockHealthChecker.getSystemHealth.mockRejectedValue(new Error('Test error'));

			const req = createMockRequest();
			const res = createMockResponse();

			// Act
			await endpoints.handleHealth(req, res);

			// Assert
			expect(res.json).toHaveBeenCalledWith(
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

			mockShutdownManager.shutdown.mockResolvedValue([]);

			// Act
			await endpoints.handleShutdown(req, res);

			// Assert
			expect(mockShutdownManager.shutdown).toHaveBeenCalledWith('brAInwav maintenance');
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					reason: 'brAInwav maintenance',
				}),
			);
		});
	});
});
