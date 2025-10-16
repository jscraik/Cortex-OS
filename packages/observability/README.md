# @cortex-os/observability

Utilities for structured logging, metrics, and tracing with ULID propagation for Cortex-OS services.

## Exporters

`initializeObservability(serviceName)` configures OpenTelemetry with exporters selected via environment variables:

- `TRACE_EXPORTER`: `otlp` (default), `jaeger`, or `console`
- `METRIC_EXPORTER`: `otlp` (default) or `console`

## Local viewer

For local development, `startConsoleViewer(serviceName)` emits spans and metrics to the console using the console exporters.

## Flamegraphs

`generateFlamegraph(entry, outputDir)` runs [`0x`](https://www.npmjs.com/package/0x) via `npx` to generate an HTML CPU flamegraph for a Node.js script.

## Production adoption audit

| Surface | OTEL exporter status | Notes |
| --- | --- | --- |
| **MCP Server (`@cortex-os/mcp-server`)** | ✅ Enabled when `OTEL_EXPORTER_OTLP_ENDPOINT` or `MCP_TRACE_EXPORTER=otlp` is set. | The bridge runtime lazily boots a NodeSDK with an OTLP trace exporter and the server initialization awaits it during startup, ensuring traces stream whenever the endpoint is configured.【F:packages/mcp-bridge/src/runtime/telemetry/tracing.ts†L19-L57】【F:packages/mcp-server/src/index.ts†L280-L320】 |
| **Connectors service (`cortex-connectors`)** | ✅ Enabled when `OTEL_EXPORTER_OTLP_ENDPOINT` is present. | The FastAPI service wires `configure_tracing` on boot, registering an OTLP span exporter bound to the configured collector URL for production runs.【F:packages/connectors/src/cortex_connectors/server.py†L27-L49】【F:packages/connectors/src/cortex_connectors/telemetry.py†L38-L45】 |
| **Memory API (`servers/memory-api`)** | ✅ Always on. | Fastify bootstraps an OTLP exporter-backed NodeSDK on startup and attaches request/response hooks to emit spans for every request in production.【F:servers/memory-api/src/server.ts†L1-L25】【F:servers/memory-api/src/observability/otel.ts†L1-L34】 |
| **ML Inference (`services/ml-inference`)** | ⚠️ Prometheus only. | The inference service exposes Prometheus metrics and dashboards but does not currently register an OpenTelemetry exporter, leaving distributed tracing gaps for this workload.【F:services/ml-inference/src/monitoring.py†L1-L178】【F:services/ml-inference/README.md†L1-L60】 |

### Smart Nx telemetry adoption

- The `nx-smart` wrapper enables OpenTelemetry spans, histograms, and counters whenever `NX_SMART_OTEL=1`, and the emitted metrics JSON now records the telemetry flag to make production adoption auditable in CI artifacts.【F:scripts/nx-smart.mjs†L16-L55】【F:scripts/nx-smart.mjs†L165-L211】
