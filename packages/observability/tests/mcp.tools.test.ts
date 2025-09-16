import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
        InMemoryObservabilityDataSource,
        ObservabilityOperationSchema,
        type ObservabilityTool,
        observabilityMcpTools,
        resetObservabilityDataSource,
        setObservabilityDataSource,
} from '../src/mcp/tools.js';

type ToolMap = Record<string, ObservabilityTool>;

const BASE_TIME = new Date('2024-04-02T10:00:00.000Z');
const RUN_IDS = {
        healthy: '01HZY0CBVJQ7K8M7X9PV1Y5ZB0',
        degraded: '01HZY0CBVJQ7K8M7X9PV1Y5ZB1',
        analytics: '01HZY0CBVJQ7K8M7X9PV1Y5ZB2',
} as const;

const iso = (minutesFromBase: number) =>
        new Date(BASE_TIME.getTime() + minutesFromBase * 60_000).toISOString();

const seedData = (store: InMemoryObservabilityDataSource) => {
        store.setTraces([
                {
                        traceId: 'trace-1',
                        service: 'api',
                        operation: 'GET /health',
                        status: 'success',
                        durationMs: 120,
                        runId: RUN_IDS.healthy,
                        startTime: iso(0),
                        endTime: iso(0.1),
                        tags: { env: 'prod', region: 'us-east' },
                },
                {
                        traceId: 'trace-2',
                        service: 'api',
                        operation: 'POST /orders',
                        status: 'error',
                        durationMs: 880,
                        runId: RUN_IDS.degraded,
                        startTime: iso(1),
                        endTime: iso(1.2),
                        tags: { env: 'prod', region: 'us-east', outcome: '500' },
                },
                {
                        traceId: 'trace-3',
                        service: 'analytics',
                        operation: 'process_batch',
                        status: 'success',
                        durationMs: 3200,
                        runId: RUN_IDS.analytics,
                        startTime: iso(5),
                        endTime: iso(5.5),
                        tags: { env: 'staging', region: 'eu-west' },
                },
        ]);

        store.setLogs([
                {
                        id: 'log-1',
                        timestamp: iso(0),
                        level: 'info',
                        component: 'api',
                        message: 'Health check request processed',
                        runId: RUN_IDS.healthy,
                        traceId: 'trace-1',
                        context: { latencyMs: 120, userId: 'system' },
                },
                {
                        id: 'log-2',
                        timestamp: iso(1),
                        level: 'error',
                        component: 'api',
                        message: 'Failed to create order because upstream timed out',
                        runId: RUN_IDS.degraded,
                        traceId: 'trace-2',
                        context: { latencyMs: 880, errorCode: 'E_UPSTREAM_TIMEOUT' },
                },
                {
                        id: 'log-3',
                        timestamp: iso(5),
                        level: 'warn',
                        component: 'analytics',
                        message: 'Processing time exceeded soft limit',
                        runId: RUN_IDS.analytics,
                        traceId: 'trace-3',
                        context: { latencyMs: 3200, batchSize: 1200 },
                },
        ]);

        store.setMetrics([
                {
                        name: 'http.requests',
                        value: 1,
                        type: 'counter',
                        timestamp: iso(0),
                        tags: { service: 'api', status: 'success' },
                },
                {
                        name: 'http.requests',
                        value: 1,
                        type: 'counter',
                        timestamp: iso(1),
                        tags: { service: 'api', status: 'error' },
                },
                {
                        name: 'http.latency',
                        value: 120,
                        type: 'histogram',
                        unit: 'ms',
                        timestamp: iso(0),
                        tags: { service: 'api', region: 'us-east' },
                },
                {
                        name: 'http.latency',
                        value: 880,
                        type: 'histogram',
                        unit: 'ms',
                        timestamp: iso(1),
                        tags: { service: 'api', region: 'us-east' },
                },
                {
                        name: 'http.latency',
                        value: 3200,
                        type: 'histogram',
                        unit: 'ms',
                        timestamp: iso(5),
                        tags: { service: 'analytics', region: 'eu-west' },
                },
        ]);

        store.setAlerts([
                {
                        alertId: 'alert-1',
                        rule: 'latency_slo_violation',
                        severity: 'high',
                        status: 'triggered',
                        message: 'p95 latency exceeded 500ms for api',
                        triggeredAt: iso(1.1),
                        runId: RUN_IDS.degraded,
                        tags: { service: 'api', team: 'core' },
                },
                {
                        alertId: 'alert-2',
                        rule: 'error_rate_spike',
                        severity: 'medium',
                        status: 'resolved',
                        message: 'Error rate recovered to normal thresholds',
                        triggeredAt: iso(2.2),
                        runId: RUN_IDS.degraded,
                        tags: { service: 'api', team: 'core' },
                },
        ]);

        store.setDashboards([
                {
                        dashboardId: 'api-health',
                        title: 'API Health Overview',
                        description: 'Latency, error rate, and saturation metrics for the API service',
                        tags: { service: 'api', team: 'core' },
                        lastUpdated: iso(12),
                        widgets: [
                                {
                                        id: 'latency-timeseries',
                                        type: 'timeseries',
                                        title: 'Latency (p95)',
                                        query: 'metric:http.latency{service:api}',
                                        layout: { x: 0, y: 0, w: 12, h: 6 },
                                },
                                {
                                        id: 'error-rate-stat',
                                        type: 'stat',
                                        title: 'Error rate (5m)',
                                        query:
                                                'metric:http.requests{status:error}/metric:http.requests{status:*}',
                                        layout: { x: 12, y: 0, w: 6, h: 6 },
                                },
                        ],
                },
                {
                        dashboardId: 'analytics-runtime',
                        title: 'Analytics Runtime Dashboard',
                        description: 'Batch processing observability signals',
                        tags: { service: 'analytics', team: 'insights' },
                        lastUpdated: iso(24),
                        widgets: [
                                {
                                        id: 'runtime-distribution',
                                        type: 'histogram',
                                        title: 'Batch runtime distribution',
                                        query: 'metric:http.latency{service:analytics}',
                                        layout: { x: 0, y: 0, w: 18, h: 6 },
                                },
                        ],
                },
        ]);
};

const toToolMap = (tools: ObservabilityTool[]): ToolMap =>
        tools.reduce<ToolMap>((acc, tool) => {
                acc[tool.name] = tool;
                return acc;
        }, {} as ToolMap);

describe('observability MCP tools', () => {
        let tools: ToolMap;
        let store: InMemoryObservabilityDataSource;

        beforeEach(() => {
                tools = toToolMap(observabilityMcpTools);
                store = new InMemoryObservabilityDataSource();
                seedData(store);
                setObservabilityDataSource(store);
        });

        afterEach(() => {
                resetObservabilityDataSource();
        });

        it('exposes observability tools with schemas and handlers', () => {
                expect(Object.keys(tools)).toEqual([
                        'observability_query_traces',
                        'observability_search_logs',
                        'observability_retrieve_metrics',
                        'observability_alerts',
                        'observability_dashboard',
                ]);

                for (const tool of Object.values(tools)) {
                        expect(typeof tool.description).toBe('string');
                        expect(typeof tool.handler).toBe('function');
                        expect(tool.inputSchema).toHaveProperty('parse');
                }
        });

        it('queries traces using filters and reports summary statistics', async () => {
                const tool = tools['observability_query_traces'];
                const response = await tool.handler({
                        service: 'api',
                        limit: 1,
                        timeRange: {
                                from: iso(-5),
                                to: iso(3),
                        },
                });

                const payload = JSON.parse(response.content[0].text);
                expect(payload.tool).toBe('observability_query_traces');
                expect(payload.matches.total).toBe(2);
                expect(payload.matches.returned).toBe(1);
                expect(payload.summary.errorRate).toBeCloseTo(0.5);
                expect(payload.summary.averageDurationMs).toBeCloseTo(500);
                expect(payload.traces[0].traceId).toBe('trace-2');
        });

        it('searches logs by text, level, and component', async () => {
                const tool = tools['observability_search_logs'];
                const response = await tool.handler({
                        level: 'error',
                        text: 'upstream timed out',
                        component: 'api',
                });

                const payload = JSON.parse(response.content[0].text);
                expect(payload.logs).toHaveLength(1);
                expect(payload.logs[0].id).toBe('log-2');
                expect(payload.counts.byLevel.error).toBe(1);
                expect(payload.logs[0].context).toMatchObject({ errorCode: 'E_UPSTREAM_TIMEOUT' });
        });

        it('retrieves metrics with aggregations and grouping', async () => {
                const tool = tools['observability_retrieve_metrics'];
                const response = await tool.handler({
                        name: 'http.latency',
                        statistic: 'avg',
                        groupBy: ['region'],
                        includeSamples: true,
                        limit: 2,
                });

                const payload = JSON.parse(response.content[0].text);
                expect(payload.series).toHaveLength(2);
                expect(payload.summary.value).toBeCloseTo(1433.333, 3);
                const apiSeries = payload.series.find((entry: any) => entry.group.region === 'us-east');
                expect(apiSeries.value).toBeCloseTo(550);
                expect(payload.samples).toHaveLength(2);
        });

        it('summarizes alert activity by severity and status', async () => {
                const tool = tools['observability_alerts'];
                const response = await tool.handler({
                        timeRange: {
                                from: iso(0.5),
                                to: iso(3),
                        },
                });

                const payload = JSON.parse(response.content[0].text);
                expect(payload.alerts).toHaveLength(2);
                expect(payload.counts.bySeverity.high).toBe(1);
                expect(payload.counts.byStatus.triggered).toBe(1);
        });

        it('provides dashboard metadata and widget inventory', async () => {
                const tool = tools['observability_dashboard'];
                const response = await tool.handler({ dashboardId: 'api-health' });

                const payload = JSON.parse(response.content[0].text);
                expect(payload.dashboard.dashboardId).toBe('api-health');
                expect(payload.dashboard.widgetCount).toBe(2);
                expect(payload.widgets[0].type).toBe('timeseries');
        });

        it('validates observability operations schema', () => {
                const operation = ObservabilityOperationSchema.parse({
                        tool: 'observability_query_traces',
                        params: {
                                service: 'api',
                                status: 'success',
                        },
                });

                expect(operation.tool).toBe('observability_query_traces');
                expect(() =>
                        ObservabilityOperationSchema.parse({
                                tool: 'observability_query_traces',
                                params: { limit: 0 },
                        }),
                ).toThrow();
        });
});
