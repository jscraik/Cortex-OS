# A2A Outbox & DLQ Integration

## Summary

Implement full integration of the A2A Outbox + Dead Letter Queue (DLQ)
subsystem powering reliable delivery, retries, cleanup, and metrics surfaced
via MCP tool `a2a_outbox_sync`.

## Motivation

Currently the MCP tool returns placeholder metrics. Durable delivery, retry
logic, DLQ observability, and cleanup are needed for production‑grade
task/event flows and cross‑agent resilience.

## Goals

- Persistent outbox storage (SQLite initial implementation) with append + state transitions.
- Retry strategy (exponential backoff with jitter) and bounded max attempts.
- DLQ segregation + introspection (stats, oldest age, failure code histogram).
- Cleanup of aged succeeded + terminal failed entries.
- Telemetry (OpenTelemetry spans + counters + gauges) for each action.
- Error taxonomy alignment (validation vs transient vs fatal) with structured codes.
- Backpressure controls (batch size, max concurrent dispatches).
- Optional idempotency key support for enqueue operations.

## Non-Goals (Phase 1)

- Multi-tenant partitioning.
- Cross-process distributed locks.
- External queue integrations (Kafka/RabbitMQ) – future phase.
- Encryption at rest (assume trusted storage path for now).

## Acceptance Criteria

1. `a2a_outbox_sync` actions map to real logic:
   - processPending: dispatch queued items respecting concurrency + retries.
   - processRetries: process only retry‑eligible entries.
   - cleanup: purge entries older than configured retention (default 30 days)
     by status.
   - dlqStats: return { size, oldestAgeMs, byErrorCode: { CODE: count },
     recentSampleIds }.
2. All actions emit OpenTelemetry spans with attributes:
   - `a2a.outbox.action`, `a2a.outbox.batchSize`, `a2a.outbox.processed`, `a2a.outbox.failed`, `a2a.outbox.duration_ms`.
3. Zod schemas extended ONLY with optional fields (backward compatible) for new metrics.
4. Negative path tests simulate transient storage failure (retryable) vs fatal validation errors.
5. 95%+ coverage on new modules; no drop below repo threshold.
6. README updated (MCP section + architecture notes) with metrics examples.
7. Structured logging lines (JSON) for each action result when `A2A_OUTBOX_LOG=1`.
8. Batch + retry parameters configurable via env + programmatic options.
9. No use of `any`; strict types preserved.
10. No cross-feature boundary violations (contracts imported only from `@cortex-os/contracts`).

## Data Model (Proposed)

```ts
interface OutboxRecord {
  id: string;              // UUID
  kind: 'task' | 'event';  // or extend later
  payload: unknown;        // serialized envelope/task
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'dead_lettered';
  attempts: number;
  maxAttempts: number;     // configurable default
  lastErrorCode?: string;
  lastErrorMessage?: string;
  nextAttemptAt?: string;  // ISO timestamp
  createdAt: string;
  updatedAt: string;
  idempotencyKey?: string; // optional
}
```

## Retry Algorithm

- Base delay: `RETRY_BASE_MS` (default 1000)
- Backoff: `base * 2^(attempt-1)` capped at `RETRY_MAX_MS` (default 60_000)
- Jitter: random 0–20% additive
- Move to DLQ when `attempts >= maxAttempts`.

## DLQ Stats Fields (Optional Additions)

```ts
interface DlqStats {
  size: number;
  oldestAgeMs: number;
  byErrorCode: Record<string, number>;
  recentSampleIds: string[]; // last N (e.g., 5)
}
```

## Telemetry (Spans & Metrics)

Spans: `a2a.outbox.<action>`

Attributes:

- `outbox.processed`, `outbox.failed`, `outbox.succeeded`, `outbox.dead_lettered`
- `outbox.duration_ms`, `outbox.batch_size`, `outbox.action`
Counters/Gauges:

- Counter: `a2a_outbox_processed_total{action}`
- Counter: `a2a_outbox_failed_total{error_code}`
- Gauge: `a2a_outbox_pending` (on snapshot)

## Configuration

| Env Var | Default | Description |
| ------ | ------- | ----------- |
| `A2A_OUTBOX_BATCH_SIZE` | 25 | Max records processed per cycle |
| `A2A_OUTBOX_MAX_ATTEMPTS` | 5 | Retry ceiling before DLQ |
| `A2A_OUTBOX_RETRY_BASE_MS` | 1000 | Initial backoff base |
| `A2A_OUTBOX_RETRY_MAX_MS` | 60000 | Max backoff delay |
| `A2A_OUTBOX_RETENTION_DAYS` | 30 | Cleanup retention window |
| `A2A_OUTBOX_LOG` | 0 | Enable JSON action result logging |

## Module Layout

```
packages/a2a/src/outbox/
  repository.ts        // SQLite impl + interface
  service.ts           // High-level orchestration (process, retry, cleanup)
  retry-strategy.ts    // Pure backoff logic (unit tested)
  metrics.ts           // Telemetry helpers
  index.ts             // Re-exports
```

## Implementation Phases

1. Data model + repository (CRUD + query subsets)
2. Retry strategy + unit tests
3. Service orchestration (processPending/processRetries) + tests
4. Cleanup + DLQ stats queries
5. Telemetry + logging
6. Wire MCP tool + extend schemas
7. Documentation + examples update

## Testing Strategy

- Unit: repository (in-memory + sqlite), retry logic edge cases
- Integration: processPending happy path + transient failure simulation
- Contract: extended result schema optional fields accepted
- Performance: batch of 500 synthetic tasks processed < (configurable threshold)

## Migration / Backward Compatibility

- All added fields optional; no removal/renaming of existing result fields.
- Staged rollout: deploy repository + service before exposing new metrics fields.

## Risks

- Long-running batches blocking event loop → mitigate via chunked async loops.
- Growing DLQ without cleanup → mitigation: retention enforcement.
- Over-retry of permanently invalid messages → error code classification & DLQ escalation.

## Open Questions

- Should idempotency be enforced or best-effort? (Phase 1: best-effort)
- Need per-kind retry policies? (Future)

## Definition of Done

All acceptance criteria met; CI green; docs & examples updated; MCP tool
returns real metrics; no lint or type errors; >95% coverage for new code.

---
**Link this template in the tracking issue and update the TODO in `mcp/tools.ts` with the issue number.**
