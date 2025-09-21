import { HealthMonitor } from '../../monitoring/health';
import { MetricsCollector } from '../../monitoring/metrics';
import { type HealthResponse, healthResponseSchema } from '../types';

export class HealthHandler {
	private healthMonitor: HealthMonitor;
	private metricsCollector: MetricsCollector;

	constructor() {
		this.healthMonitor = new HealthMonitor({
			checkInterval: Number.parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
			enableEvents: true,
		});
		this.metricsCollector = new MetricsCollector({
			enablePrometheus: true,
			retentionPeriod: Number.parseInt(process.env.METRICS_RETENTION || '3600000'),
		});
	}

	async getHealth(): Promise<HealthResponse> {
		const startTime = Date.now();

		try {
			const health = await this.healthMonitor.getHealth();

			// Track health check as a request
			this.metricsCollector.trackRequest('health-check', 'success', Date.now() - startTime);

			// Add request metrics to response
			const metrics = this.metricsCollector.getMetrics();

			const enhancedHealth: HealthResponse = {
				status: health.status,
				timestamp: health.timestamp,
				uptime: health.uptime,
				version: health.version,
				checks: health.checks,
				metrics: {
					requests: metrics.requests,
					agents: metrics.agents.length,
					activeSessions: metrics.agents.reduce(
						(sum: number, agent: any) => sum + agent.activeSessions,
						0,
					),
				},
			};

			return healthResponseSchema.parse(enhancedHealth);
		} catch (error) {
			// Track failed health check
			this.metricsCollector.trackRequest('health-check', 'error', Date.now() - startTime);

			const fallbackHealth: HealthResponse = {
				status: 'unhealthy',
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				version: process.env.npm_package_version || '0.1.0',
				checks: {
					system: {
						name: 'system',
						status: 'unhealthy',
						timestamp: new Date().toISOString(),
						details: {
							message: 'Health check failed',
							error: error instanceof Error ? error.message : 'Unknown error',
						},
					},
				},
			};

			return healthResponseSchema.parse(fallbackHealth);
		}
	}

	async getComponentHealth(componentName: string): Promise<any> {
		const componentHealth = await this.healthMonitor.getComponentHealth(componentName);

		if (!componentHealth) {
			return {
				error: {
					code: 404,
					message: `Component '${componentName}' not found`,
				},
			};
		}

		return componentHealth;
	}

	getMetricsCollector(): MetricsCollector {
		return this.metricsCollector;
	}

	getHealthMonitor(): HealthMonitor {
		return this.healthMonitor;
	}
}
