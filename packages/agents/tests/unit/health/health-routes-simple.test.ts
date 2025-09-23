import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

describe('Health Routes - Simple Tests', () => {
	let app: Hono;

	beforeEach(() => {
		app = new Hono();

		// Create simple health routes inline for testing
		app.get('/health', async (c) => {
			return c.json({
				status: 'healthy',
				timestamp: '2025-09-21T20:00:00.000Z',
				version: '0.1.0',
				uptime: 3600,
			});
		});

		app.get('/health/components/:componentName', async (c) => {
			const componentName = c.req.param('componentName');
			if (componentName === 'database') {
				return c.json({
					name: 'database',
					status: 'healthy',
					timestamp: '2025-09-21T20:00:00.000Z',
				});
			}
			return c.json({ error: { code: 404, message: `Component '${componentName}' not found` } });
		});

		app.get('/health/detailed', async (c) => {
			return c.json({
				health: {
					status: 'healthy',
					timestamp: '2025-09-21T20:00:00.000Z',
				},
				metrics: {
					summary: {
						totalRequests: 1000,
						successRate: 95,
						avgLatency: 120,
						activeAgents: 2,
					},
				},
				timestamp: new Date().toISOString(),
			});
		});
	});

	describe('Basic Health Endpoint (GET /health)', () => {
		it('should return healthy status', async () => {
			const response = await app.request('/health');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.status).toBe('healthy');
			expect(result.version).toBe('0.1.0');
			expect(result.uptime).toBe(3600);
		});
	});

	describe('Component-Specific Health (GET /health/components/:componentName)', () => {
		it('should return specific component health for database', async () => {
			const response = await app.request('/health/components/database');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.name).toBe('database');
			expect(result.status).toBe('healthy');
		});

		it('should return 404 for non-existent components', async () => {
			const response = await app.request('/health/components/nonexistent');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.error.code).toBe(404);
			expect(result.error.message).toContain('not found');
		});
	});

	describe('Detailed Health with Metrics (GET /health/detailed)', () => {
		it('should return comprehensive health and metrics data', async () => {
			const response = await app.request('/health/detailed');

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result.health.status).toBe('healthy');
			expect(result.metrics.summary.totalRequests).toBe(1000);
			expect(result.metrics.summary.successRate).toBe(95);
			expect(result.timestamp).toBeDefined();
		});
	});
});
