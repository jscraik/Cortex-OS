// Advanced Metrics Service for brAInwav Cortex WebUI
// Comprehensive performance monitoring with SLO tracking and alerting

import { EventEmitter } from 'node:events';
import { loadavg } from 'node:os';
import client from 'prom-client';
import { cacheService } from '../../services/cacheService.js';
import { memoryService } from '../../services/memoryService.js';

export interface SLO {
	name: string;
	target: {
		p95Latency?: number; // ms
		p99Latency?: number; // ms
		errorRate?: number; // percentage (0-100)
		throughput?: number; // requests per second
		availability?: number; // percentage (0-100)
	};
	window: number; // time window in seconds
	alertThreshold: number; // alert when this % away from target
}

export interface SLOStatus {
	sloName: string;
	status: 'passing' | 'warning' | 'failing';
	currentValue: number;
	targetValue: number;
	deviation: number;
	windowStart: Date;
	windowEnd: Date;
	sampleCount: number;
	violations: number;
}

export interface MetricDefinition {
	name: string;
	type: 'counter' | 'gauge' | 'histogram' | 'summary';
	help: string;
	labels?: string[];
	buckets?: number[];
	percentiles?: number[];
}

export interface AlertRule {
	name: string;
	metric: string;
	operator: 'gt' | 'lt' | 'eq' | 'ne';
	threshold: number;
	duration: number; // seconds
	severity: 'info' | 'warning' | 'critical';
	enabled: boolean;
}

export interface MetricsSnapshot {
	timestamp: Date;
	http: {
		totalRequests: number;
		requestRate: number;
		errorRate: number;
		averageLatency: number;
		p95Latency: number;
		p99Latency: number;
	};
	cache: {
		hitRate: number;
		totalOperations: number;
		memoryUsage: number;
	};
	database: {
		connectionPoolSize: number;
		activeConnections: number;
		averageQueryTime: number;
		slowQueries: number;
	};
	memory: {
		heapUsed: number;
		heapTotal: number;
		usageRatio: number;
		gcStats: Record<string, unknown>;
	};
	system: {
		uptime: number;
		cpuUsage: NodeJS.CpuUsage;
		loadAverage: number[];
	};
}

export class AdvancedMetricsService extends EventEmitter {
	private static instance: AdvancedMetricsService;
	private registry: client.Registry;
	private metrics: Map<string, client.Metric<string>> = new Map();
	private slos: Map<string, SLO> = new Map();
	private sloStatuses: Map<string, SLOStatus> = new Map();
	private alertRules: Map<string, AlertRule> = new Map();
	private alertStates: Map<string, { active: boolean; startTime: Date }> = new Map();
	private metricsHistory: MetricsSnapshot[] = [];
	private maxHistorySize = 1000;
	private collectionInterval?: NodeJS.Timeout;
	private evaluationInterval?: NodeJS.Timeout;

	private constructor() {
		super();
		this.registry = new client.Registry();
		this.initializeMetrics();
		this.startCollection();
		this.startSLOEvaluation();
	}

	public static getInstance(): AdvancedMetricsService {
		if (!AdvancedMetricsService.instance) {
			AdvancedMetricsService.instance = new AdvancedMetricsService();
		}
		return AdvancedMetricsService.instance;
	}

	private initializeMetrics(): void {
		// HTTP metrics
		this.registerMetric({
			name: 'http_requests_total',
			type: 'counter',
			help: 'Total number of HTTP requests',
			labels: ['method', 'route', 'status_code'],
		});

		this.registerMetric({
			name: 'http_request_duration_seconds',
			type: 'histogram',
			help: 'HTTP request duration in seconds',
			labels: ['method', 'route', 'status_code'],
			buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
		});

		this.registerMetric({
			name: 'http_response_size_bytes',
			type: 'histogram',
			help: 'HTTP response size in bytes',
			labels: ['method', 'route'],
			buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
		});

		// Cache metrics
		this.registerMetric({
			name: 'cache_operations_total',
			type: 'counter',
			help: 'Total number of cache operations',
			labels: ['operation', 'result'],
		});

		this.registerMetric({
			name: 'cache_hit_ratio',
			type: 'gauge',
			help: 'Cache hit ratio',
			labels: ['cache_type'],
		});

		// Database metrics
		this.registerMetric({
			name: 'database_connections_active',
			type: 'gauge',
			help: 'Number of active database connections',
		});

		this.registerMetric({
			name: 'database_query_duration_seconds',
			type: 'histogram',
			help: 'Database query duration in seconds',
			labels: ['operation', 'table'],
			buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
		});

		// Memory metrics
		this.registerMetric({
			name: 'memory_usage_bytes',
			type: 'gauge',
			help: 'Memory usage in bytes',
			labels: ['type'],
		});

		this.registerMetric({
			name: 'gc_duration_seconds',
			type: 'histogram',
			help: 'Garbage collection duration in seconds',
			buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
		});

		// Business metrics
		this.registerMetric({
			name: 'rag_queries_total',
			type: 'counter',
			help: 'Total number of RAG queries',
			labels: ['user_id', 'cache_hit'],
		});

		this.registerMetric({
			name: 'document_processing_total',
			type: 'counter',
			help: 'Total number of documents processed',
			labels: ['status', 'document_type'],
		});

		// System metrics
		this.registerMetric({
			name: 'process_cpu_seconds_total',
			type: 'counter',
			help: 'Total CPU time spent in seconds',
		});

		this.registerMetric({
			name: 'process_start_time_seconds',
			type: 'gauge',
			help: 'Process start time in seconds since epoch',
		});
	}

	private registerMetric(definition: MetricDefinition): void {
		let metric: client.Metric<string>;

		switch (definition.type) {
			case 'counter':
				metric = new client.Counter({
					name: definition.name,
					help: definition.help,
					labelNames: definition.labels || [],
				});
				break;
			case 'gauge':
				metric = new client.Gauge({
					name: definition.name,
					help: definition.help,
					labelNames: definition.labels || [],
				});
				break;
			case 'histogram':
				metric = new client.Histogram({
					name: definition.name,
					help: definition.help,
					labelNames: definition.labels || [],
					buckets: definition.buckets,
				});
				break;
			case 'summary':
				metric = new client.Summary({
					name: definition.name,
					help: definition.help,
					labelNames: definition.labels || [],
					percentiles: definition.percentiles || [0.5, 0.9, 0.95, 0.99],
				});
				break;
			default:
				throw new Error(`Unknown metric type: ${definition.type}`);
		}

		this.registry.registerMetric(metric);
		this.metrics.set(definition.name, metric);
	}

	private startCollection(): void {
		// Collect system metrics every 30 seconds
		this.collectionInterval = setInterval(() => {
			this.collectSystemMetrics();
		}, 30000);
	}

	private startSLOEvaluation(): void {
		// Evaluate SLOs every minute
		this.evaluationInterval = setInterval(() => {
			this.evaluateSLOs();
			this.evaluateAlerts();
		}, 60000);
	}

	private collectSystemMetrics(): void {
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		// Update memory metrics
		this.setGauge('memory_usage_bytes', memUsage.heapUsed, { type: 'heap_used' });
		this.setGauge('memory_usage_bytes', memUsage.heapTotal, { type: 'heap_total' });
		this.setGauge('memory_usage_bytes', memUsage.external, { type: 'external' });
		this.setGauge('memory_usage_bytes', memUsage.arrayBuffers, { type: 'array_buffers' });

		// Update CPU metrics
		this.setCounter('process_cpu_seconds_total', cpuUsage.user / 1e6);
		this.setCounter('process_cpu_seconds_total', cpuUsage.system / 1e6, { type: 'system' });

		// Update process start time
		this.setGauge('process_start_time_seconds', Date.now() / 1000);

		// Create metrics snapshot
		this.createMetricsSnapshot();
	}

	private async createMetricsSnapshot(): Promise<void> {
		try {
			const snapshot: MetricsSnapshot = {
				timestamp: new Date(),
				http: {
					totalRequests: await this.getTotalRequests(),
					requestRate: await this.getRequestRate(),
					errorRate: await this.getErrorRate(),
					averageLatency: await this.getAverageLatency(),
					p95Latency: await this.getP95Latency(),
					p99Latency: await this.getP99Latency(),
				},
				cache: {
					hitRate: this.getCacheHitRate(),
					totalOperations: this.getCacheOperations(),
					memoryUsage: this.getCacheMemoryUsage(),
				},
				database: {
					connectionPoolSize: this.getDatabaseConnectionPoolSize(),
					activeConnections: this.getDatabaseActiveConnections(),
					averageQueryTime: this.getDatabaseAverageQueryTime(),
					slowQueries: this.getDatabaseSlowQueries(),
				},
				memory: memoryService.getMemoryStats(),
				system: {
					uptime: process.uptime(),
					cpuUsage: process.cpuUsage(),
					loadAverage: loadavg(),
				},
			};

			this.metricsHistory.push(snapshot);
			if (this.metricsHistory.length > this.maxHistorySize) {
				this.metricsHistory.shift();
			}

			this.emit('metricsSnapshot', snapshot);
		} catch (error) {
			console.error('Error creating metrics snapshot:', error);
		}
	}

	// Public API methods
	public recordHttpRequest(
		method: string,
		route: string,
		statusCode: number,
		duration: number,
	): void {
		const labels = { method, route, status_code: statusCode.toString() };
		this.incrementCounter('http_requests_total', labels);
		this.recordHistogram('http_request_duration_seconds', duration / 1000, labels);
	}

	public recordHttpError(method: string, route: string, _error: Error): void {
		this.incrementCounter('http_requests_total', {
			method,
			route,
			status_code: '500',
		});
	}

	public recordCacheOperation(operation: string, result: 'hit' | 'miss'): void {
		this.incrementCounter('cache_operations_total', { operation, result });
	}

	public recordDatabaseQuery(
		operation: string,
		table: string,
		duration: number,
		success: boolean,
	): void {
		const labels = { operation, table };
		this.recordHistogram('database_query_duration_seconds', duration / 1000, labels);

		if (!success) {
			this.incrementCounter('database_errors_total', labels);
		}
	}

	public recordRAGQuery(userId: string, cacheHit: boolean): void {
		this.incrementCounter('rag_queries_total', { user_id: userId, cache_hit: cacheHit.toString() });
	}

	public recordDocumentProcessing(status: string, documentType: string): void {
		this.incrementCounter('document_processing_total', { status, document_type: documentType });
	}

	// SLO management
	public registerSLO(slo: SLO): void {
		this.slos.set(slo.name, slo);
		console.log(`Registered SLO: ${slo.name}`);
	}

	public unregisterSLO(name: string): void {
		this.slos.delete(name);
		this.sloStatuses.delete(name);
		console.log(`Unregistered SLO: ${name}`);
	}

	private async evaluateSLOs(): Promise<void> {
		for (const [name, slo] of this.slos) {
			try {
				const status = await this.evaluateSLO(slo);
				this.sloStatuses.set(name, status);

				// Emit status change if needed
				const previousStatus = this.sloStatuses.get(name);
				if (previousStatus && previousStatus.status !== status.status) {
					this.emit('sloStatusChange', {
						sloName: name,
						oldStatus: previousStatus.status,
						newStatus: status.status,
						status,
					});
				}
			} catch (error) {
				console.error(`Error evaluating SLO ${name}:`, error);
			}
		}
	}

	private async evaluateSLO(slo: SLO): Promise<SLOStatus> {
		const now = new Date();
		const windowStart = new Date(now.getTime() - slo.window * 1000);
		let currentValue = 0;
		let targetValue = 0;
		let violations = 0;
		let sampleCount = 0;

		// Calculate current value based on SLO target
		if (slo.target.p95Latency) {
			currentValue = await this.getP95Latency(slo.window);
			targetValue = slo.target.p95Latency;
			violations = await this.countLatencyViolations(slo.target.p95Latency, slo.window);
		} else if (slo.target.errorRate) {
			currentValue = await this.getErrorRate(slo.window);
			targetValue = slo.target.errorRate;
			violations = await this.countErrorViolations(slo.window);
		} else if (slo.target.throughput) {
			currentValue = await this.getRequestRate(slo.window);
			targetValue = slo.target.throughput;
			violations = currentValue < targetValue ? 1 : 0;
		}

		sampleCount = await this.getSampleCount(slo.window);

		const deviation =
			targetValue > 0 ? Math.abs((currentValue - targetValue) / targetValue) * 100 : 0;

		let status: 'passing' | 'warning' | 'failing';
		if (deviation > slo.alertThreshold) {
			status = 'failing';
		} else if (deviation > slo.alertThreshold * 0.7) {
			status = 'warning';
		} else {
			status = 'passing';
		}

		return {
			sloName: slo.name,
			status,
			currentValue,
			targetValue,
			deviation,
			windowStart,
			windowEnd: now,
			sampleCount,
			violations,
		};
	}

	// Alert management
	public registerAlertRule(rule: AlertRule): void {
		this.alertRules.set(rule.name, rule);
		console.log(`Registered alert rule: ${rule.name}`);
	}

	public unregisterAlertRule(name: string): void {
		this.alertRules.delete(name);
		this.alertStates.delete(name);
		console.log(`Unregistered alert rule: ${name}`);
	}

	private async evaluateAlerts(): Promise<void> {
		for (const [name, rule] of this.alertRules) {
			if (!rule.enabled) {
				continue;
			}

			try {
				const currentValue = await this.getMetricValue(rule.metric);
				const isTriggered = this.evaluateCondition(currentValue, rule.operator, rule.threshold);
				const currentState = this.alertStates.get(name);

				if (isTriggered && !currentState?.active) {
					// Alert starts firing
					this.alertStates.set(name, {
						active: true,
						startTime: new Date(),
					});

					this.emit('alertFiring', {
						ruleName: name,
						severity: rule.severity,
						metric: rule.metric,
						currentValue,
						threshold: rule.threshold,
						startTime: new Date(),
					});
				} else if (!isTriggered && currentState?.active) {
					// Alert stops firing
					const duration = Date.now() - currentState.startTime.getTime();
					this.alertStates.set(name, {
						active: false,
						startTime: new Date(),
					});

					this.emit('alertResolved', {
						ruleName: name,
						severity: rule.severity,
						metric: rule.metric,
						duration,
						endTime: new Date(),
					});
				}
			} catch (error) {
				console.error(`Error evaluating alert rule ${name}:`, error);
			}
		}
	}

	private evaluateCondition(value: number, operator: string, threshold: number): boolean {
		switch (operator) {
			case 'gt':
				return value > threshold;
			case 'lt':
				return value < threshold;
			case 'eq':
				return value === threshold;
			case 'ne':
				return value !== threshold;
			default:
				return false;
		}
	}

	// Helper methods for metric calculations
	private async getTotalRequests(_windowSeconds?: number): Promise<number> {
		// This would query the histogram for total count
		// Simplified implementation
		return (this.metrics.get('http_requests_total')?.get() as number) || 0;
	}

	private async getRequestRate(windowSeconds = 300): Promise<number> {
		const totalRequests = await this.getTotalRequests(windowSeconds);
		return totalRequests / windowSeconds;
	}

	private async getErrorRate(windowSeconds = 300): Promise<number> {
		// Simplified implementation
		const totalRequests = await this.getTotalRequests(windowSeconds);
		const errorRequests = 0; // Would be calculated from metrics
		return totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
	}

	private async getAverageLatency(_windowSeconds = 300): Promise<number> {
		// Would calculate from histogram observations
		return 150; // Placeholder
	}

	private async getP95Latency(_windowSeconds = 300): Promise<number> {
		// Would calculate p95 from histogram
		return 450; // Placeholder
	}

	private async getP99Latency(_windowSeconds = 300): Promise<number> {
		// Would calculate p99 from histogram
		return 800; // Placeholder
	}

	private getCacheHitRate(): number {
		const stats = cacheService.getStats();
		return stats.hitRate * 100;
	}

	private getCacheOperations(): number {
		const stats = cacheService.getStats();
		return stats.hits + stats.misses;
	}

	private getCacheMemoryUsage(): number {
		return cacheService.getStats().memoryUsage;
	}

	private getDatabaseConnectionPoolSize(): number {
		// Would get from database service
		return 10;
	}

	private getDatabaseActiveConnections(): number {
		// Would get from database service
		return 3;
	}

	private getDatabaseAverageQueryTime(): number {
		// Would get from database service
		return 25;
	}

	private getDatabaseSlowQueries(): number {
		// Would get from database service
		return 5;
	}

	private async getSampleCount(_windowSeconds: number): Promise<number> {
		// Would calculate sample count from metrics
		return 1000;
	}

	private async countLatencyViolations(
		_threshold: number,
		_windowSeconds: number,
	): Promise<number> {
		// Would count latency violations from histogram
		return 10;
	}

	private async countErrorViolations(_windowSeconds: number): Promise<number> {
		// Would count error violations from metrics
		return 5;
	}

	private async getMetricValue(metricName: string): Promise<number> {
		const metric = this.metrics.get(metricName);
		if (!metric) {
			throw new Error(`Metric not found: ${metricName}`);
		}

		// This would extract the current value based on metric type
		return 0; // Placeholder
	}

	// Prometheus metrics access
	public getMetrics(): Promise<string> {
		return this.registry.metrics();
	}

	public getRegistry(): client.Registry {
		return this.registry;
	}

	// Data access methods
	public getSLOStatuses(): Map<string, SLOStatus> {
		return new Map(this.sloStatuses);
	}

	public getMetricsHistory(limit?: number): MetricsSnapshot[] {
		return limit ? this.metricsHistory.slice(-limit) : [...this.metricsHistory];
	}

	public getActiveAlerts(): Array<{ rule: AlertRule; startTime: Date }> {
		const activeAlerts: Array<{ rule: AlertRule; startTime: Date }> = [];

		for (const [name, state] of this.alertStates) {
			if (state.active && this.alertRules.has(name)) {
				const rule = this.alertRules.get(name);
				if (rule) {
					activeAlerts.push({
						rule,
						startTime: state.startTime,
					});
				}
			}
		}

		return activeAlerts;
	}

	// Metric manipulation helpers
	private incrementCounter(name: string, labels: Record<string, string> = {}): void {
		const metric = this.metrics.get(name) as client.Counter<string>;
		if (metric) {
			metric.inc(labels);
		}
	}

	private setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
		const metric = this.metrics.get(name) as client.Gauge<string>;
		if (metric) {
			metric.set(labels, value);
		}
	}

	private recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
		const metric = this.metrics.get(name) as client.Histogram<string>;
		if (metric) {
			metric.observe(labels, value);
		}
	}

	public reset(): void {
		this.registry.clear();
		this.metrics.clear();
		this.slos.clear();
		this.sloStatuses.clear();
		this.alertRules.clear();
		this.alertStates.clear();
		this.metricsHistory = [];
		this.initializeMetrics();
	}

	public close(): void {
		if (this.collectionInterval) {
			clearInterval(this.collectionInterval);
		}

		if (this.evaluationInterval) {
			clearInterval(this.evaluationInterval);
		}

		this.removeAllListeners();
	}
}

// Export singleton instance
export const advancedMetricsService = AdvancedMetricsService.getInstance();

// Export utilities

// Predefined SLOs for cortex-webui
export const cortexWebuiSLOs: SLO[] = [
	{
		name: 'api-response-time',
		target: {
			p95Latency: 500, // 500ms
		},
		window: 300, // 5 minutes
		alertThreshold: 20, // Alert when 20% above target
	},
	{
		name: 'api-error-rate',
		target: {
			errorRate: 0.5, // 0.5%
		},
		window: 300,
		alertThreshold: 50, // Alert when 50% above target
	},
	{
		name: 'api-availability',
		target: {
			availability: 99.9, // 99.9%
		},
		window: 3600, // 1 hour
		alertThreshold: 10,
	},
	{
		name: 'cache-hit-rate',
		target: {
			throughput: 80, // 80% hit rate
		},
		window: 300,
		alertThreshold: 25,
	},
];

// Predefined alert rules
export const cortexWebuiAlerts: AlertRule[] = [
	{
		name: 'high-memory-usage',
		metric: 'memory_usage_bytes',
		operator: 'gt',
		threshold: 500 * 1024 * 1024, // 500MB
		duration: 300, // 5 minutes
		severity: 'warning',
		enabled: true,
	},
	{
		name: 'high-error-rate',
		metric: 'http_requests_total',
		operator: 'gt',
		threshold: 0.05, // 5% error rate
		duration: 60, // 1 minute
		severity: 'critical',
		enabled: true,
	},
	{
		name: 'database-connection-exhaustion',
		metric: 'database_connections_active',
		operator: 'gt',
		threshold: 8, // Out of 10 connections
		duration: 120, // 2 minutes
		severity: 'critical',
		enabled: true,
	},
];
