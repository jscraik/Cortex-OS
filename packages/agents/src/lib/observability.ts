/**
 * Observability Implementation - Metrics and Distributed Tracing
 * Following TDD plan requirements for brAInwav Cortex-OS agents
 */

import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import { AgentError, ErrorCategory, ErrorSeverity } from './error-handling.js';
import { MemoryBoundedStore } from './memory-manager.js';

// Metrics collection interfaces
export interface MetricValue {
	name: string;
	value: number;
	unit: string;
	timestamp: number;
	labels?: Record<string, string>;
}

export interface CounterMetric extends MetricValue {
	type: 'counter';
}

export interface GaugeMetric extends MetricValue {
	type: 'gauge';
}

export interface HistogramMetric extends MetricValue {
	type: 'histogram';
	buckets: number[];
}

export type Metric = CounterMetric | GaugeMetric | HistogramMetric;

// Tracing interfaces
export interface TraceSpan {
	traceId: string;
	spanId: string;
	parentSpanId?: string;
	operationName: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	status: 'active' | 'success' | 'error';
	tags: Record<string, string>;
	logs: TraceLog[];
	brandingValidated?: boolean; // For brAInwav compliance
}

export interface TraceLog {
	timestamp: number;
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
	fields?: Record<string, unknown>;
}

export interface TraceContext {
	traceId: string;
	spanId: string;
	baggage?: Record<string, string>;
}

// Metrics collector configuration
export interface MetricsConfig {
	enabled: boolean;
	bufferSize: number;
	flushInterval: number;
	enableSystemMetrics: boolean;
	customLabels: Record<string, string>;
	maxMetricsPerSecond: number;
}

// Tracing configuration
export interface TracingConfig {
	enabled: boolean;
	samplingRate: number;
	maxSpansPerTrace: number;
	spanRetentionTime: number;
	enableBrandingValidation: boolean; // For brAInwav compliance
}

/**
 * Metrics Collector with memory-bounded storage
 */
export class MetricsCollector extends EventEmitter {
	private config: MetricsConfig;
	private metrics: MemoryBoundedStore<Metric>;
	private flushTimer?: NodeJS.Timeout;
	private metricsPerSecond = 0;
	private isDestroyed = false;
	private lastFlush = 0;

	constructor(config: Partial<MetricsConfig> = {}) {
		super();

		this.config = {
			enabled: true,
			bufferSize: 10000,
			flushInterval: 30000, // 30 seconds
			enableSystemMetrics: true,
			customLabels: { service: 'brAInwav-cortex-agents' },
			maxMetricsPerSecond: 1000,
			...config,
		};

		this.metrics = new MemoryBoundedStore<Metric>({
			maxSize: this.config.bufferSize,
			ttlMs: 300000, // 5 minutes
			enableMetrics: false,
		});

		if (this.config.enabled) {
			this.startCollection();
		}
	}

	/**
	 * Get the last flush timestamp
	 */
	public getLastFlush(): number {
		return this.lastFlush;
	}

	/**
	 * Record a counter metric
	 */
	counter(name: string, value = 1, labels?: Record<string, string>): void {
		if (!this.config.enabled || this.isDestroyed) return;

		const metric: CounterMetric = {
			type: 'counter',
			name: this.addBrandingPrefix(name),
			value,
			unit: 'count',
			timestamp: Date.now(),
			labels: { ...this.config.customLabels, ...labels },
		};

		this.recordMetric(metric);
	}

	/**
	 * Record a gauge metric
	 */
	gauge(name: string, value: number, unit = 'count', labels?: Record<string, string>): void {
		if (!this.config.enabled || this.isDestroyed) return;

		const metric: GaugeMetric = {
			type: 'gauge',
			name: this.addBrandingPrefix(name),
			value,
			unit,
			timestamp: Date.now(),
			labels: { ...this.config.customLabels, ...labels },
		};

		this.recordMetric(metric);
	}

	/**
	 * Record a histogram metric
	 */
	histogram(
		name: string,
		value: number,
		buckets: number[] = [1, 5, 10, 25, 50, 100, 250, 500, 1000],
		unit = 'ms',
		labels?: Record<string, string>,
	): void {
		if (!this.config.enabled || this.isDestroyed) return;

		const metric: HistogramMetric = {
			type: 'histogram',
			name: this.addBrandingPrefix(name),
			value,
			unit,
			buckets,
			timestamp: Date.now(),
			labels: { ...this.config.customLabels, ...labels },
		};

		this.recordMetric(metric);
	}

	/**
	 * Get all metrics
	 */
	getMetrics(): Metric[] {
		return this.metrics
			.keys()
			.map((key) => this.metrics.get(key)!)
			.filter(Boolean);
	}

	/**
	 * Get metrics by name pattern
	 */
	getMetricsByPattern(pattern: RegExp): Metric[] {
		return this.getMetrics().filter((metric) => pattern.test(metric.name));
	}

	/**
	 * Flush metrics to configured destination
	 */
	async flush(): Promise<void> {
		const metrics = this.getMetrics();
		if (metrics.length === 0) return;

		try {
			console.log(`📊 brAInwav flushing ${metrics.length} metrics...`);

			// Emit flush event for custom handlers
			this.emit('flush', metrics);

			// Clear flushed metrics
			this.metrics.clear();
			this.lastFlush = Date.now();
		} catch (error) {
			throw new AgentError(
				'brAInwav metrics flush failed',
				ErrorCategory.UNKNOWN,
				ErrorSeverity.MEDIUM,
				{ error, metricsCount: metrics.length },
			);
		}
	}

	/**
	 * Get system metrics
	 */
	getSystemMetrics(): Record<string, number> {
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		return {
			'brAInwav.system.memory.heap_used': memUsage.heapUsed,
			'brAInwav.system.memory.heap_total': memUsage.heapTotal,
			'brAInwav.system.memory.external': memUsage.external,
			'brAInwav.system.memory.rss': memUsage.rss,
			'brAInwav.system.cpu.user': cpuUsage.user,
			'brAInwav.system.cpu.system': cpuUsage.system,
			'brAInwav.system.uptime': process.uptime(),
		};
	}

	/**
	 * Start automatic collection
	 */
	private startCollection(): void {
		// Flush timer
		this.flushTimer = setInterval(() => {
			this.flush().catch((error) => {
				console.error('brAInwav metrics flush error:', error);
			});
		}, this.config.flushInterval);

		// System metrics collection
		if (this.config.enableSystemMetrics) {
			setInterval(() => {
				const systemMetrics = this.getSystemMetrics();
				Object.entries(systemMetrics).forEach(([name, value]) => {
					this.gauge(name, value);
				});
			}, 10000); // Every 10 seconds
		}
	}

	/**
	 * Record a metric with rate limiting
	 */
	private recordMetric(metric: Metric): void {
		// Rate limiting
		this.metricsPerSecond++;
		if (this.metricsPerSecond > this.config.maxMetricsPerSecond) {
			return; // Drop metric
		}

		// Reset counter every second
		setTimeout(() => {
			this.metricsPerSecond = Math.max(0, this.metricsPerSecond - 1);
		}, 1000);

		this.metrics.set(`${metric.name}-${metric.timestamp}-${Math.random()}`, metric);

		this.emit('metric', metric);
	}

	/**
	 * Add brAInwav branding prefix to metric names
	 */
	private addBrandingPrefix(name: string): string {
		return name.startsWith('brAInwav.') ? name : `brAInwav.${name}`;
	}

	/**
	 * Cleanup and destroy collector
	 */
	destroy(): void {
		this.isDestroyed = true;

		if (this.flushTimer) {
			clearInterval(this.flushTimer);
		}

		this.metrics.destroy();
		this.removeAllListeners();
	}
}

/**
 * Distributed Tracing implementation
 */
export class TracingSystem extends EventEmitter {
	private config: TracingConfig;
	private activeSpans: MemoryBoundedStore<TraceSpan>;
	private completedSpans: MemoryBoundedStore<TraceSpan>;
	private isDestroyed = false;

	constructor(config: Partial<TracingConfig> = {}) {
		super();

		this.config = {
			enabled: true,
			samplingRate: 0.1, // 10% sampling
			maxSpansPerTrace: 100,
			spanRetentionTime: 3600000, // 1 hour
			enableBrandingValidation: true,
			...config,
		};

		this.activeSpans = new MemoryBoundedStore<TraceSpan>({
			maxSize: 1000,
			ttlMs: this.config.spanRetentionTime,
			enableMetrics: false,
		});

		this.completedSpans = new MemoryBoundedStore<TraceSpan>({
			maxSize: 10000,
			ttlMs: this.config.spanRetentionTime,
			enableMetrics: false,
		});
	}

	/**
	 * Get the tracing configuration
	 */
	public getConfig(): TracingConfig {
		return this.config;
	}

	/**
	 * Start a new trace span
	 */
	startSpan(
		operationName: string,
		parentContext?: TraceContext,
		tags: Record<string, string> = {},
	): TraceSpan {
		if (!this.config.enabled || this.isDestroyed) {
			return this.createNoOpSpan(operationName);
		}

		// Sampling decision
		if (Math.random() > this.config.samplingRate) {
			return this.createNoOpSpan(operationName);
		}

		const span: TraceSpan = {
			traceId: parentContext?.traceId || this.generateTraceId(),
			spanId: this.generateSpanId(),
			parentSpanId: parentContext?.spanId,
			operationName: this.addBrandingPrefix(operationName),
			startTime: performance.now(),
			status: 'active',
			tags: {
				...tags,
				'brAInwav.service': 'cortex-agents',
				'brAInwav.version': '1.0.0',
			},
			logs: [],
		};

		this.activeSpans.set(span.spanId, span);
		this.emit('span.started', span);

		return span;
	}

	/**
	 * Finish a trace span
	 */
	finishSpan(span: TraceSpan, error?: Error): void {
		if (!this.config.enabled || this.isDestroyed || span.endTime) {
			return;
		}

		span.endTime = performance.now();
		span.duration = span.endTime - span.startTime;
		span.status = error ? 'error' : 'success';

		if (error) {
			span.logs.push({
				timestamp: performance.now(),
				level: 'error',
				message: error.message,
				fields: { stack: error.stack },
			});
		}

		// Validate brAInwav branding if enabled
		if (this.config.enableBrandingValidation) {
			span.brandingValidated = this.validateSpanBranding(span);
		}

		// Move from active to completed
		this.activeSpans.delete(span.spanId);
		this.completedSpans.set(span.spanId, span);

		this.emit('span.finished', span);
	}

	/**
	 * Add log to span
	 */
	addSpanLog(
		span: TraceSpan,
		level: TraceLog['level'],
		message: string,
		fields?: Record<string, unknown>,
	): void {
		if (!this.config.enabled || this.isDestroyed) return;

		span.logs.push({
			timestamp: performance.now(),
			level,
			message: `brAInwav: ${message}`,
			fields,
		});
	}

	/**
	 * Add tags to span
	 */
	addSpanTags(span: TraceSpan, tags: Record<string, string>): void {
		if (!this.config.enabled || this.isDestroyed) return;

		Object.assign(span.tags, tags);
	}

	/**
	 * Get trace by ID
	 */
	getTrace(traceId: string): TraceSpan[] {
		const activeSpans = this.activeSpans
			.keys()
			.map((key) => this.activeSpans.get(key)!)
			.filter(Boolean);
		const completedSpans = this.completedSpans
			.keys()
			.map((key) => this.completedSpans.get(key)!)
			.filter(Boolean);
		const allSpans = [...activeSpans, ...completedSpans];

		return allSpans
			.filter((span) => span.traceId === traceId)
			.sort((a, b) => a.startTime - b.startTime);
	}

	/**
	 * Get active spans
	 */
	getActiveSpans(): TraceSpan[] {
		return this.activeSpans
			.keys()
			.map((key) => this.activeSpans.get(key)!)
			.filter(Boolean);
	}

	/**
	 * Get completed spans
	 */
	getCompletedSpans(): TraceSpan[] {
		return this.completedSpans
			.keys()
			.map((key) => this.completedSpans.get(key)!)
			.filter(Boolean);
	}

	/**
	 * Export traces for external systems
	 */
	exportTraces(format: 'jaeger' | 'zipkin' | 'otel' = 'otel'): unknown[] {
		const spans = this.getCompletedSpans();

		switch (format) {
			case 'jaeger':
				return this.toJaegerFormat(spans);
			case 'zipkin':
				return this.toZipkinFormat(spans);
			default:
				return this.toOpenTelemetryFormat(spans);
		}
	}

	/**
	 * Create a no-op span for disabled tracing
	 */
	private createNoOpSpan(operationName: string): TraceSpan {
		return {
			traceId: 'noop',
			spanId: 'noop',
			operationName,
			startTime: 0,
			endTime: 0,
			duration: 0,
			status: 'success',
			tags: {},
			logs: [],
		};
	}

	/**
	 * Generate unique trace ID
	 */
	public generateTraceId(): string {
		return `brAInwav-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	/**
	 * Generate unique span ID
	 */
	public generateSpanId(): string {
		return `span-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	/**
	 * Add brAInwav branding prefix to operation names
	 */
	private addBrandingPrefix(operationName: string): string {
		return operationName.startsWith('brAInwav.') ? operationName : `brAInwav.${operationName}`;
	}

	/**
	 * Validate brAInwav branding in span
	 */
	private validateSpanBranding(span: TraceSpan): boolean {
		const brandingPatterns = [
			/brAInwav/i,
			/brainwav/i, // Common misspelling
		];

		const hasOperationBranding = brandingPatterns.some((pattern) =>
			pattern.test(span.operationName),
		);

		const hasTagBranding = Object.values(span.tags).some((value) =>
			brandingPatterns.some((pattern) => pattern.test(value)),
		);

		const hasLogBranding = span.logs.some((log) =>
			brandingPatterns.some((pattern) => pattern.test(log.message)),
		);

		return hasOperationBranding || hasTagBranding || hasLogBranding;
	}

	/**
	 * Convert spans to OpenTelemetry format
	 */
	private toOpenTelemetryFormat(spans: TraceSpan[]): unknown[] {
		return spans.map((span) => ({
			traceId: span.traceId,
			spanId: span.spanId,
			parentSpanId: span.parentSpanId,
			name: span.operationName,
			startTimeUnixNano: span.startTime * 1000000,
			endTimeUnixNano: (span.endTime || span.startTime) * 1000000,
			attributes: span.tags,
			events: span.logs.map((log) => ({
				timeUnixNano: log.timestamp * 1000000,
				name: log.message,
				attributes: log.fields || {},
			})),
			status: {
				code: span.status === 'error' ? 2 : 1,
				message: span.status,
			},
		}));
	}

	/**
	 * Convert spans to Jaeger format
	 */
	private toJaegerFormat(spans: TraceSpan[]): unknown[] {
		const groupedByTrace = spans.reduce(
			(acc, span) => {
				if (!acc[span.traceId]) {
					acc[span.traceId] = [];
				}
				acc[span.traceId].push(span);
				return acc;
			},
			{} as Record<string, TraceSpan[]>,
		);

		return Object.entries(groupedByTrace).map(([traceId, traceSpans]) => ({
			traceID: traceId,
			spans: traceSpans.map((span) => ({
				spanID: span.spanId,
				parentSpanID: span.parentSpanId || '',
				operationName: span.operationName,
				startTime: span.startTime * 1000,
				duration: (span.duration || 0) * 1000,
				tags: Object.entries(span.tags).map(([key, value]) => ({
					key,
					value,
					type: 'string',
				})),
				logs: span.logs.map((log) => ({
					timestamp: log.timestamp * 1000,
					fields: [
						{ key: 'level', value: log.level },
						{ key: 'message', value: log.message },
						...Object.entries(log.fields || {}).map(([key, value]) => ({
							key,
							value: String(value),
						})),
					],
				})),
			})),
		}));
	}

	/**
	 * Convert spans to Zipkin format
	 */
	private toZipkinFormat(spans: TraceSpan[]): unknown[] {
		return spans.map((span) => ({
			traceId: span.traceId,
			id: span.spanId,
			parentId: span.parentSpanId,
			name: span.operationName,
			timestamp: span.startTime * 1000,
			duration: (span.duration || 0) * 1000,
			tags: span.tags,
			annotations: span.logs.map((log) => ({
				timestamp: log.timestamp * 1000,
				value: log.message,
			})),
		}));
	}

	/**
	 * Cleanup and destroy tracing system
	 */
	destroy(): void {
		this.isDestroyed = true;

		this.activeSpans.destroy();
		this.completedSpans.destroy();
		this.removeAllListeners();
	}
}

/**
 * Observability facade combining metrics and tracing
 */
export class ObservabilitySystem {
	public readonly metrics: MetricsCollector;
	public readonly tracing: TracingSystem;
	private isDestroyed = false;

	constructor(metricsConfig?: Partial<MetricsConfig>, tracingConfig?: Partial<TracingConfig>) {
		this.metrics = new MetricsCollector(metricsConfig);
		this.tracing = new TracingSystem(tracingConfig);
	}

	/**
	 * Decorator to automatically trace method calls
	 */
	traced<T extends (...args: unknown[]) => Promise<unknown>>(
		operationName: string,
		fn: T,
		context?: TraceContext,
	): T {
		return (async (...args: unknown[]) => {
			const span = this.tracing.startSpan(operationName, context);
			const startTime = performance.now();

			try {
				const result = await fn(...args);

				this.metrics.histogram(
					'brAInwav.operation.duration',
					performance.now() - startTime,
					undefined,
					'ms',
					{ operation: operationName },
				);

				this.metrics.counter('brAInwav.operation.success', 1, {
					operation: operationName,
				});

				this.tracing.finishSpan(span);
				return result;
			} catch (error) {
				this.metrics.counter('brAInwav.operation.error', 1, {
					operation: operationName,
				});

				this.tracing.finishSpan(span, error as Error);
				throw error;
			}
		}) as T;
	}

	/**
	 * Create trace context for distributed tracing
	 */
	createTraceContext(traceId?: string, spanId?: string): TraceContext {
		return {
			traceId: traceId || this.tracing.generateTraceId(),
			spanId: spanId || this.tracing.generateSpanId(),
		};
	}

	/**
	 * Get comprehensive system health metrics
	 */
	getHealthMetrics(): Record<string, unknown> {
		return {
			metrics: {
				totalCollected: this.metrics.getMetrics().length,
				lastFlush: this.metrics.getLastFlush(),
				systemMetrics: this.metrics.getSystemMetrics(),
			},
			tracing: {
				activeSpans: this.tracing.getActiveSpans().length,
				completedSpans: this.tracing.getCompletedSpans().length,
				samplingRate: this.tracing.getConfig().samplingRate,
			},
			brAInwav: {
				service: 'cortex-agents',
				version: '1.0.0',
				uptime: process.uptime(),
				timestamp: new Date().toISOString(),
			},
		};
	}

	/**
	 * Export all observability data
	 */
	export(): {
		metrics: Metric[];
		traces: unknown[];
		health: Record<string, unknown>;
	} {
		return {
			metrics: this.metrics.getMetrics(),
			traces: this.tracing.exportTraces(),
			health: this.getHealthMetrics(),
		};
	}

	/**
	 * Cleanup and destroy all observability components
	 */
	destroy(): void {
		if (this.isDestroyed) return;

		this.isDestroyed = true;
		this.metrics.destroy();
		this.tracing.destroy();
	}
}

// Create global observability instance
export const observability = new ObservabilitySystem();
