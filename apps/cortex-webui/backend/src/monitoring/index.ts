// Main monitoring module export for brAInwav Cortex WebUI
// Centralized monitoring system with health checks and metrics

export { createHealthCheckRoutes } from './healthRoutes.js';
export { createMetricsRoutes } from './metricsRoutes.js';
export {
	metricsMiddleware,
	recordAuthMetric,
	recordCustomMetric,
	recordDatabaseMetric,
	recordHttpRequestMetric,
} from './middleware/metricsMiddleware.js';
// Type exports
export type {
	DetailedHealthResult,
	HealthCheck,
	HealthCheckResult,
	LivenessResult,
	ReadinessResult,
} from './services/healthService.js';
export { HealthService } from './services/healthService.js';
export type { MetricLabels } from './services/metricsService.js';
export { MetricsService } from './services/metricsService.js';
