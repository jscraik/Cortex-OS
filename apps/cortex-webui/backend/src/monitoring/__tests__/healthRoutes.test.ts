// Test suite for Health Check API
// Comprehensive testing for all health endpoints with brAInwav branding

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createHealthCheckRoutes } from '../healthRoutes.js';
import { HealthService } from '../services/healthService.js';
import type { HealthCheckResult } from '../services/healthService.js';

// Mock HealthService
vi.mock('../services/healthService.js');

describe('Health Check API', () => {
	let app: express.Application;
	let mockHealthService: any;

	beforeEach(() => {
		vi.clearAllMocks();

		app = express();
		app.use(express.json());

		// Create mock instance
		mockHealthService = {
			performHealthCheck: vi.fn(),
			checkReadiness: vi.fn(),
			checkLiveness: vi.fn(),
		};

		// Mock the singleton
		vi.mocked(HealthService.getInstance).mockReturnValue(mockHealthService);

		// Add health routes
		app.use('/health', createHealthCheckRoutes());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('GET /health', () => {
		it('should return basic health status', async () => {
			const response = await request(app)
				.get('/health')
				.expect('Content-Type', /json/)
				.expect(200);

			expect(response.body).toMatchObject({
				status: 'OK',
				timestamp: expect.any(String),
				brand: 'brAInwav',
				service: 'cortex-webui'
			});
			expect(new Date(response.body.timestamp)).toBeValidDate();
		});

		it('should handle CORS properly', async () => {
			const response = await request(app)
				.get('/health')
				.expect(200);

			expect(response.headers['access-control-allow-origin']).toBeDefined();
		});
	});

	describe('GET /health/ready', () => {
		it('should return ready status when all dependencies are healthy', async () => {
			const mockHealthResult: HealthCheckResult = {
				status: 'healthy',
				checks: {
					database: { status: 'pass', componentId: 'database', componentType: 'datastore' },
					filesystem: { status: 'pass', componentId: 'filesystem', componentType: 'system' },
					environment: { status: 'pass', componentId: 'environment', componentType: 'system' },
				},
				timestamp: new Date().toISOString(),
				uptime: 123,
				version: '1.0.0',
			};

			mockHealthService.performHealthCheck.mockResolvedValue(mockHealthResult);

			const response = await request(app)
				.get('/health/ready')
				.expect('Content-Type', /json/)
				.expect(200);

			expect(response.body).toMatchObject({
				status: 'ready',
				checks: mockHealthResult.checks,
				timestamp: expect.any(String),
				brand: 'brAInwav',
			});
		});

		it('should return 503 when dependencies are not ready', async () => {
			const mockHealthResult: HealthCheckResult = {
				status: 'unhealthy',
				checks: {
					database: {
						status: 'fail',
						message: 'Connection failed',
						componentId: 'database',
						componentType: 'datastore'
					},
				},
				timestamp: new Date().toISOString(),
				uptime: 123,
				version: '1.0.0',
			};

			mockHealthService.performHealthCheck.mockResolvedValue(mockHealthResult);

			const response = await request(app)
				.get('/health/ready')
				.expect('Content-Type', /json/)
				.expect(503);

			expect(response.body).toMatchObject({
				status: 'not ready',
				checks: mockHealthResult.checks,
				timestamp: expect.any(String),
				brand: 'brAInwav',
				error: 'Database connection failed',
			});
		});

		it('should return degraded status when some dependencies have warnings', async () => {
			const mockHealthResult: HealthCheckResult = {
				status: 'degraded',
				checks: {
					database: {
						status: 'warn',
						message: 'Slow response',
						observedValue: 1200,
						observedUnit: 'ms',
						componentId: 'database',
						componentType: 'datastore'
					},
					filesystem: { status: 'pass', componentId: 'filesystem', componentType: 'system' },
				},
				timestamp: new Date().toISOString(),
				uptime: 123,
				version: '1.0.0',
			};

			mockHealthService.performHealthCheck.mockResolvedValue(mockHealthResult);

			const response = await request(app)
				.get('/health/ready')
				.expect('Content-Type', /json/)
				.expect(200);

			expect(response.body).toMatchObject({
				status: 'ready',
				checks: mockHealthResult.checks,
				timestamp: expect.any(String),
				brand: 'brAInwav',
				warnings: expect.arrayContaining([expect.stringContaining('Slow response')]),
			});
		});

		it('should handle health check service errors gracefully', async () => {
			mockHealthService.performHealthCheck.mockRejectedValue(
				new Error('Health service unavailable')
			);

			const response = await request(app)
				.get('/health/ready')
				.expect('Content-Type', /json/)
				.expect(503);

			expect(response.body).toMatchObject({
				status: 'not ready',
				timestamp: expect.any(String),
				brand: 'brAInwav',
				error: 'Health check service unavailable',
			});
		});
	});

	describe('GET /health/live', () => {
		it('should return alive status when application is running', async () => {
			mockHealthService.checkLiveness.mockResolvedValue({
				status: 'alive',
				uptime: 456,
				memoryUsage: expect.any(Object),
			});

			const response = await request(app)
				.get('/health/live')
				.expect('Content-Type', /json/)
				.expect(200);

			expect(response.body).toMatchObject({
				status: 'alive',
				timestamp: expect.any(String),
				uptime: expect.any(Number),
				brand: 'brAInwav',
			});
			expect(response.body.memoryUsage).toBeDefined();
		});

		it('should return not alive status when application is shutting down', async () => {
			mockHealthService.checkLiveness.mockResolvedValue({
				status: 'shutting down',
				uptime: 456,
			});

			const response = await request(app)
				.get('/health/live')
				.expect('Content-Type', /json/)
				.expect(503);

			expect(response.body).toMatchObject({
				status: 'not alive',
				timestamp: expect.any(String),
				brand: 'brAInwav',
				error: 'Application is shutting down',
			});
		});
	});

	describe('GET /health/detailed', () => {
		it('should return comprehensive health report', async () => {
			const mockHealthResult: HealthCheckResult = {
				status: 'healthy',
				checks: {
					database: {
						status: 'pass',
						message: 'Responding normally',
						observedValue: 45,
						observedUnit: 'ms',
						componentId: 'database',
						componentType: 'datastore'
					},
					filesystem: { status: 'pass', componentId: 'filesystem', componentType: 'system' },
					memory: {
						status: 'pass',
						message: 'Memory utilization is normal',
						observedValue: 65,
						observedUnit: '%',
						componentId: 'memory',
						componentType: 'system'
					},
					diskSpace: { status: 'pass', componentId: 'diskspace', componentType: 'system' },
					environment: { status: 'pass', componentId: 'environment', componentType: 'system' },
				},
				timestamp: new Date().toISOString(),
				uptime: 789,
				version: '1.0.0',
			};

			mockHealthService.performHealthCheck.mockResolvedValue(mockHealthResult);

			const response = await request(app)
				.get('/health/detailed')
				.expect('Content-Type', /json/)
				.expect(200);

			expect(response.body).toMatchObject({
				status: 'healthy',
				checks: mockHealthResult.checks,
				timestamp: expect.any(String),
				uptime: 789,
				version: '1.0.0',
				brand: 'brAInwav',
				service: 'cortex-webui',
				environment: expect.any(String),
				nodeVersion: expect.any(String),
			});
		});

		it('should include performance metrics in detailed report', async () => {
			const mockHealthResult: HealthCheckResult = {
				status: 'healthy',
				checks: {},
				timestamp: new Date().toISOString(),
				uptime: 789,
				version: '1.0.0',
			};

			mockHealthService.performHealthCheck.mockResolvedValue(mockHealthResult);

			const response = await request(app)
				.get('/health/detailed')
				.expect(200);

			expect(response.body.performance).toBeDefined();
			expect(response.body.performance).toMatchObject({
				memoryUsage: expect.any(Object),
				cpuUsage: expect.any(Object),
				eventLoopLag: expect.any(Number),
			});
		});
	});

	describe('Response Headers and Security', () => {
		it('should include security headers in health responses', async () => {
			const response = await request(app)
				.get('/health')
				.expect(200);

			expect(response.headers).toMatchObject({
				'x-content-type-options': 'nosniff',
				'x-frame-options': 'DENY',
			});
		});

		it('should include cache control headers to prevent caching', async () => {
			const response = await request(app)
				.get('/health/ready')
				.expect(200);

			expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
			expect(response.headers['pragma']).toBe('no-cache');
			expect(response.headers['expires']).toBe('0');
		});

		it('should handle invalid HTTP methods gracefully', async () => {
			await request(app)
				.post('/health')
				.expect(405);

			await request(app)
				.put('/health/ready')
				.expect(405);

			await request(app)
				.delete('/health/live')
				.expect(405);
		});
	});

	describe('Error Handling', () => {
		it('should handle malformed requests gracefully', async () => {
			const response = await request(app)
				.get('/health/invalid')
				.expect(404);

			expect(response.body).toMatchObject({
				error: 'Not Found',
				timestamp: expect.any(String),
				brand: 'brAInwav',
			});
		});

		it('should handle service timeouts gracefully', async () => {
			mockHealthService.performHealthCheck.mockImplementation(
				() => new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Health check timeout')), 100)
				)
			);

			const response = await request(app)
				.get('/health/ready')
				.expect(503);

			expect(response.body).toMatchObject({
				status: 'not ready',
				timestamp: expect.any(String),
				brand: 'brAInwav',
				error: 'Health check timeout',
			});
		});
	});
});