# Architecture

Components:

- **Tracing** – initializes the OpenTelemetry NodeSDK and spans with ULID context.
- **Metrics** – exports runtime metrics via OTLP or console readers.
- **Logging** – structured Pino logs annotated with run IDs.
- **Flamegraph** – wrapper around `0x` for CPU profiling.
- **ULID utilities** – generate and attach run identifiers to spans.
