# API Reference

### `initializeObservability(serviceName, version?)`
Starts the OTEL NodeSDK with exporters selected via environment variables.

### `startConsoleViewer(serviceName, version?)`
For local debugging; forces console exporters.

### `withSpan(name, fn, options?)`
Runs `fn` inside a span and returns its result.

### `addRunIdToSpan(runId)`
Adds an existing run ID to the active span.

### `getCurrentTraceContext()`
Returns `{ runId, traceId, spanId }` for the current span.

### `generateFlamegraph(entry, outputDir)`
Profiles a Node script using `0x` and writes an HTML flamegraph.
