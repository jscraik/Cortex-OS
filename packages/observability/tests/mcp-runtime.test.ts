import { beforeEach, describe, expect, it } from 'vitest';
import {
	type AlertRule,
	createObservabilityToolRuntime,
	type DashboardDefinition,
	type LogRecord,
	type MetricRecord,
	type ObservabilityDataset,
	type TraceRecord,
} from '../src/mcp/runtime.js';
import { generateRunId } from '../src/ulids.js';

const start = '2024-01-01T00:00:00.000Z';
const second = '2024-01-01T00:00:30.000Z';
const third = '2024-01-01T00:00:30.500Z';
const minute = '2024-01-01T00:01:00.000Z';

function buildDataset(): ObservabilityDataset {
	const runId = generateRunId();
	const traces: TraceRecord[] = [
		{
			traceId: 'trace-1',
			service: 'api',
			operation: 'GET /users',
			status: 'success',
			durationMs: 120,
			startTime: start,
			endTime: '2024-01-01T00:00:00.120Z',
			tags: { env: 'prod', region: 'us-east-1' },
			runId,
		},
		{
			traceId: 'trace-2',
			service: 'api',
			operation: 'POST /users',
			status: 'error',
			durationMs: 340,
			startTime: second,
			endTime: '2024-01-01T00:00:30.340Z',
			tags: { env: 'prod', region: 'us-east-1' },
			runId,
		},
		{
			traceId: 'trace-3',
			service: 'worker',
			operation: 'process-job',
			status: 'success',
			durationMs: 90,
			startTime: minute,
			endTime: '2024-01-01T00:01:00.090Z',
			tags: { env: 'staging' },
			runId,
		},
	];

	const logs: LogRecord[] = [
		{
			id: 'log-1',
			level: 'error',
			message: 'Timeout from upstream dependency',
			timestamp: second,
			component: 'api',
			runId,
			traceId: 'trace-2',
			metadata: {
				token: 'secret-token',
				request: {
					userId: '123',
					details: { password: 'hunter2' },
				},
			},
		},
		{
			id: 'log-2',
			level: 'info',
			message: 'Processed request in 120ms',
			timestamp: third,
			component: 'api',
			runId,
			metadata: {
				duration: 120,
				correlationId: 'req-123',
			},
		},
		{
			id: 'log-3',
			level: 'warn',
			message: 'Retry scheduled',
			timestamp: '2024-01-01T00:00:35.000Z',
			component: 'worker',
			runId,
			metadata: {
				apiKey: 'test-api-key',
				attempt: 1,
			},
		},
	];

	const metrics: MetricRecord[] = [
		{
			name: 'latency_ms',
			value: 120,
			timestamp: second,
			labels: { service: 'api' },
		},
		{
			name: 'latency_ms',
			value: 340,
			timestamp: third,
			labels: { service: 'api' },
		},
		{
			name: 'error_rate',
			value: 0.05,
			timestamp: third,
			labels: { service: 'api' },
		},
	];

	const alerts: AlertRule[] = [
		{
			id: 'latency-high',
			metric: 'latency_ms',
			threshold: 200,
			comparison: '>',
			severity: 'high',
			message: 'Latency above 200ms',
			windowMs: 60_000,
			evaluation: 'avg',
			tags: { service: 'api' },
		},
	];

	const dashboards: DashboardDefinition[] = [
		{
			id: 'service-overview',
			title: 'Service Overview',
			defaultRangeMs: 3_600_000,
		},
	];

	return { traces, logs, metrics, alerts, dashboards };
}

describe('observability MCP runtime', () => {
	let dataset: ObservabilityDataset;

	beforeEach(() => {
		dataset = buildDataset();
	});

	it('queryTraces filters by service, status, tags, and time range', async () => {
		const runtime = createObservabilityToolRuntime({ dataset });
		const result = await runtime.queryTraces({
			service: 'api',
			status: 'error',
			tags: { env: 'prod' },
			startTime: start,
			endTime: '2024-01-01T00:00:40.000Z',
		});

		expect(result.totalMatches).toBe(1);
		expect(result.hasMore).toBe(false);
		expect(result.traces[0]?.traceId).toBe('trace-2');
	});

	it('searchLogs redacts sensitive metadata and respects limits', async () => {
		const runtime = createObservabilityToolRuntime({ dataset });
		const result = await runtime.searchLogs({
			query: 'timeout',
			limit: 5,
		});

		expect(result.totalMatches).toBe(1);
		expect(result.logs).toHaveLength(1);
		const metadata = result.logs[0]?.metadata as Record<string, unknown>;
		expect(metadata?.token).toBe('[REDACTED]');
		const request = metadata?.request as Record<string, unknown>;
		const details = request?.details as Record<string, unknown>;
		expect(details?.password).toBe('[REDACTED]');
	});

	it('getMetrics aggregates values according to requested mode', async () => {
		const runtime = createObservabilityToolRuntime({ dataset });
		const result = await runtime.getMetrics({
			name: 'latency_ms',
			aggregation: 'avg',
		});

		expect(result.totalMatches).toBe(1);
		const aggregation = result.metrics[0];
		expect(aggregation.summary.count).toBe(2);
		expect(aggregation.value).toBeCloseTo((120 + 340) / 2);
		expect(aggregation.summary.max).toBe(340);
	});

	it('evaluateAlert triggers rule and emits alert event', async () => {
		const events: Array<{ type: string; data: Record<string, unknown> }> = [];
		const runtime = createObservabilityToolRuntime({
			dataset,
			onEvent: (event) => events.push(event),
		});

		const outcome = await runtime.evaluateAlert({ alertId: 'latency-high' });

		expect(outcome.triggered).toBe(true);
		expect(outcome.currentValue).toBeGreaterThan(200);
		expect(events).toHaveLength(1);
		expect(events[0]?.type).toBe('observability.alert.triggered');
		expect(events[0]?.data.severity).toBe('high');
	});

	it('generateDashboard produces holistic telemetry summary', async () => {
		const runtime = createObservabilityToolRuntime({ dataset });
		const dashboard = await runtime.generateDashboard({
			dashboardId: 'service-overview',
			timeRange: {
				start,
				end: '2024-01-01T00:00:40.000Z',
			},
		});

		expect(dashboard.traces.total).toBe(2);
		expect(dashboard.traces.errors).toBe(1);
		expect(dashboard.logs.byLevel.error).toBe(1);
		const latencySummary = dashboard.metrics.find(
			(metric) => metric.name === 'latency_ms',
		);
		expect(latencySummary?.avg).toBeCloseTo((120 + 340) / 2);
		expect(dashboard.alerts[0]?.triggered).toBe(true);
		const sanitizedLogs = dashboard.logs.latest.map(
			(entry) => entry.metadata ?? {},
		);
		const redactedToken = sanitizedLogs.some(
			(metadata) =>
				(metadata as Record<string, unknown>)?.token === '[REDACTED]',
		);
		expect(redactedToken).toBe(true);
	});
});
