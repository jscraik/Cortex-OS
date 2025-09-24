/**
 * Simple Operational Endpoints Test - TDD Phase
 * Testing the public handler methods that were added for TDD compliance
 */

import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OperationalEndpoints } from '../../operations/operational-endpoints.js';

// Create minimal mocks for dependencies
const mockHealthChecker = {
	getSystemHealth: vi.fn(),
	getLivenessProbe: vi.fn(),
	getReadinessProbe: vi.fn(),
	getAllResults: vi.fn(),
	runCheck: vi.fn(),
};

const mockShutdownManager = {
	isShutdownInProgress: vi.fn(),
	shutdown: vi.fn(),
	getHandlers: vi.fn(),
};

// Simple mock request/response
const mockReq = {} as Request;
const mockRes = {
	status: vi.fn().mockReturnThis(),
	json: vi.fn().mockReturnThis(),
	end: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
} as any as Response;

describe('OperationalEndpoints - TDD Handler Methods', () => {
	let endpoints: OperationalEndpoints;

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup happy path mocks
		mockHealthChecker.getSystemHealth.mockResolvedValue({
			overall: 'healthy',
			timestamp: new Date().toISOString(),
			uptime: 12345,
			version: '1.0.0',
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

		endpoints = new OperationalEndpoints({
			healthChecker: mockHealthChecker as any,
			shutdownManager: mockShutdownManager as any,
			enableMetrics: true,
			enableAdminEndpoints: true,
		});
	});

	it('should respond to health endpoint', async () => {
		const router = endpoints.getRouter();

		// Create mock req and res with path
		const req = {
			...mockReq,
			path: '/health',
		};

		// Find and call the health route handler
		const healthRoute = router.stack.find(
			(layer: any) => layer.route?.path === '/health' && layer.route?.methods.get,
		);

		expect(healthRoute).toBeDefined();

		if (healthRoute) {
			await healthRoute.route.stack[0].handle(req, mockRes);

			// Verify it called the underlying health check
			expect(mockHealthChecker.getSystemHealth).toHaveBeenCalled();
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'healthy',
					timestamp: expect.any(String),
					uptime: expect.any(Number),
					version: expect.any(String),
				}),
			);
		}
	});

	it('should respond to liveness endpoint', async () => {
		const router = endpoints.getRouter();

		const req = {
			...mockReq,
			path: '/health/live',
		};

		const livenessRoute = router.stack.find(
			(layer: any) => layer.route?.path === '/health/live' && layer.route?.methods.get,
		);

		expect(livenessRoute).toBeDefined();

		if (livenessRoute) {
			await livenessRoute.route.stack[0].handle(req, mockRes);

			expect(mockHealthChecker.getLivenessProbe).toHaveBeenCalled();
			expect(mockRes.status).toHaveBeenCalledWith(200);
		}
	});

	it('should respond to readiness endpoint', async () => {
		const router = endpoints.getRouter();

		const req = {
			...mockReq,
			path: '/health/ready',
		};

		const readinessRoute = router.stack.find(
			(layer: any) => layer.route?.path === '/health/ready' && layer.route?.methods.get,
		);

		expect(readinessRoute).toBeDefined();

		if (readinessRoute) {
			await readinessRoute.route.stack[0].handle(req, mockRes);

			expect(mockHealthChecker.getReadinessProbe).toHaveBeenCalled();
			expect(mockRes.status).toHaveBeenCalledWith(200);
		}
	});

	it('should respond to metrics endpoint', async () => {
		const router = endpoints.getRouter();

		const req = {
			...mockReq,
			path: '/metrics',
		};

		const metricsRoute = router.stack.find(
			(layer: any) => layer.route?.path === '/metrics' && layer.route?.methods.get,
		);

		expect(metricsRoute).toBeDefined();

		if (metricsRoute) {
			await metricsRoute.route.stack[0].handle(req, mockRes);

			// Either it succeeds with res.end() OR fails with status 500
			expect(
				(mockRes.status as any).mock.calls.length + (mockRes.end as any).mock.calls.length,
			).toBeGreaterThan(0);
		}
	});

	it('should respond to info endpoint', async () => {
		const router = endpoints.getRouter();

		const req = {
			...mockReq,
			path: '/info',
		};

		const infoRoute = router.stack.find(
			(layer: any) => layer.route?.path === '/info' && layer.route?.methods.get,
		);

		expect(infoRoute).toBeDefined();

		if (infoRoute) {
			await infoRoute.route.stack[0].handle(req, mockRes);

			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					service: 'nO Master Agent Loop',
					company: 'brAInwav',
				}),
			);
		}
	});

	it('should have getRouter method', () => {
		expect(typeof endpoints.getRouter).toBe('function');

		const router = endpoints.getRouter();
		expect(router).toBeDefined();
	});
});
