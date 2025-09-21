import type { Express, NextFunction, Request, Response } from 'express';

type Labels = Record<string, string>;

interface CounterSeries {
	labels: Labels;
	value: number;
}

interface HistogramSeries {
	labels: Labels;
	count: number;
	sum: number; // seconds
}

interface CounterMetric {
	name: string;
	help: string;
	series: Map<string, CounterSeries>; // key = serialized labels
}

interface HistogramMetric {
	name: string;
	help: string;
	series: Map<string, HistogramSeries>;
}

class MetricsRegistry {
	private readonly counters: Map<string, CounterMetric> = new Map();
	private readonly histograms: Map<string, HistogramMetric> = new Map();
	private readonly collectors: Array<() => string[]> = [];

	private labelsKey(labels?: Labels): string {
		if (!labels) return '';
		const entries = Object.entries(labels).sort(([a], [b]) => {
			if (a < b) return -1;
			if (a > b) return 1;
			return 0;
		});
		return entries.map(([k, v]) => `${k}=${v}`).join('|');
	}

	private serializeLabels(labels?: Labels): string {
		if (!labels || Object.keys(labels).length === 0) return '';
		const parts = Object.entries(labels)
			.sort(([a], [b]) => {
				if (a < b) return -1;
				if (a > b) return 1;
				return 0;
			})
			.map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`);
		return `{${parts.join(',')}}`;
	}

	counter(name: string, help: string): CounterMetric {
		const found = this.counters.get(name);
		if (found) return found;
		const created: CounterMetric = { name, help, series: new Map() };
		this.counters.set(name, created);
		return created;
	}

	histogram(name: string, help: string): HistogramMetric {
		const found = this.histograms.get(name);
		if (found) return found;
		const created: HistogramMetric = { name, help, series: new Map() };
		this.histograms.set(name, created);
		return created;
	}

	inc(name: string, help: string, delta = 1, labels?: Labels): void {
		const metric = this.counter(name, help);
		const key = this.labelsKey(labels);
		const series = metric.series.get(key) ?? { labels: labels ?? {}, value: 0 };
		series.value += delta;
		metric.series.set(key, series);
	}

	observe(name: string, help: string, valueSeconds: number, labels?: Labels): void {
		const metric = this.histogram(name, help);
		const key = this.labelsKey(labels);
		const series = metric.series.get(key) ?? { labels: labels ?? {}, count: 0, sum: 0 };
		series.count += 1;
		series.sum += valueSeconds;
		metric.series.set(key, series);
	}

	registerCollector(fn: () => string[]): void {
		this.collectors.push(fn);
	}

	expose(): string {
		const lines: string[] = [];
		// Counters
		for (const c of this.counters.values()) {
			lines.push(`# HELP ${c.name} ${c.help}`);
			lines.push(`# TYPE ${c.name} counter`);
			for (const s of c.series.values()) {
				const lbl = this.serializeLabels(s.labels);
				lines.push(`${c.name}${lbl} ${s.value}`);
			}
		}
		// Histograms (minimal exposition: _count and _sum), with labels
		for (const h of this.histograms.values()) {
			lines.push(`# HELP ${h.name} ${h.help}`);
			lines.push(`# TYPE ${h.name} histogram`);
			for (const s of h.series.values()) {
				const lbl = this.serializeLabels(s.labels);
				lines.push(`${h.name}_count${lbl} ${s.count}`);
				lines.push(`${h.name}_sum${lbl} ${s.sum}`);
			}
		}
		// Additional collectors (e.g., process metrics)
		for (const collect of this.collectors) {
			const extra = collect();
			for (const line of extra) lines.push(line);
		}
		return `${lines.join('\n')}\n`;
	}
}

const registry = new MetricsRegistry();

export interface MetricsOptions {
	metricsKeyEnv?: string; // Name of env var holding metrics API key
}

export interface AiMetrics {
	instrument<T>(toolName: string, fn: () => Promise<T>): Promise<T>;
}

export function applyMetrics(app: Express, options: MetricsOptions = {}): { ai: AiMetrics } {
	const metricsKeyEnv = options.metricsKeyEnv || 'METRICS_KEY';
	const httpCounterName = 'http_requests_total';
	const httpDurationName = 'http_request_duration_seconds';
	const aiCounterName = 'ai_operations_total';
	const aiDurationName = 'ai_operation_duration_seconds';

	// Process metrics collector
	registry.registerCollector(() => {
		const mem = process.memoryUsage();
		const cpu = process.cpuUsage();
		return [
			`# HELP process_uptime_seconds Process uptime in seconds`,
			`# TYPE process_uptime_seconds gauge`,
			`process_uptime_seconds ${process.uptime()}`,
			`# HELP process_resident_memory_bytes Resident memory size in bytes`,
			`# TYPE process_resident_memory_bytes gauge`,
			`process_resident_memory_bytes ${mem.rss}`,
			`# HELP process_heap_used_bytes V8 heap used in bytes`,
			`# TYPE process_heap_used_bytes gauge`,
			`process_heap_used_bytes ${mem.heapUsed}`,
			`# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds`,
			`# TYPE process_cpu_user_seconds_total counter`,
			`process_cpu_user_seconds_total ${cpu.user / 1e6}`,
			`# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds`,
			`# TYPE process_cpu_system_seconds_total counter`,
			`process_cpu_system_seconds_total ${cpu.system / 1e6}`,
		];
	});

	// HTTP middleware to track requests and durations
	app.use((req: Request, res: Response, next: NextFunction): void => {
		const started = process.hrtime.bigint();
		res.on('finish', () => {
			// Increment counter on response finish
			let routePath = `${req.baseUrl || ''}${req.path || ''}` || req.path || '';
			if (routePath.length === 0) routePath = '/';
			if (routePath.length > 1 && routePath.endsWith('/')) routePath = routePath.slice(0, -1);
			const labels = { status: String(res.statusCode), path: routePath };
			registry.inc(httpCounterName, 'HTTP request count', 1, labels);
			const ended = process.hrtime.bigint();
			const ns = Number(ended - started); // nanoseconds
			const seconds = ns / 1e9;
			registry.observe(httpDurationName, 'HTTP request duration seconds', seconds, labels);
		});
		next();
	});

	// Protected /metrics endpoint
	app.get('/metrics', (req: Request, res: Response) => {
		const provided = req.header('X-API-Key') || req.header('x-api-key') || '';
		const expected = process.env[metricsKeyEnv] || '';
		if (!expected || provided !== expected) {
			res.status(401).json({ error: 'Metrics key required' });
			return;
		}
		res.setHeader('Content-Type', 'text/plain; version=0.0.4');
		res.send(registry.expose());
	});

	// AI metrics helper
	const ai: AiMetrics = {
		async instrument<T>(toolName: string, fn: () => Promise<T>): Promise<T> {
			const started = process.hrtime.bigint();
			try {
				const result = await fn();
				const ended = process.hrtime.bigint();
				registry.inc(aiCounterName, 'Total AI operations', 1, { tool: toolName });
				const ns = Number(ended - started);
				const seconds = ns / 1e9;
				registry.observe(aiDurationName, 'AI operation duration seconds', seconds, {
					tool: toolName,
				});
				return result;
			} catch (err) {
				const ended = process.hrtime.bigint();
				registry.inc(aiCounterName, 'Total AI operations', 1, { tool: toolName });
				const ns = Number(ended - started);
				const seconds = ns / 1e9;
				registry.observe(aiDurationName, 'AI operation duration seconds', seconds, {
					tool: toolName,
				});
				throw err;
			}
		},
	};

	return { ai };
}

// Export minimal hooks for non-express modules (e.g., adapters) to record metrics safely
export const metrics = {
	incCounter(name: string, help: string, labels?: Record<string, string>, delta = 1) {
		registry.inc(name, help, delta, labels);
	},
};
