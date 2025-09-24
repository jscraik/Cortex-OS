import { Hono } from 'hono';
import { HealthHandler } from '../handlers/health.handler.js';

const healthHandler = new HealthHandler();

export const healthRoutes = new Hono();

// GET /health - Basic health check (no auth required)
healthRoutes.get('/', async (c) => {
	const health = await healthHandler.getHealth();
	return c.json(health);
});

// GET /health/components/:componentName - Component-specific health check
healthRoutes.get('/components/:componentName', async (c) => {
	const componentName = c.req.param('componentName');
	const componentHealth = await healthHandler.getComponentHealth(componentName);
	return c.json(componentHealth);
});

// GET /health/detailed - Detailed health with metrics (requires auth)
healthRoutes.get('/detailed', async (c) => {
	const health = await healthHandler.getHealth();
	const metrics = healthHandler.getMetricsCollector().getMetrics();

	return c.json({
		health,
		metrics: {
			summary: {
				totalRequests: metrics.requests.total,
				successRate:
					metrics.requests.total > 0
						? (metrics.requests.success / metrics.requests.total) * 100
						: 0,
				avgLatency: metrics.requests.latency.avg,
				activeAgents: metrics.agents.length,
			},
			agents: metrics.agents,
			resources: metrics.resources,
		},
		timestamp: new Date().toISOString(),
	});
});
