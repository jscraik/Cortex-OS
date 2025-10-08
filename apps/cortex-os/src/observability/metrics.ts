import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry });

const HTTP_REQUEST_TOTAL = new Counter({
	name: 'brainwav_http_requests_total',
	help: 'brAInwav total HTTP requests',
	labelNames: ['service', 'method', 'path', 'status'],
	registers: [registry],
});

const HTTP_REQUEST_DURATION_SECONDS = new Histogram({
	name: 'brainwav_http_request_duration_seconds',
	help: 'brAInwav HTTP request duration in seconds',
	labelNames: ['service', 'method', 'path', 'status'],
	buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
	registers: [registry],
});

export interface HttpMetricLabels {
	service: string;
	method: string;
	path: string;
	status: number;
	durationMs: number;
}

export function recordHttpMetrics({ service, method, path, status, durationMs }: HttpMetricLabels): void {
	const statusLabel = String(status);
	HTTP_REQUEST_TOTAL.labels(service, method, path, statusLabel).inc();
	HTTP_REQUEST_DURATION_SECONDS.labels(service, method, path, statusLabel).observe(durationMs / 1_000);
}

export function getMetricsSnapshot(): Promise<string> {
	return registry.metrics();
}

export function getMetricsContentType(): string {
	return registry.contentType;
}

export function resetMetricsForTest(): void {
	registry.resetMetrics();
}
