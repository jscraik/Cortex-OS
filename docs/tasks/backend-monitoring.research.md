# backend-monitoring.research.md

## Research Objective

- Close the TODO in `apps/cortex-webui/backend/src/services/authMonitoringService.ts` by emitting brAInwav-branded authentication events.
  Downstream monitoring systems include Prometheus, Datadog, New Relic, and an optional custom webhook.
- Preserve current in-memory metrics while extending reach to external observability platforms without introducing placeholders or mock integrations.

## Current Code & Telemetry Patterns

- `authMonitoringService.ts` tallies auth activity and exposes `emitToMonitoringSystems`.
  The method currently logs a TODO and is the primary extension point for external monitoring.
- `a2a-integration.ts` shows the bus-publishing pattern and CloudEvents envelope construction used elsewhere in the backend.
- `utils/logger.ts` provides structured logging helpers that already enforce brAInwav wording.
- `packages/observability/src/metrics/index.ts` wraps OpenTelemetry counters and histograms that ship to Prometheus exporters.
  Reuse this tooling for consistent metric registration.

## External Services & APIs

- **Prometheus / OpenTelemetry**: reuse the shared meter factory to publish a counter (`auth_events_total`).
  Label the counter with `eventType`, `actorType`, and `status`.
- **Datadog**: send `POST https://api.datadoghq.com/api/v1/events` with `DD-API-KEY` plus optional `DD-APPLICATION-KEY`.
  Payload needs `title`, `text`, `tags`, and `alert_type`.
- **New Relic**: send `POST https://insights-collector.newrelic.com/v1/accounts/{accountId}/events` using header `X-Insert-Key`.
  Include `eventType` (for example, `BrAInwavAuthEvent`) and supporting fields in the body.
- **Custom analytics webhook** (optional): configurable URL that receives the canonical JSON payload via `POST`.
  Requests must set `Content-Type: application/json`.

## Constraints & Non-Negotiables

- All emitted logs, errors, and status strings must include "brAInwav" per repository governance.
- Functions must stay under the 40-line limit and keep named exports only.
- No new top-level dependencies; rely on global `fetch` (Node 20) and existing observability utilities.
- Failures must degrade gracefully: record Prometheus metrics even if external calls fail.
  Monitoring paths should never throw.
- Secrets (API keys) must come from env vars and never be logged.

## Proposed Integration Architecture

### 1. `externalMonitoringService`

- Expose `emitAuthEvent(event: AuthMonitoringPayload): Promise<void>` that fans out to Prometheus, Datadog, New Relic, and optional webhook.
- Normalize payload: `{ eventType, actorType, status, metadata, occurredAt }` plus derived `tags` for vendors.
- Wrap network calls in individual try/catch blocks, log `warn` with brAInwav wording on failure, and continue.

### 2. Prometheus Counter

- Add or reuse `createCounter` from `@cortex-os/observability` with metric name `brainwav_auth_events_total`.
  Keep the label set stable to avoid exploding time-series cardinality.
- Increment before outbound HTTP so Prometheus is always up to date.

### 3. Vendor Integrations

- **Datadog**: build payload with markdown-formatted `text`.
  Include tags such as `brAInwav`, `auth`, `status:<status>`, and `event:<eventType>` so dashboards filter activity quickly.
- **New Relic**: post an array with one event object.
  Include `brAInwavTenant` or similar metadata for filtering and analytics.
- **Webhook**: send canonical payload; treat non-2xx responses as failures.

### 4. Error Handling & Observability

- Use `logger.warn` with structured context `{ provider, statusCode, requestId }` and message referencing "brAInwav".
- Emit an additional meter for failure counts if time allows (stretch goal).

## Configuration Surface

- `AUTH_MONITORING_PROMETHEUS_ENABLED` (default true).
- `AUTH_MONITORING_DATADOG_API_KEY`, `AUTH_MONITORING_DATADOG_APP_KEY` (optional).
  `AUTH_MONITORING_DATADOG_SITE` defaults to `datadoghq.com`.
- `AUTH_MONITORING_NEW_RELIC_ACCOUNT_ID`, `AUTH_MONITORING_NEW_RELIC_INSERT_KEY`.
- `AUTH_MONITORING_WEBHOOK_URL` for custom analytics.
- `AUTH_MONITORING_TIMEOUT_MS` for outbound HTTP (fallback to 3_000 ms using `AbortController`).

## Security & Compliance Notes

- Validate config at startup; redact secrets in logs.
- Use HTTPS URLs only; reject non-https endpoints for the webhook.
- Send single-event payloads to avoid leaking unnecessary authentication data.

## Testing & Validation Strategy

- Unit tests for `externalMonitoringService` using `vi.spyOn(global, 'fetch')` mocks should verify:
  - Prometheus counter increments regardless of remote failures.
  - Datadog and New Relic payloads contain brAInwav tags and correct structures.
  - Missing credentials results in skipped calls with info-level logging.
- Integration test for `authMonitoringService.emitToMonitoringSystems` verifying delegation and error handling.
- Run the markdown/documentation lint suite to ensure this research doc passes.

## Implementation Checklist

- [ ] Create `src/services/externalMonitoringService.ts` with configuration loader and `emitAuthEvent` implementation.
- [ ] Add unit tests under `__tests__/services/externalMonitoringService.test.ts`.
- [ ] Wire the service into `authMonitoringService.emitToMonitoringSystems` and adjust existing tests.
- [ ] Document env vars in `apps/cortex-webui/backend/README.md` and update `CHANGELOG.md` if required.

## Open Questions & Follow-ups

- Confirm whether Cortex WebUI already exposes a Prometheus metrics endpoint or if additional wiring is necessary.
  This likely lives in `packages/observability`, but validation is required.
- Determine if rate limiting or exponential backoff is needed for Datadog or New Relic.
  That work is out of scope for the first pass but worth noting for follow-up.
- Clarify the retention/PII policy for auth event payloads to ensure no sensitive fields are forwarded.
