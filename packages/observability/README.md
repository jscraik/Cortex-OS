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
