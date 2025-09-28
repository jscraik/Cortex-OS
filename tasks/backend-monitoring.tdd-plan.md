# backend-monitoring.tdd-plan.md

## Context & Goals

- Deliver `externalMonitoringService` for `apps/cortex-webui/backend` that emits brAInwav-branded authentication events.
   Target destinations include Prometheus, Datadog, New Relic, and an optional webhook.
- Replace the existing TODO in `authMonitoringService.emitToMonitoringSystems` with a concrete integration.
   Ensure current in-memory counters remain intact.
- Uphold brAInwav governance (branding, security, accessibility, and truthfulness) throughout the implementation.

## Preconditions & Assumptions

- Environment variables listed in `tasks/backend-monitoring.research.md` are injected via the existing configuration system.
   Missing secrets should trigger graceful opt-outs rather than crashes.
- Node 20 global `fetch`, `AbortController`, and existing logging utilities (`utils/logger.ts`) remain available.
- Prometheus exporter is already wired via `packages/observability`; adding new counters only requires registration through shared helpers.
- No new npm dependencies or CI/CD changes are permitted without explicit approval.

## Definition of Done

- All monitoring destinations receive correctly branded events when credentials/configuration are present.
- Prometheus counters increment even when downstream providers fail.
- Monitoring failures are logged with brAInwav wording at `warn` level and do not interrupt request handling.
- Vitest coverage stays at or above 90% for the touched modules.
- Documentation (README + CHANGELOG) reflects new environment variables and functionality.
- `pnpm lint`, `pnpm test`, `pnpm docs:lint`, `pnpm security:scan`, and `pnpm structure:validate` succeed locally.

## Test Strategy (TDD First)

### Unit Tests

1. `externalMonitoringService` happy path:
   - Given full configuration and a sample auth event, expect Prometheus counter increment, Datadog/New Relic webhook calls, and resolved promise.
2. Missing credential opt-outs:
   - Given no Datadog key, expect fetch not called for Datadog yet Prometheus counter still increments.
3. Provider failure resiliency:
   - Mock Datadog response as 500; expect warning log (with "brAInwav"), Prometheus increment, and promise resolution.
4. Timeout handling:
   - Simulate fetch timeout via `AbortController`; expect warning log and resolved promise.
5. Payload normalization:
   - Ensure vendor-specific payload builders include expected tags/fields (snapshot or structured assertions).

### Integration Tests

1. `authMonitoringService.emitToMonitoringSystems` delegation:
   - Spy on `externalMonitoringService.emitAuthEvent` to confirm forwarding and error swallowing.
2. Configuration validation:
   - Test startup/config loader to ensure invalid webhook URL (non-https) yields warning and skip.

### Accessibility & Observability Validation

- Ensure logs include brAInwav branding and structured context.
- Confirm metrics names follow `brainwav_*` prefix to align with observability dashboards.
- No direct UI changes; accessibility impact limited to ensuring logs and docs remain clear.

## Implementation Plan

### Phase 1: Scaffolding & Types

- Define `AuthMonitoringPayload` (if not already present) in a shared location or reuse existing type.
- Create `externalMonitoringService.ts` with configuration loader stubs and function signatures.
- Write failing unit tests covering configuration loading and service skeleton behavior.

### Phase 2: Prometheus Counter Integration

- Implement counter registration via `@cortex-os/observability` helpers.
- Ensure counter increments prior to outbound requests.
- Add tests validating counter increments for all code paths.

### Phase 3: Vendor Implementations

- Implement Datadog HTTP POST with markdown text and brAInwav tags.
- Implement New Relic event POST with proper headers and event naming.
- Implement optional webhook POST with schema-compliant JSON payload.
- Cover success and failure cases with mocks, verifying logs and behavior.

### Phase 4: Service Wiring & Delegation

- Inject new service into `authMonitoringService.emitToMonitoringSystems`.
- Update existing tests or add new ones ensuring delegation and non-blocking behavior.

### Phase 5: Documentation & Governance

- Document environment variables in `apps/cortex-webui/backend/README.md`.
- Add CHANGELOG entry summarizing the new outbound monitoring capability.
- Run full quality gates (`lint`, `test`, `docs:lint`, `security:scan`, `structure:validate`).

## Security Considerations

- Never log or emit secrets; redact environment-derived values in warnings.
- Validate outbound URLs (HTTPS only) to avoid data leakage.
- Use short timeout to prevent long-hanging network calls.

## Performance & Reliability Considerations

- Use sequential `await` for outbound providers to keep code simple; monitor for latency issues and note follow-up for batching if needed.
- Consider future circuit-breaker or retry strategies; document as backlog if not implemented now.

## Risks & Mitigations

- Misconfigured credentials leading to silent failures → add explicit info-level logs when provider is skipped.
- Vendor schema drift → isolate payload builder functions to ease updates and provide focused unit tests.
- Increased latency due to synchronous outbound calls → keep timeouts low and document potential async queue enhancement.

## Implementation Checklist

- [ ] Scaffold `externalMonitoringService.ts` with configuration parsing and TODO-marked fan-out logic (tests failing).
- [ ] Implement Prometheus counter registration and make corresponding tests pass.
- [ ] Implement Datadog integration with tests for success, skip, and failure paths.
- [ ] Implement New Relic integration with analogous tests.
- [ ] Implement optional webhook delivery with success/failure coverage.
- [ ] Integrate service into `authMonitoringService` and update/extend tests.
- [ ] Document environment variables and update CHANGELOG with brAInwav-branded entry.
- [ ] Run full quality gates (`pnpm lint`, `pnpm test`, `pnpm docs:lint`, `pnpm security:scan`, `pnpm structure:validate`).
