import { EventEmitter } from 'node:events';

export interface RequestMetrics {
	total: number;
	success: number;
	error: number;
	latency: {
		avg: number;
		min: number;
		max: number;
		p95: number;
	};
}

export interface AgentMetrics {
	agentId: string;
	requests: number;
	errors: number;
	errorRate: number;
	avgLatency: number;
	activeSessions: number;
	lastUpdated: string;
}

export interface ResourceMetrics {
	memory: {
		used: number;
		total: number;
		percentage: number;
	};
	cpu: {
		usage: number;
	};
	disk: {
		used: number;
		total: number;
		percentage: number;
	};
	timestamp: string;
}

export interface MetricsConfig {
	retentionPeriod?: number;
	histogramBuckets?: number[];
	enablePrometheus?: boolean;
	prometheusPrefix?: string;
}

export class MetricsCollector extends EventEmitter {
	private config: Required<MetricsConfig>;
	private requestMetrics: Map<string, number[]> = new Map();
	private agentMetrics: Map<string, AgentMetrics> = new Map();
	private resourceMetrics: ResourceMetrics | null = null;
	private counters: Map<string, number> = new Map();
	private gauges: Map<string, number> = new Map();
	private histograms: Map<string, number[]> = new Map();
	private cleanupTimer?: NodeJS.Timeout;

	constructor(config: MetricsConfig = {}) {
		super();

		this.config = {
			retentionPeriod: config.retentionPeriod || 3600000, // 1 hour
			histogramBuckets: config.histogramBuckets || [0.1, 0.5, 1.0, 2.5, 5.0, 10.0],
			enablePrometheus: config.enablePrometheus ?? true,
			prometheusPrefix: config.prometheusPrefix || 'cortex_',
		};

		this.startCleanupTimer();
	}

	trackRequest(agentId: string, status: 'success' | 'error', latency: number): void {
		const key = `${agentId}:${status}`;
		const current = this.requestMetrics.get(key) || [];
		current.push(latency);

		// Keep only recent metrics based on retention period
		const filtered = current.filter(() => true); // In production, you'd timestamp each metric

		this.requestMetrics.set(key, filtered);

		// Update histogram
		const histogramKey = `request_duration_seconds`;
		const histogram = this.histograms.get(histogramKey) || [];
		histogram.push(latency / 1000); // Convert to seconds
		this.histograms.set(histogramKey, histogram);

		// Update counters
		const totalKey = 'requests_total';
		const currentTotal = this.counters.get(totalKey) || 0;
		this.counters.set(totalKey, currentTotal + 1);

		const statusKey = `requests_${status}_total`;
		const currentStatus = this.counters.get(statusKey) || 0;
		this.counters.set(statusKey, currentStatus + 1);

		// Emit event
		this.emit('requestTracked', {
			agentId,
			status,
			latency,
			timestamp: new Date().toISOString(),
		});
	}

	trackAgentMetrics(
		agentId: string,
		metrics: {
			requests: number;
			errors: number;
			avgLatency: number;
			activeSessions: number;
		},
	): void {
		const agentMetrics: AgentMetrics = {
			agentId,
			requests: metrics.requests,
			errors: metrics.errors,
			errorRate: metrics.requests > 0 ? metrics.errors / metrics.requests : 0,
			avgLatency: metrics.avgLatency,
			activeSessions: metrics.activeSessions,
			lastUpdated: new Date().toISOString(),
		};

		this.agentMetrics.set(agentId, agentMetrics);

		// Update gauges
		this.gauges.set('active_agents', this.getTotalActiveAgents());
		this.gauges.set(`agent_${agentId}_sessions`, metrics.activeSessions);

		this.emit('agentMetricsUpdated', agentMetrics);
	}

	trackResourceUsage(usage: {
		memory: { used: number; total: number; percentage: number };
		cpu: { usage: number };
		disk: { used: number; total: number; percentage: number };
	}): void {
		this.resourceMetrics = {
			...usage,
			timestamp: new Date().toISOString(),
		};

		// Update gauges
		this.gauges.set('memory_usage_percent', usage.memory.percentage);
		this.gauges.set('cpu_usage_percent', usage.cpu.usage);
		this.gauges.set('disk_usage_percent', usage.disk.percentage);

		this.emit('resourceMetricsUpdated', this.resourceMetrics);
	}

	incrementCounter(name: string, value = 1, labels?: Record<string, string>): void {
		const key = labels ? this.buildLabelledKey(name, labels) : name;
		const current = this.counters.get(key) || 0;
		this.counters.set(key, current + value);
	}

	setGauge(name: string, value: number, labels?: Record<string, string>): void {
		const key = labels ? this.buildLabelledKey(name, labels) : name;
		this.gauges.set(key, value);
	}

	getMetrics(): {
		requests: RequestMetrics;
		agents: AgentMetrics[];
		resources: ResourceMetrics | null;
		counters: Map<string, number>;
		gauges: Map<string, number>;
	} {
		const allLatencies = Array.from(this.requestMetrics.values()).flat();
		const requests: RequestMetrics = {
			total: this.counters.get('requests_total') || 0,
			success: this.counters.get('requests_success_total') || 0,
			error: this.counters.get('requests_error_total') || 0,
			latency: this.calculateLatencyStats(allLatencies),
		};

		return {
			requests,
			agents: Array.from(this.agentMetrics.values()),
			resources: this.resourceMetrics,
			counters: new Map(this.counters),
			gauges: new Map(this.gauges),
		};
	}

	getAgentMetrics(agentId: string): AgentMetrics | null {
		return this.agentMetrics.get(agentId) || null;
	}

	getResourceMetrics(): ResourceMetrics | null {
		return this.resourceMetrics;
	}

	async getPrometheusMetrics(): Promise<string> {
		if (!this.config.enablePrometheus) {
			return '';
		}

		const lines: string[] = [];

		// Add counters
		for (const [key, value] of this.counters) {
			const labels = this.extractLabels(key);
			const name = this.extractName(key);

			lines.push(`# HELP ${this.config.prometheusPrefix}${name} ${this.getHelpText(name)}`);
			lines.push(`# TYPE ${this.config.prometheusPrefix}${name} counter`);

			if (labels) {
				lines.push(`${this.config.prometheusPrefix}${name}{${labels}} ${value}`);
			} else {
				lines.push(`${this.config.prometheusPrefix}${name} ${value}`);
			}
		}

		// Add gauges
		for (const [key, value] of this.gauges) {
			const labels = this.extractLabels(key);
			const name = this.extractName(key);

			lines.push(`# HELP ${this.config.prometheusPrefix}${name} ${this.getHelpText(name)}`);
			lines.push(`# TYPE ${this.config.prometheusPrefix}${name} gauge`);

			if (labels) {
				lines.push(`${this.config.prometheusPrefix}${name}{${labels}} ${value}`);
			} else {
				lines.push(`${this.config.prometheusPrefix}${name} ${value}`);
			}
		}

		// Add histograms
		for (const [name, values] of this.histograms) {
			const buckets = this.config.histogramBuckets;
			const sortedValues = values.sort((a, b) => a - b);

			lines.push(`# HELP ${this.config.prometheusPrefix}${name} ${this.getHelpText(name)}`);
			lines.push(`# TYPE ${this.config.prometheusPrefix}${name} histogram`);

			// Add bucket counts
			for (const bucket of buckets) {
				const count = sortedValues.filter((v) => v <= bucket).length;
				lines.push(`${this.config.prometheusPrefix}${name}_bucket{le="${bucket}"} ${count}`);
			}

			// Add +Inf bucket
			lines.push(`${this.config.prometheusPrefix}${name}_bucket{le="+Inf"} ${values.length}`);

			// Add sum and count
			const sum = values.reduce((a, b) => a + b, 0);
			lines.push(`${this.config.prometheusPrefix}${name}_sum ${sum}`);
			lines.push(`${this.config.prometheusPrefix}${name}_count ${values.length}`);
		}

		return `${lines.join('\n')}\n`;
	}

	private calculateLatencyStats(latencies: number[]) {
		if (latencies.length === 0) {
			return { avg: 0, min: 0, max: 0, p95: 0 };
		}

		const sorted = latencies.sort((a, b) => a - b);
		const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
		const p95Index = Math.floor(sorted.length * 0.95);

		return {
			avg: Number(avg.toFixed(2)),
			min: sorted[0],
			max: sorted[sorted.length - 1],
			p95: sorted[p95Index] || sorted[sorted.length - 1],
		};
	}

	private getTotalActiveAgents(): number {
		let total = 0;
		for (const metrics of this.agentMetrics.values()) {
			total += metrics.activeSessions;
		}
		return total;
	}

	private buildLabelledKey(name: string, labels: Record<string, string>): string {
		const labelStr = Object.entries(labels)
			.map(([key, value]) => `${key}="${value}"`)
			.join(',');
		return `${name}{${labelStr}}`;
	}

	private extractLabelledKey(key: string): { name: string; labels?: Record<string, string> } {
		const match = key.match(/^(.+)\{(.+)\}$/);
		if (!match) {
			return { name: key };
		}

		const name = match[1];
		const labelStr = match[2];
		const labels: Record<string, string> = {};

		labelStr.split(',').forEach((pair) => {
			const [key, value] = pair.split('=');
			if (key && value) {
				labels[key.trim()] = value.replace(/"/g, '');
			}
		});

		return { name, labels };
	}

	private extractName(key: string): string {
		const { name } = this.extractLabelledKey(key);
		return name;
	}

	private extractLabels(key: string): string | null {
		const { labels } = this.extractLabelledKey(key);
		if (!labels || Object.keys(labels).length === 0) {
			return null;
		}

		return Object.entries(labels)
			.map(([key, value]) => `${key}="${value}"`)
			.join(',');
	}

	private getHelpText(name: string): string {
		const helpTexts: Record<string, string> = {
			requests_total: 'Total number of requests',
			requests_success_total: 'Total number of successful requests',
			requests_error_total: 'Total number of failed requests',
			request_duration_seconds: 'Request duration in seconds',
			active_agents: 'Current number of active agents',
			memory_usage_percent: 'Memory usage percentage',
			cpu_usage_percent: 'CPU usage percentage',
			disk_usage_percent: 'Disk usage percentage',
			agent_sessions: 'Number of active sessions per agent',
		};

		return helpTexts[name] || `Metric ${name}`;
	}

	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(() => {
			this.cleanupOldMetrics();
		}, this.config.retentionPeriod);
	}

	private cleanupOldMetrics(): void {
		// Clean up old metrics based on retention period
		// This is a simplified version - in production, you'd timestamp each metric
		this.requestMetrics.clear();
		this.histograms.clear();

		// Keep only recent agent metrics
		const cutoff = Date.now() - this.config.retentionPeriod;
		for (const [agentId, metrics] of this.agentMetrics) {
			const metricsTime = new Date(metrics.lastUpdated).getTime();
			if (metricsTime < cutoff) {
				this.agentMetrics.delete(agentId);
			}
		}

		this.emit('metricsCleaned', {
			timestamp: new Date().toISOString(),
			clearedCount: this.requestMetrics.size,
		});
	}

	destroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}
		this.removeAllListeners();
		this.requestMetrics.clear();
		this.agentMetrics.clear();
		this.counters.clear();
		this.gauges.clear();
		this.histograms.clear();
	}
}
