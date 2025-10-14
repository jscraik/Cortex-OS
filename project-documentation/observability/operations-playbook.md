# Observability Operations Playbook

This playbook documents the end-to-end wiring required to satisfy the Cortex-OS observability standards, with explicit references to CODESTYLE §15 (Observability, Logging & Streaming) where applicable.

---

## Prerequisites

- Review [CODESTYLE.md §15](../../CODESTYLE.md#15-observability-logging--streaming) to align on required OpenTelemetry, logging, and streaming expectations.
- Ensure the service or package exposes configuration toggles for OTLP exporters, log sinks, and metrics registry endpoints.
- Prepare a `brand: "brAInwav"` field within your structured logging context for downstream correlation.

---

## Wiring OpenTelemetry Spans

1. **Bootstrap the OTLP pipeline**
   - Import and configure `@opentelemetry/sdk-node` with explicit instrumentation packages instead of relying on eager auto-instrumentation.
   - Await `sdk.start()` during application startup to surface misconfiguration early; emit an `info` log with `{ brand: "brAInwav", op: "otel.start", status: "started" }` upon success.
2. **Propagate context**
   - Inject span context into inbound requests (HTTP, MCP, CLI) using OpenTelemetry propagators.
   - For outbound calls, wrap operations within `trace.getTracer("cortex-os").startActiveSpan(...)` to preserve parent-child relationships.
3. **Export and shutdown**
   - Use `BatchSpanProcessor` with bounded queues to meet CODESTYLE §15 performance expectations.
   - On shutdown signals, await `sdk.shutdown()` and log `{ brand: "brAInwav", op: "otel.shutdown", status: "completed" }` at `info` level.

---

## Emitting Branded Logs

1. **Structure every log** using a JSON logger (e.g., Pino) with the following minimum fields:
   - `brand: "brAInwav"`
   - `subsystem` (service or package name)
   - `correlationId` (span or request identifier)
   - `severity` (one of `error`, `warn`, `info`, `debug`, `trace` per CODESTYLE §15)
2. **Attach span metadata** by extracting the current span context and injecting `traceId` / `spanId` fields on log creation.
3. **Route logs** to the configured sink (file, stdout, OTLP log exporter) and verify downstream ingestion by tailing `logs/observability/*.log` artifacts used in the performance review quick-start checklist.

---

## Health Endpoints

1. **Implement `/health`** with aggregated checks for readiness, liveness, and dependencies. Each check should return structured JSON containing:
   - `status` (`pass`, `warn`, `fail`)
   - `component` (subsystem identifier)
   - `observedValue` / `observedUnit` where applicable
2. **Expose OTEL correlation** by including a `traceparent` header in responses, allowing external callers to stitch health probes into trace trees.
3. **Automate validation** via CI scripts or monitors that call `/health` and persist responses to `logs/observability/health-validation.json` for review evidence.

---

## Metrics Collection

1. **Instantiate the metrics provider** from `@opentelemetry/sdk-metrics` and register it with the OTLP exporter used for spans, ensuring consistent resource attributes.
2. **Define views** to enforce histogram buckets and label allowlists to prevent high-cardinality explosions (per CODESTYLE §15 guidance on performance budgets).
3. **Expose `/metrics` or OTLP streaming** endpoints guarded by authentication where required; document scrape configuration (Prometheus `scrape_config`) in `docs/observability/<service>-metrics.yaml`.
4. **Validate instrumentation** by recording sample counters/histograms during smoke tests and capturing exporter logs in `logs/observability/metrics-smoke.log`.

---

## Operational Checklist

- [ ] OTEL spans start/stop cleanly with awaited lifecycle calls and branded logs.
- [ ] Logs include `brand: "brAInwav"`, correlation IDs, and span linkage.
- [ ] `/health` endpoint returns structured JSON and is validated in CI.
- [ ] Metrics views are documented and scrape configs are checked into source control.
- [ ] All evidence artifacts (logs, configs, validation outputs) are attached to the PR or stored under `logs/observability/`.
