// Main monitoring module export for brAInwav Cortex WebUI
// Centralized monitoring system with health checks and metrics

export { HealthService } from './services/healthService.js';
export { MetricsService } from './services/metricsService.js';
export { createHealthCheckRoutes } from './healthRoutes.js';
export { createMetricsRoutes } from './metricsRoutes.js';
export {
	metricsMiddleware,
	recordCustomMetric,
	recordHttpRequestMetric,
	recordDatabaseMetric,
	recordAuthMetric,
} from './middleware/metricsMiddleware.js';

// Type exports
export type {
	HealthCheckResult,
	HealthCheck,
	ReadinessResult,
	LivenessResult,
	DetailedHealthResult,
} from './services/healthService.js';

export type { MetricLabels } from './services/metricsService.js';