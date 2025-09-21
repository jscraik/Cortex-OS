// Export health monitoring
export { HealthMonitor } from './health';
export type {
	HealthCheck,
	ComponentHealth,
	SystemHealth,
	HealthMonitorConfig,
} from './health';

// Export metrics collection
export { MetricsCollector } from './metrics';
export type {
	RequestMetrics,
	ResourceMetrics,
	MetricsConfig,
} from './metrics';

// Re-export AgentMetrics with a different name to avoid conflict
export type AgentMetricsData = import('./metrics').AgentMetrics;

// Export tracing
export * from './tracing';

// Export monitoring utilities
export * from './utils';
