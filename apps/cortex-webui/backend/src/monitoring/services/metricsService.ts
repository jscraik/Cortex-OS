// Metrics Collection Service for brAInwav Cortex WebUI
// Prometheus-style metrics with comprehensive monitoring

import { performance } from 'node:perf_hooks';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics, Registry } from 'prom-client';

export interface MetricLabels {
	[key: string]: string;
}

export class MetricsService {
	private static instance: MetricsService;
	private registry: Registry;
	private isCollecting = false;

	// HTTP Request Metrics
	private httpRequestTotal: Counter<string>;
	private httpRequestDuration: Histogram<string>;

	// Application Metrics
	private memoryUsage: Gauge<string>;
	private cpuUsage: Gauge<string>;
	private eventLoopLag: Histogram<string>;
	private uptime: Gauge<string>;

	// Database Metrics
	private databaseConnections: Gauge<string>;
	private databaseQueriesTotal: Counter<string>;
	private databaseQueryDuration: Histogram<string>;

	// Authentication Metrics
	private authAttemptsTotal: Counter<string>;
	private authFailuresTotal: Counter<string>;
	private activeSessions: Gauge<string>;
	private tokenValidations: Counter<string>;
	private tokenValidationDuration: Histogram<string>;

	// Custom Metrics Registry
	private customCounters = new Map<string, Counter<string>>();
	private customGauges = new Map<string, Gauge<string>>();
	private customHistograms = new Map<string, Histogram<string>>();

	private constructor() {
		this.registry = new Registry();
		this.initializeMetrics();
		this.startPeriodicCollection();
	}

	public static getInstance(): MetricsService {
		if (!MetricsService.instance) {
			MetricsService.instance = new MetricsService();
		}
		return MetricsService.instance;
	}

	private initializeMetrics(): void {
		// Set default labels for all metrics
		register.setDefaultLabels({
			service: 'cortex-webui',
			brand: 'brAInwav',
			version: process.env.npm_package_version || '1.0.0',
			environment: process.env.NODE_ENV || 'development',
		});

		// HTTP Request Metrics
		this.httpRequestTotal = new Counter({
			name: 'http_requests_total',
			help: 'Total number of HTTP requests',
			labelNames: ['method', 'route', 'status_code'],
			registers: [this.registry],
		});

		this.httpRequestDuration = new Histogram({
			name: 'http_request_duration_seconds',
			help: 'Duration of HTTP requests in seconds',
			labelNames: ['method', 'route', 'status_code'],
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
			registers: [this.registry],
		});

		// Application Metrics
		this.memoryUsage = new Gauge({
			name: 'nodejs_memory_usage_bytes',
			help: 'Memory usage in bytes',
			labelNames: ['type'],
			registers: [this.registry],
		});

		this.cpuUsage = new Gauge({
			name: 'process_cpu_usage_percent',
			help: 'Process CPU usage percentage',
			registers: [this.registry],
		});

		this.eventLoopLag = new Histogram({
			name: 'nodejs_eventloop_lag_seconds',
			help: 'Event loop lag in seconds',
			buckets: [0.001, 0.01, 0.1, 1, 5, 10],
			registers: [this.registry],
		});

		this.uptime = new Gauge({
			name: 'process_uptime_seconds',
			help: 'Process uptime in seconds',
			registers: [this.registry],
		});

		// Database Metrics
		this.databaseConnections = new Gauge({
			name: 'database_connections',
			help: 'Number of database connections',
			labelNames: ['state'], // active, idle, waiting, total
			registers: [this.registry],
		});

		this.databaseQueriesTotal = new Counter({
			name: 'database_queries_total',
			help: 'Total number of database queries',
			labelNames: ['operation', 'table', 'success'],
			registers: [this.registry],
		});

		this.databaseQueryDuration = new Histogram({
			name: 'database_query_duration_seconds',
			help: 'Duration of database queries in seconds',
			labelNames: ['operation', 'table', 'success'],
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
			registers: [this.registry],
		});

		// Authentication Metrics
		this.authAttemptsTotal = new Counter({
			name: 'auth_attempts_total',
			help: 'Total number of authentication attempts',
			labelNames: ['provider', 'success'],
			registers: [this.registry],
		});

		this.authFailuresTotal = new Counter({
			name: 'auth_failures_total',
			help: 'Total number of authentication failures',
			labelNames: ['provider', 'reason'],
			registers: [this.registry],
		});

		this.activeSessions = new Gauge({
			name: 'active_sessions_total',
			help: 'Number of active user sessions',
			registers: [this.registry],
		});

		this.tokenValidations = new Counter({
			name: 'token_validations_total',
			help: 'Total number of token validations',
			labelNames: ['valid'],
			registers: [this.registry],
		});

		this.tokenValidationDuration = new Histogram({
			name: 'token_validation_duration_seconds',
			help: 'Duration of token validations in seconds',
			buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05],
			registers: [this.registry],
		});

		// Collect default Node.js metrics
		collectDefaultMetrics({
			register: this.registry,
			prefix: 'nodejs_',
		});
	}

	// HTTP Request Metrics
	public recordHttpRequest(
		method: string,
		route: string,
		statusCode: number,
		responseTimeMs: number,
	): void {
		const sanitizedRoute = this.sanitizeMetricLabel(route);
		const labels = {
			method: method.toUpperCase(),
			route: sanitizedRoute,
			status_code: statusCode.toString(),
		};

		this.httpRequestTotal.inc(labels);
		this.httpRequestDuration.observe(labels, responseTimeMs / 1000);
	}

	// Application Metrics
	public recordMemoryUsage(
		heapUsed: number,
		heapTotal: number,
		external: number,
		rss: number,
	): void {
		this.memoryUsage.set({ type: 'heap_used' }, heapUsed);
		this.memoryUsage.set({ type: 'heap_total' }, heapTotal);
		this.memoryUsage.set({ type: 'external' }, external);
		this.memoryUsage.set({ type: 'rss' }, rss);
	}

	public recordCpuUsage(cpuUsagePercent: number): void {
		this.cpuUsage.set(cpuUsagePercent);
	}

	public recordEventLoopLag(lagMs: number): void {
		this.eventLoopLag.observe(lagMs / 1000);
	}

	public recordUptime(uptimeSeconds: number): void {
		this.uptime.set(uptimeSeconds);
	}

	// Database Metrics
	public recordDatabaseConnections(
		total: number,
		active: number,
		idle: number,
		waiting: number,
	): void {
		this.databaseConnections.set({ state: 'total' }, total);
		this.databaseConnections.set({ state: 'active' }, active);
		this.databaseConnections.set({ state: 'idle' }, idle);
		this.databaseConnections.set({ state: 'waiting' }, waiting);
	}

	public recordDatabaseQuery(
		operation: string,
		table: string,
		durationMs: number,
		success: boolean,
	): void {
		const labels = {
			operation: operation.toLowerCase(),
			table: table.toLowerCase(),
			success: success.toString(),
		};

		this.databaseQueriesTotal.inc(labels);
		this.databaseQueryDuration.observe(labels, durationMs / 1000);
	}

	// Authentication Metrics
	public recordAuthAttempt(provider: string, success: boolean): void {
		this.authAttemptsTotal.inc({
			provider: provider.toLowerCase(),
			success: success.toString(),
		});
	}

	public recordAuthFailure(provider: string, reason: string): void {
		this.authFailuresTotal.inc({
			provider: provider.toLowerCase(),
			reason: reason.toLowerCase(),
		});
	}

	public recordActiveSessions(count: number): void {
		this.activeSessions.set(count);
	}

	public recordTokenValidation(valid: boolean, durationMs: number): void {
		this.tokenValidations.inc({ valid: valid.toString() });
		this.tokenValidationDuration.observe({ valid: valid.toString() }, durationMs / 1000);
	}

	// Custom Metrics
	public incrementCounter(name: string, labels: MetricLabels = {}): void {
		if (!this.customCounters.has(name)) {
			this.customCounters.set(name, new Counter({
				name: this.sanitizeMetricName(name),
				help: `Custom counter metric: ${name}`,
				labelNames: Object.keys(labels),
				registers: [this.registry],
			}));
		}

		const counter = this.customCounters.get(name)!;
		counter.inc(labels);
	}

	public setGauge(name: string, value: number, labels: MetricLabels = {}): void {
		if (!this.customGauges.has(name)) {
			this.customGauges.set(name, new Gauge({
				name: this.sanitizeMetricName(name),
				help: `Custom gauge metric: ${name}`,
				labelNames: Object.keys(labels),
				registers: [this.registry],
			}));
		}

		const gauge = this.customGauges.get(name)!;
		gauge.set(labels, value);
	}

	public recordHistogram(name: string, value: number, labels: MetricLabels = {}): void {
		if (!this.customHistograms.has(name)) {
			this.customHistograms.set(name, new Histogram({
				name: this.sanitizeMetricName(name),
				help: `Custom histogram metric: ${name}`,
				labelNames: Object.keys(labels),
				buckets: [0.1, 0.5, 1, 5, 10, 50],
				registers: [this.registry],
			}));
		}

		const histogram = this.customHistograms.get(name)!;
		histogram.observe(labels, value);
	}

	// Metrics Collection and Export
	public getMetrics(): string {
		return this.registry.metrics();
	}

	public getMetricsJson(): Record<string, any> {
		const metrics: Record<string, any> = {};

		// Get all metrics from the registry
		const metricObjects = this.registry.getMetricsAsJSON();

		for (const metric of metricObjects) {
			const values: Record<string, number> = {};

			if (metric.values) {
				for (const value of metric.values) {
					const labelKey = JSON.stringify(value.labels || {});
					values[labelKey] = value.value;
				}
			}

			metrics[metric.name] = {
				name: metric.name,
				help: metric.help,
				type: metric.type,
				values,
			};
		}

		return metrics;
	}

	public async collectMetrics(): Promise<void> {
		if (this.isCollecting) {
			return;
		}

		this.isCollecting = true;

		try {
			// Update system metrics
			const memUsage = process.memoryUsage();
			this.recordMemoryUsage(
				memUsage.heapUsed,
				memUsage.heapTotal,
				memUsage.external,
				memUsage.rss,
			);

			this.recordUptime(process.uptime());

			// Measure event loop lag
			const lag = await this.measureEventLoopLag();
			this.recordEventLoopLag(lag);

			// Update CPU usage (simplified calculation)
			const cpuUsage = process.cpuUsage();
			const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
			this.recordCpuUsage(cpuPercent);

		} catch (error) {
			console.error('Error collecting metrics:', error);
		} finally {
			this.isCollecting = false;
		}
	}

	private startPeriodicCollection(): void {
		// Collect metrics every 15 seconds
		setInterval(() => {
			void this.collectMetrics();
		}, 15000);
	}

	private async measureEventLoopLag(): Promise<number> {
		return new Promise((resolve) => {
			const start = performance.now();
			setImmediate(() => {
				const lag = performance.now() - start;
				resolve(lag);
			});
		});
	}

	private sanitizeMetricName(name: string): string {
		// Prometheus metric name rules:
		// - Match regex:^[a-zA-Z_:][a-zA-Z0-9_:]*$
		// - Don't start with numbers
		// - Use underscores and colons as separators
		return name
			.replace(/[^a-zA-Z0-9_:]/g, '_')
			.replace(/^[0-9]/, '_')
			.replace(/__+/g, '_')
			.toLowerCase();
	}

	private sanitizeMetricLabel(label: string): string {
		// Sanitize metric label values
		return label
			.replace(/"/g, '\\"')
			.replace(/\n/g, '\\n')
			.replace(/\\/g, '\\\\');
	}

	public getRegistry(): Registry {
		return this.registry;
	}

	public clearRegistry(): void {
		this.registry.clear();
		this.initializeMetrics();
	}
}