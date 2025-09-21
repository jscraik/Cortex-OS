import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requirePermission } from '../../auth/middleware';
import type { MetricsCollector } from '../../monitoring/metrics';

const metricsRoutes = new Hono<{ Variables: { metricsCollector?: MetricsCollector } }>();

// GET /metrics - Prometheus metrics endpoint
metricsRoutes.get('/', requirePermission('read:metrics'), async (c) => {
	try {
		const metricsCollector = c.get('metricsCollector');

		if (!metricsCollector) {
			throw new HTTPException(500, {
				message: 'Metrics collector not available',
			});
		}

		// Log metrics access for audit
		console.log('Metrics accessed', {
			timestamp: new Date().toISOString(),
			userAgent: c.req.header('user-agent'),
			ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
		});

		const prometheusMetrics = await metricsCollector.getPrometheusMetrics();

		return new Response(prometheusMetrics, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain; version=0.0.4',
				'Cache-Control': 'no-cache',
				'X-Metrics-Format': 'prometheus',
			},
		});
	} catch (error) {
		console.error('Failed to collect metrics:', error);

		throw new HTTPException(500, {
			message: 'Failed to collect metrics',
		});
	}
});

// GET /metrics/health - Health metrics summary
metricsRoutes.get('/health', requirePermission('read:metrics'), async (c) => {
	try {
		const metricsCollector = c.get('metricsCollector');

		if (!metricsCollector) {
			throw new HTTPException(500, {
				message: 'Metrics collector not available',
			});
		}

		const metrics = metricsCollector.getMetrics();

		return c.json({
			timestamp: new Date().toISOString(),
			metrics: {
				requests: metrics.requests,
				agents: metrics.agents,
				resources: metrics.resources,
				system: {
					uptime: process.uptime(),
					memory: process.memoryUsage(),
					cpu: process.cpuUsage(),
				},
			},
		});
	} catch (error) {
		console.error('Failed to collect health metrics:', error);

		throw new HTTPException(500, {
			message: 'Failed to collect health metrics',
		});
	}
});

// GET /metrics/agents/:agentId - Agent-specific metrics
metricsRoutes.get('/agents/:agentId', requirePermission('read:metrics'), async (c) => {
	const agentId = c.req.param('agentId');

	try {
		const metricsCollector = c.get('metricsCollector');

		if (!metricsCollector) {
			throw new HTTPException(500, {
				message: 'Metrics collector not available',
			});
		}

		const agentMetrics = metricsCollector.getAgentMetrics(agentId);

		if (!agentMetrics) {
			throw new HTTPException(404, {
				message: `Agent '${agentId}' not found`,
			});
		}

		return c.json({
			agentId,
			metrics: agentMetrics,
		});
	} catch (error) {
		if (error instanceof HTTPException) {
			throw error;
		}

		console.error(`Failed to collect agent metrics for ${agentId}:`, error);

		throw new HTTPException(500, {
			message: 'Failed to collect agent metrics',
		});
	}
});

export { metricsRoutes };
