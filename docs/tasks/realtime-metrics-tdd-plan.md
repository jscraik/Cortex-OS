# realtime-metrics-tdd-plan.md

## Goal

Expose realtime memory server metrics through brAInwav A2A events with contract-first validation and automated tests.

## Test Strategy

1. Add contract tests for a new `RealtimeMemoryMetricsEventSchema` under `libs/typescript/contracts`.
2. Extend the A2A publisher unit tests to cover `publishRealtimeMetrics` envelopes.
3. Add realtime server integration coverage confirming metrics snapshots trigger the publisher with validated data.
4. Ensure Vitest assertions verify brAInwav branding and envelope metadata for the metrics events.

## Implementation Plan

1. **Contracts**
   - Create `RealtimeMemoryMetricsEventSchema` capturing aggregate server metrics and per-connection summaries.
   - Export related typings in `libs/typescript/contracts` index files.
   - Provide contract tests ensuring schema rejects malformed metrics.
2. **Publisher Enhancements**
   - Introduce `publishRealtimeMetrics` on `MemoryA2AEventPublisher`, reusing `createEnvelope` for ID generation.
   - Refactor existing event creation to eliminate `Math.random()` usage.
   - Add tests validating envelope shape, type name (`memory.realtime.metrics`), and throttled batching behaviour.
3. **Server Integration**
   - Allow `RealtimeMemoryServer` to receive an optional metrics publisher dependency via constructor or config.
   - Implement a debounced snapshot emitter that packages aggregate metrics plus connection states through the publisher.
   - Emit snapshots on connect, disconnect, and significant metric changes (messages sent/received, queue depth updates).
   - Add integration tests using mocks to confirm the publisher is invoked with schema-compliant payloads.
4. **Tooling & Observability**
   - Introduce configuration toggles for snapshot cadence and ensure defaults avoid flooding.
   - Ensure emitted payloads include brAInwav-branded fields for status descriptions.

## Implementation Checklist

- [ ] Schema updates merged and exported from contracts package.
- [ ] Contract tests for metrics schema pass.
- [ ] Publisher emits metrics envelopes using `createEnvelope`.
- [ ] Realtime server publishes debounced metrics snapshots when enabled.
- [ ] New Vitest suites cover publisher and server metrics behaviour.
- [ ] Existing realtime tests remain green.
- [ ] Lint, typecheck, and security scans succeed.
