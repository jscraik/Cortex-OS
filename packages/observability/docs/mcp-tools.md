# Observability MCP Tools

## Overview

`@cortex-os/observability` exposes Model Context Protocol contracts through the `observabilityMcpTools` export. Each entry pairs a tool name, description, and Zod input schema defined in [../src/mcp/tools.ts](../src/mcp/tools.ts) so registries can validate payloads before executing handlers. The four tools cover trace creation, metric ingestion, trace querying, and metric retrieval:

- `create_trace` — bootstrap distributed traces with ULID correlation.
- `record_metric` — capture metric samples with optional dimensions.
- `query_traces` — filter trace summaries by service, operation, or tags.
- `get_metrics` — fetch aggregated metrics for dashboards and alerts.

Handlers are intentionally left to integrators; reuse helpers exported from this package such as `withSpan`, `startConsoleViewer`, `createObservabilityEvent`, `recordLatency`, and the ULID utilities when wiring collectors like OTLP or Jaeger. This guide documents the schemas, response envelopes, error semantics, troubleshooting steps, and integration examples required by MCP Task 2.4.6.

## Tool Summary

| Tool | Description | Key inputs | Response payload |
| --- | --- | --- | --- |
| `create_trace` | Start or register a trace and correlate it with a Cortex run. | `traceId`, `operationName`, optional `tags`, optional `startTime`. | JSON string describing the trace context (`traceId`, `runId`, `operationName`, `startTime`, `tags`, `traceContext`). |
| `record_metric` | Record a metric data point via the OTEL meter API. | `name`, `value`, optional `tags`, optional `timestamp`. | JSON acknowledgement with the metric name, value, timestamp, and exporter routing metadata. |
| `query_traces` | Query stored traces by service, operation, window, or tags. | Optional `service`, `operation`, `startTime`, `endTime`, `tags`. | JSON list of matched trace summaries plus paging cursors. |
| `get_metrics` | Retrieve metrics with a server-side aggregation. | Optional `name`, `startTime`, `endTime`, `aggregation`. | JSON object with aggregated datapoints per time bucket and raw samples when requested. |

## Standard Response Envelope

Return MCP results using the shared text envelope so clients can parse responses consistently:

```json
{
  "success": true,
  "data": { "...tool specific payload..." },
  "error": null,
  "meta": {
    "tool": "create_trace",
    "correlationId": "01J7Z4F8M5YK3X9V6Q4S2",
    "timestamp": "2025-01-15T18:05:12.382Z"
  }
}
```

Stringify the object into `content[0].text` and include a `meta.correlationId` (for example via `generateRunId()`) so spans, logs, and MCP responses can be correlated. When a handler fails, set `success` to `false` and populate `error` with one of the codes listed below.

## Tool Details

### `create_trace`

Use this tool to initialise or register a distributed trace. Pair the schema with `withSpan()` so requests immediately produce ULID-backed spans and A2A events.

#### Input schema

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `traceId` | string | ✅ | External trace identifier. Supply a ULID or vendor-issued ID; fallback to the span's trace ID when omitted. |
| `operationName` | string | ✅ | Span/operation label displayed in Jaeger and dashboards. |
| `tags` | record<string, string> | ❌ | Key/value attributes that become OTEL span attributes and event metadata. |
| `startTime` | string (ISO-8601) | ❌ | Override the start timestamp; defaults to `new Date().toISOString()`. |

#### Recommended handler outline

```typescript
const args = createTraceTool.inputSchema.parse(input);
const trace = await withSpan(
  args.operationName,
  async (runId, traceContext) => ({
    traceId: args.traceId || traceContext.traceId,
    runId,
    traceContext,
    operationName: args.operationName,
    startTime: args.startTime ?? new Date().toISOString(),
    tags: args.tags ?? {},
  }),
  { attributes: args.tags },
);

return respond(createTraceTool.name, trace, { traceId: trace.traceId });
```

`respond()` is a helper shown in the usage section that wraps the payload in the standard envelope.

#### Success payload example

```json
{
  "success": true,
  "data": {
    "traceId": "trace-9d94",
    "runId": "01J7Z4F8M5YK3X9V6Q4S2",
    "traceContext": {
      "traceId": "d79e9c15b7d72221",
      "spanId": "a52f6b49ab364712",
      "runId": "01J7Z4F8M5YK3X9V6Q4S2"
    },
    "operationName": "ingest.batch",
    "startTime": "2025-01-15T18:05:12.382Z",
    "tags": {
      "service": "gateway",
      "deployment": "staging"
    }
  },
  "error": null,
  "meta": {
    "tool": "create_trace",
    "correlationId": "01J7Z4F8M5YK3X9V6Q4S2",
    "timestamp": "2025-01-15T18:05:12.382Z"
  }
}
```

### `record_metric`

Record OTEL metric samples with optional resource attributes. Combine the schema with `metrics.getMeter()` and helper utilities such as `recordLatency()` or `recordOperation()` when targeting built-in Cortex metrics.

#### Input schema

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | ✅ | Metric instrument name, e.g., `cortex_latency_ms` or `gateway_requests_total`. |
| `value` | number | ✅ | Measurement value. Cast to milliseconds, counts, or ratios based on the instrument. |
| `tags` | record<string, string> | ❌ | Dimensions applied as metric attributes (service, provider, outcome, etc.). |
| `timestamp` | string (ISO-8601) | ❌ | Custom sample timestamp; defaults to the handler execution time. |

#### Recommended handler outline

```typescript
const args = recordMetricTool.inputSchema.parse(input);
const catalog = new Map<string, { type: 'counter' | 'histogram'; unit?: string }>([
  ['cortex_latency_ms', { type: 'histogram', unit: 'ms' }],
  ['cortex_operations_total', { type: 'counter' }],
]);
const meter = metrics.getMeter('@cortex-os/observability/mcp');
const settings = catalog.get(args.name) ?? { type: 'histogram' };

if (settings.type === 'counter') {
  const counter = meter.createCounter(args.name, { unit: settings.unit });
  counter.add(args.value, args.tags);
} else {
  const histogram = meter.createHistogram(args.name, { unit: settings.unit });
  histogram.record(args.value, args.tags);
}

return respond(recordMetricTool.name, {
  recorded: true,
  name: args.name,
  value: args.value,
  timestamp: args.timestamp ?? new Date().toISOString(),
  tags: args.tags ?? {},
});
```

#### Success payload example

```json
{
  "success": true,
  "data": {
    "recorded": true,
    "name": "cortex_latency_ms",
    "value": 125.4,
    "timestamp": "2025-01-15T18:05:12.382Z",
    "tags": {
      "operation": "ingest",
      "status": "success"
    }
  },
  "error": null,
  "meta": {
    "tool": "record_metric",
    "correlationId": "01J7Z4F8M5YK3X9V6Q4S2",
    "timestamp": "2025-01-15T18:05:12.382Z"
  }
}
```

### `query_traces`

Bridge MCP requests to your trace backend (Jaeger, Tempo, OpenSearch, etc.). Filter spans with the optional fields and return compact summaries so clients can present results quickly.

#### Input schema

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `service` | string | ❌ | Service name to filter traces (maps to `service.name`). |
| `operation` | string | ❌ | Operation/span name filter. |
| `startTime` | string (ISO-8601) | ❌ | Inclusive lower bound. Convert to backend-specific epoch format. |
| `endTime` | string (ISO-8601) | ❌ | Exclusive upper bound. Defaults to now when omitted. |
| `tags` | record<string, string> | ❌ | Tag filters encoded per backend (for example, Jaeger `tags` query param). |

#### Recommended handler outline

```typescript
const args = queryTracesTool.inputSchema.parse(input);
const baseUrl = process.env.JAEGER_QUERY_URL ?? 'http://localhost:16686';
const params = new URLSearchParams();
if (args.service) params.set('service', args.service);
if (args.operation) params.set('operation', args.operation);
if (args.startTime) params.set('start', Date.parse(args.startTime).toString());
if (args.endTime) params.set('end', Date.parse(args.endTime).toString());
if (args.tags && Object.keys(args.tags).length) {
  params.set('tags', JSON.stringify(args.tags));
}
const response = await fetch(`${baseUrl}/api/traces?${params.toString()}`);
if (!response.ok) {
  throw respondError('query_traces', 'E_BACKEND_UNAVAILABLE', `Trace backend responded with ${response.status}`);
}
const body = await response.json();
const matches = body.data.map((trace: any) => ({
  traceId: trace.traceID,
  durationMs: Number(trace.duration) / 1000,
  startTime: new Date(Number(trace.startTime) / 1000).toISOString(),
  service: trace.processes?.[trace.data?.[0]?.processID]?.serviceName,
  operations: [...new Set(trace.spans.map((span: any) => span.operationName))],
}));

return respond(queryTracesTool.name, { matches, total: matches.length });
```

Use `respondError()` (see usage section) to emit structured failures when the backend is unreachable.

#### Success payload example

```json
{
  "success": true,
  "data": {
    "total": 2,
    "matches": [
      {
        "traceId": "d79e9c15b7d72221",
        "durationMs": 845.2,
        "startTime": "2025-01-15T18:04:51.000Z",
        "service": "gateway",
        "operations": ["ingest.batch", "rag.query"]
      }
    ]
  },
  "error": null,
  "meta": {
    "tool": "query_traces",
    "correlationId": "01J7Z4F8M5YK3X9V6Q4S2",
    "timestamp": "2025-01-15T18:05:12.382Z"
  }
}
```

### `get_metrics`

Expose aggregated metrics by calling your collector (Prometheus, Cortex, OTLP backend) and returning time-series data alongside the chosen aggregation.

#### Input schema

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | ❌ | Metric name to query. When omitted return a curated dashboard set. |
| `startTime` | string (ISO-8601) | ❌ | Lower bound of the query window. |
| `endTime` | string (ISO-8601) | ❌ | Upper bound of the query window; defaults to now. |
| `aggregation` | enum(`sum`, `avg`, `count`, `max`, `min`) | ❌ | Aggregation function to apply server side. |

#### Recommended handler outline

```typescript
const args = getMetricsTool.inputSchema.parse(input);
const baseUrl = process.env.PROMETHEUS_QUERY_URL ?? 'http://localhost:9090';
const query = args.name ? `${args.aggregation ?? 'avg'}(${args.name})` : 'up';
const params = new URLSearchParams({
  query,
  start: (args.startTime ? Date.parse(args.startTime) : Date.now() - 15 * 60_000) / 1000 + '',
  end: (args.endTime ? Date.parse(args.endTime) : Date.now()) / 1000 + '',
  step: '60',
});
const response = await fetch(`${baseUrl}/api/v1/query_range?${params.toString()}`);
if (!response.ok) {
  throw respondError('get_metrics', 'E_BACKEND_UNAVAILABLE', `Metrics backend responded with ${response.status}`);
}
const body = await response.json();
const series = body.data.result.map((entry: any) => ({
  labels: entry.metric,
  points: entry.values.map(([ts, value]: [number, string]) => ({
    timestamp: new Date(ts * 1000).toISOString(),
    value: Number(value),
  })),
}));

return respond(getMetricsTool.name, {
  name: args.name ?? query,
  aggregation: args.aggregation ?? 'avg',
  series,
});
```

#### Success payload example

```json
{
  "success": true,
  "data": {
    "name": "cortex_latency_ms",
    "aggregation": "avg",
    "series": [
      {
        "labels": { "operation": "ingest", "service": "gateway" },
        "points": [
          { "timestamp": "2025-01-15T18:00:00.000Z", "value": 112.4 },
          { "timestamp": "2025-01-15T18:01:00.000Z", "value": 118.9 }
        ]
      }
    ]
  },
  "error": null,
  "meta": {
    "tool": "get_metrics",
    "correlationId": "01J7Z4F8M5YK3X9V6Q4S2",
    "timestamp": "2025-01-15T18:05:12.382Z"
  }
}
```

## Error Codes

| Code | Trigger | Remediation |
| --- | --- | --- |
| `E_OBSERVABILITY_VALIDATION` | Zod schema validation fails before handler execution. | Inspect `error.details`, fix missing/invalid fields, and retry. |
| `E_TRACE_EXPORT_FAILED` | Span exporter throws (e.g., OTLP/Jaeger unavailable) while serving `create_trace`. | Verify `TRACE_EXPORTER` configuration, network reachability, and collector health. |
| `E_METRIC_EXPORT_FAILED` | Meter exporter rejects the sample in `record_metric` (collector offline or type mismatch). | Confirm `METRIC_EXPORTER` configuration, instrument type, and retry when backend is healthy. |
| `E_BACKEND_UNAVAILABLE` | Downstream trace or metrics backend returns a non-2xx status. | Check connectivity to Jaeger/Prometheus, validate credentials, or failover to console exporters. |
| `E_QUERY_TIMEOUT` | Trace or metrics backend exceeded the configured timeout window. | Increase backend timeout, reduce result window, or paginate requests. |

## Troubleshooting

- **No traces appear in Jaeger or OTLP** — ensure `TRACE_EXPORTER` is set (`jaeger`, `console`, or default OTLP) before calling `initializeObservability()`, and fall back to `startConsoleViewer()` for local verification.
- **Metrics are accepted but dashboards remain empty** — confirm `METRIC_EXPORTER` matches your collector, reuse the same instrument type per metric, and check the exporter logs for `E_METRIC_EXPORT_FAILED` errors.
- **Schema validation failures (`E_OBSERVABILITY_VALIDATION`)** — log the parsed issues from `tool.inputSchema.safeParse(input)` to reveal which fields violate the contract.
- **Backend query errors** — inspect Jaeger/Prometheus responses when emitting `E_BACKEND_UNAVAILABLE` and consider narrowing the time range to avoid `E_QUERY_TIMEOUT` on large windows.

## Usage Examples

The helper below wraps payloads in the standard envelope and centralises error handling for contract tests:

```typescript
import { generateRunId, observabilityMcpTools } from '@cortex-os/observability';

type Envelope = {
  content: Array<{ type: 'text'; text: string }>;
  metadata: Record<string, unknown>;
};

export function respond(tool: string, data: unknown, meta: Record<string, unknown> = {}): Envelope {
  const timestamp = new Date().toISOString();
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data,
          error: null,
          meta: { tool, correlationId: generateRunId(), timestamp, ...meta },
        }),
      },
    ],
    metadata: { tool, timestamp },
  };
}

export function respondError(tool: string, code: string, message: string, details: string[] = []): never {
  const timestamp = new Date().toISOString();
  throw {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          data: null,
          error: { code, message, details },
          meta: { tool, correlationId: generateRunId(), timestamp },
        }),
      },
    ],
    metadata: { tool, timestamp },
  };
}

const recordMetricTool = observabilityMcpTools.find((tool) => tool.name === 'record_metric')!;
const args = recordMetricTool.inputSchema.parse({
  name: 'cortex_latency_ms',
  value: 123.4,
  tags: { operation: 'ingest' },
});
const envelope = respond(recordMetricTool.name, {
  recorded: true,
  name: args.name,
  value: args.value,
  tags: args.tags,
});
const payload = JSON.parse(envelope.content[0].text);
console.log('Metric payload', payload.data);
```

## Integration Examples

### Register with `@cortex-os/mcp-core`

```typescript
import { metrics } from '@opentelemetry/api';
import { observabilityMcpTools, withSpan } from '@cortex-os/observability';
import { ToolRegistry } from '@cortex-os/mcp-core';

const registry = new ToolRegistry();
const meter = metrics.getMeter('@cortex-os/observability/mcp');

for (const tool of observabilityMcpTools) {
  registry.register({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    async execute(input) {
      const args = tool.inputSchema.parse(input);
      switch (tool.name) {
        case 'create_trace': {
          const trace = await withSpan(args.operationName, async (runId, ctx) => ({
            traceId: args.traceId || ctx.traceId,
            runId,
            traceContext: ctx,
            startTime: args.startTime ?? new Date().toISOString(),
            tags: args.tags ?? {},
          }), { attributes: args.tags });
          return respond(tool.name, trace, { traceId: trace.traceId });
        }
        case 'record_metric': {
          const histogram = meter.createHistogram(args.name);
          histogram.record(args.value, args.tags);
          return respond(tool.name, {
            recorded: true,
            name: args.name,
            value: args.value,
            tags: args.tags ?? {},
          });
        }
        case 'query_traces':
          return handleQueryTraces(args);
        case 'get_metrics':
          return handleGetMetrics(args);
        default:
          return respond(tool.name, {});
      }
    },
  });
}
```

`handleQueryTraces` and `handleGetMetrics` are thin wrappers around the HTTP examples shown earlier.

### Expose via `@modelcontextprotocol/sdk`

```typescript
import { observabilityMcpTools } from '@cortex-os/observability';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({ name: 'observability', version: '0.1.0' });
const handlers = new Map(observabilityMcpTools.map((tool) => [tool.name, createHandlerFor(tool.name)]));

for (const tool of observabilityMcpTools) {
  server.tool(tool.name, tool.description, tool.inputSchema, async (input) => {
    const handler = handlers.get(tool.name);
    if (!handler) {
      return respondError(tool.name, 'E_OBSERVABILITY_VALIDATION', 'Handler not configured');
    }
    return handler(tool.inputSchema.parse(input));
  });
}

await server.connect(new StdioServerTransport());
```

Provide `createHandlerFor()` functions that use the snippets above to bridge MCP calls into your preferred telemetry backend.
