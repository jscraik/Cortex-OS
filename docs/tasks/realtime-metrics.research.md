# realtime-metrics.research.md

## Research Objective

Design an approach for emitting realtime memory server metrics through the brAInwav A2A event stream while
preserving existing contract-driven validation.

## Repository Findings

- `packages/memories/src/adapters/server.realtime.ts` tracks aggregate `ConnectionMetrics` plus per-connection
  `RealtimeMemoryConnectionState` metrics. No external observer currently consumes this data.
- `libs/typescript/contracts/src/memory-realtime.ts` defines schemas for connection state, queued messages,
  and change events, but no dedicated A2A event contract exists for metrics exports.
- `packages/memories/src/a2a/event-publisher.ts` batches memory domain events and manually builds envelopes.
  It currently uses `Math.random()` for identifiers and does not include realtime metrics.
- `libs/typescript/contracts/src/observability-events.ts` provides a generic `MetricRecordedEventSchema`,
  which can inform tagging and payload expectations for metrics emitted via A2A.
- Attempted to use the agent-toolkit wrapper (`just scout`) for discovery, but the `just` command is not available
  in the active environment; falling back to repository tooling is currently required.

## External References

- `packages/a2a/a2a-contracts/src/envelope.ts` demonstrates the canonical `createEnvelope` helper (using
  `crypto.randomUUID`) and CloudEvents metadata we should adopt when emitting metrics.
- `packages/memories/src/a2a/types.ts` enumerates memory-domain event types and can be extended to cover realtime
  metrics without breaking the existing API.

## Constraints & Considerations

- All outbound messages and logs must include brAInwav branding.
- Functions must remain under 40 lines, use named exports, and rely on `async/await`.
- Metrics emission should avoid flood: prefer debounced snapshots tied to connection lifecycle or buffered intervals.
- The realtime server currently accepts only a `StreamingMemoryStore` and config; adding A2A publishing should
  remain optional to avoid breaking existing tests and integrations.
- Any new event schema must live in `libs/typescript/contracts` to keep cross-package communication contract-first.

## Proposed Direction

- Introduce a `RealtimeMemoryMetricsEventSchema` contract describing aggregate server metrics plus an array of connection state summaries.
- Extend `MemoryEventType` (or create a parallel metrics publisher interface) to include `memory.realtime.metrics`
  events and leverage the shared `createEnvelope` helper for consistent identifiers.
- Update `RealtimeMemoryServer` to accept an optional metrics publisher dependency, schedule debounced metrics
  snapshots, and emit events on connect/disconnect/message activity.
- Add Vitest coverage ensuring metrics envelopes are published with valid schema data and brAInwav-branded fields.
