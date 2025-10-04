import { beforeEach, describe, expect, it } from 'vitest';
import { createObservabilityToolHandlers, createObservabilityToolRuntime, } from '../src/mcp/runtime.js';
import { generateRunId } from '../src/ulids.js';
class FakeMcpClient {
    handlers;
    constructor(handlers) {
        this.handlers = handlers;
    }
    async callTool(name, input) {
        const handler = this.handlers[name];
        if (!handler) {
            throw new Error(`Unknown tool: ${name}`);
        }
        return handler(input);
    }
}
const baseStart = '2024-02-10T10:00:00.000Z';
const baseEnd = '2024-02-10T10:05:00.000Z';
function createDataset() {
    const runId = generateRunId();
    const traces = [
        {
            traceId: 'trace-alpha',
            service: 'api',
            operation: 'GET /status',
            status: 'success',
            durationMs: 180,
            startTime: baseStart,
            endTime: '2024-02-10T10:00:00.180Z',
            tags: { env: 'prod' },
            runId,
        },
        {
            traceId: 'trace-beta',
            service: 'api',
            operation: 'POST /status',
            status: 'error',
            durationMs: 420,
            startTime: '2024-02-10T10:01:00.000Z',
            endTime: '2024-02-10T10:01:00.420Z',
            tags: { env: 'prod' },
            runId,
        },
    ];
    const logs = [
        {
            id: 'log-alpha',
            level: 'error',
            message: 'Observed error log entry for request',
            timestamp: '2024-02-10T10:01:00.000Z',
            component: 'api',
            runId,
            traceId: 'trace-beta',
            metadata: {
                token: 'fake-test-token',
                requestId: 'req-1',
            },
        },
        {
            id: 'log-beta',
            level: 'info',
            message: 'Observed info log entry for health check',
            timestamp: '2024-02-10T10:02:00.000Z',
            component: 'api',
            runId,
            metadata: {
                correlationId: 'req-2',
            },
        },
    ];
    const metrics = [
        {
            name: 'latency_ms',
            value: 240,
            timestamp: '2024-02-10T10:01:00.000Z',
            labels: { service: 'api' },
        },
        {
            name: 'latency_ms',
            value: 380,
            timestamp: '2024-02-10T10:02:00.000Z',
            labels: { service: 'api' },
        },
    ];
    return {
        traces,
        logs,
        metrics,
        alerts: [
            {
                id: 'latency-spike',
                metric: 'latency_ms',
                threshold: 300,
                comparison: '>',
                severity: 'medium',
                message: 'Latency higher than expected',
                windowMs: 120_000,
                evaluation: 'avg',
                tags: { service: 'api' },
            },
        ],
        dashboards: [
            {
                id: 'service-overview',
                title: 'Service Overview',
                defaultRangeMs: 3_600_000,
            },
        ],
    };
}
describe('observability MCP integration', () => {
    let dataset;
    let events;
    beforeEach(() => {
        dataset = createDataset();
        events = [];
    });
    it('executes observability tools through the MCP client', async () => {
        const runtime = createObservabilityToolRuntime({ dataset });
        const client = new FakeMcpClient(createObservabilityToolHandlers(runtime));
        const response = await client.callTool('query_traces', {
            service: 'api',
            startTime: baseStart,
            endTime: baseEnd,
            limit: 5,
        });
        expect(response.traces.length).toBeGreaterThan(0);
        expect(response.totalMatches).toBe(2);
    });
    it('validates cross-package communication via alert events', async () => {
        const runtime = createObservabilityToolRuntime({
            dataset,
            onEvent: (event) => events.push(event),
        });
        const client = new FakeMcpClient(createObservabilityToolHandlers(runtime));
        const result = await client.callTool('evaluate_alert', {
            alertId: 'latency-spike',
        });
        expect(result.triggered).toBe(true);
        expect(events).toHaveLength(1);
        expect(events[0]?.type).toBe('observability.alert.triggered');
    });
    it('returns descriptive errors for invalid dashboard requests', async () => {
        const runtime = createObservabilityToolRuntime({ dataset });
        const client = new FakeMcpClient(createObservabilityToolHandlers(runtime));
        await expect(client.callTool('generate_dashboard', {
            dashboardId: 'unknown-dashboard',
        })).rejects.toThrow(/Dashboard not found/);
    });
    it('enforces limits to satisfy performance requirements', async () => {
        const runId = generateRunId();
        const noisyLogs = Array.from({ length: 220 }, (_, index) => ({
            id: `bulk-log-${index}`,
            level: index % 2 === 0 ? 'info' : 'error',
            message: `Bulk log entry number ${index}`,
            timestamp: `2024-02-10T10:${String(2 + Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}.000Z`,
            component: 'api',
            runId,
            metadata: { token: `token-${index}` },
        }));
        dataset.logs.push(...noisyLogs);
        const runtime = createObservabilityToolRuntime({ dataset });
        const client = new FakeMcpClient(createObservabilityToolHandlers(runtime));
        const response = await client.callTool('search_logs', {
            query: 'bulk log entry',
            limit: 200,
        });
        expect(response.logs.length).toBeLessThanOrEqual(100);
        expect(response.hasMore).toBe(true);
    });
    it('maintains security compliance for log search results', async () => {
        const runtime = createObservabilityToolRuntime({ dataset });
        const client = new FakeMcpClient(createObservabilityToolHandlers(runtime));
        const response = await client.callTool('search_logs', {
            query: 'error log entry',
            limit: 5,
        });
        const metadata = response.logs[0]?.metadata;
        expect(metadata?.token).toBe('[REDACTED]');
    });
});
//# sourceMappingURL=mcp-integration.test.js.map