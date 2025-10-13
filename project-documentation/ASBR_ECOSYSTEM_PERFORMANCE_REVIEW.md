# Research Document: ASBR Ecosystem Performance Review

**Task ID**: `packages-asbr-performance-review`
**Created**: 2025-10-13
**Researcher**: AI Agent
**Status**: Complete

---

## Objective

Document current performance characteristics and bottlenecks within the packages/asbr runtime so we can prioritize optimizations that preserve the 250 ms p95 latency budget while scaling connector orchestration and event delivery.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/asbr/src/api/server.ts`
- **Current Approach**: Single-process Express server maintains task, profile, artifact, event, and idempotency state in memory with optional token-bucket rate limiting and SSE/WebSocket fan-out managed through the shared event manager.
- **Limitations**:
  - Event delivery path stores per-task buffers and a global array, then walks every subscription on each emit, resulting in O(n·m) fan-out while synchronously appending to disk-backed NDJSON ledgers. 【F:packages/asbr/src/core/events.ts†L61-L197】【F:packages/asbr/src/core/events.ts†L360-L437】
  - Task lifecycle endpoints share an in-memory `Map` with no eviction policy beyond manual mutation, so long-running sessions can exhaust the 256 MB budget under sustained load. 【F:packages/asbr/src/api/server.ts†L96-L185】
  - Service-map endpoint rereads and reparses the manifest on every call, rebuilding signatures synchronously even though manifests only change when regenerated. 【F:packages/asbr/src/api/server.ts†L325-L369】
  - SSE `/v1/events` handler flattens every task’s buffered events on each request, forcing quadratic growth as history increases. 【F:packages/asbr/src/api/server.ts†L215-L274】

### Related Components
- **Event Manager**: `packages/asbr/src/core/events.ts` — Handles subscription lifecycle, persistence, and clean-up; today lacks batching, jittered heartbeats, and async persistence queues, making file I/O part of the hot path. 【F:packages/asbr/src/core/events.ts†L61-L233】【F:packages/asbr/src/core/events.ts†L360-L437】
- **Connector Manifest Loader**: `packages/asbr/src/connectors/manifest.ts` — Iterates through candidate paths sequentially, parses JSON, sorts connectors, and signs payloads per request without caching. 【F:packages/asbr/src/connectors/manifest.ts†L31-L137】【F:packages/asbr/src/connectors/manifest.ts†L180-L245】
- **SDK Client**: `packages/asbr/src/sdk/index.ts` — Opens one NodeEventSource per subscription and reconnects sequentially with doubling backoff, so multiple task listeners from the same process create redundant SSE streams. 【F:packages/asbr/src/sdk/index.ts†L24-L194】【F:packages/asbr/src/sdk/index.ts†L221-L309】

### brAInwav-Specific Context
- **MCP Integration**: Connector manifests are signed and exposed through `/v1/connectors/service-map`, making caching tricky because manifests double as trust anchors; optimization must preserve signature rotation semantics. 【F:packages/asbr/src/api/server.ts†L325-L369】
- **A2A Events**: Event manager currently emits to WebSockets and SSE but lacks hooks for downstream bus fan-out, so any async batching must keep `emitEvent` semantics synchronous for callers today. 【F:packages/asbr/src/core/events.ts†L120-L197】
- **Local Memory**: Runtime persists events to `ledger.ndjson` via append-only writes, aligning with the broader memory governance but pushing synchronous disk pressure into the request lifecycle. 【F:packages/asbr/src/core/events.ts†L360-L383】
- **Existing Patterns**: Other packages (e.g., memory, RAG) are adopting async refresh + cache warmers; aligning ASBR with that pattern would simplify cross-ecosystem observability.

---

## External Standards & References

### Industry Standards
1. **IETF RFC 9110 (HTTP Semantics)**
   - **Relevance**: Emphasizes response caching directives and connection reuse that we currently approximate manually inside Express.
   - **Key Requirements**:
     - Prefer keep-alive agents and respect `Cache-Control` hints.
     - Avoid blocking operations inside request handlers.

2. **OpenTelemetry Specification (v1.28)**
   - **Relevance**: Guides emitting structured latency metrics for async task pipelines that we can reuse when instrumenting event queues.
   - **Key Requirements**:
     - Propagate trace context (`traceparent`) consistently.
     - Record spans around I/O boundaries (manifest read, ledger append).

### Best Practices (2025)
- **Node.js HTTP Server Throughput**: Adopt `undici` keep-alive pools and disable Nagle where appropriate to reduce handshake overhead for SDK consumers; pair with circuit breaker libraries such as `cockatiel` for manifest fetch retries.
  - Source: Node.js Performance Working Group guidance (2025 Q2 notes).
  - Application: Replace raw `safeFetch`/`NodeEventSource` calls with pooled clients.
- **Event Streaming**: Use bounded queues with worker drains (e.g., `p-queue`) to decouple disk persistence from emitters while preserving ordering guarantees required by governance.
  - Source: CNCF Streaming Landscape report (2025).
  - Application: Introduce async writer for `ledger.ndjson` and incremental snapshots for SSE catch-up.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `undici` | 6.x | Standards-compliant HTTP client & keep-alive pool | MIT | ✅ Use |
| `p-queue` | 8.x | Promise-based concurrency limiting for async pipelines | MIT | ✅ Use |
| `lru-cache` | 11.x | TTL-aware in-memory caching for manifests/service maps | ISC | ✅ Use |
| `bullmq` | 5.x | Redis-backed job queues for persistence offload | MIT | ⚠️ Evaluate (external dependency) |

---

## Technology Research

### Option 1: Async Event Pipeline with Buffered Persistence

**Description**: Introduce an internal queue between `emitEvent` callers and disk persistence. Use a bounded buffer plus worker loop to flush events to NDJSON and broadcast to subscribers, keeping synchronous path limited to queue push and in-memory fan-out.

**Pros**:
- ✅ Removes `appendFile` from the synchronous emit path, reducing tail latency spikes. 【F:packages/asbr/src/core/events.ts†L360-L383】
- ✅ Enables batching writes (e.g., 10 events per flush) to amortize disk fsync costs.
- ✅ Creates a natural hook for emitting OpenTelemetry spans per flush.

**Cons**:
- ❌ Requires back-pressure semantics when queue is full to avoid memory blow-ups.
- ❌ Adds complexity around shutdown semantics (draining queue gracefully).

**brAInwav Compatibility**:
- Aligns with governance so long as ordering is preserved and events remain durable. Need to ensure SSE/WebSocket subscribers still receive immediate notifications (can publish before persistence).
- Minimal impact on MCP/A2A architecture; internal change only.
- Security/privacy unchanged; ledger still local-first.

**Implementation Effort**: Medium

---

### Option 2: Cached Connector Service Map with File Watchers

**Description**: Cache the parsed connector manifest and signed service map in memory with TTL aligned to manifest `ttlSeconds`. Use `fs.watch` or `chokidar` to refresh when the manifest file changes, falling back to manual reload on signature mismatch.

**Pros**:
- ✅ Eliminates repeated JSON parse/signature cycles per request. 【F:packages/asbr/src/api/server.ts†L325-L369】
- ✅ Honors manifest TTL semantics by invalidating on schedule.
- ✅ Simplifies downstream SDK calls that frequently poll service maps.

**Cons**:
- ❌ Requires careful invalidation when multiple processes regenerate manifests.
- ❌ Watchers are platform-dependent; need debouncing and error handling.

**brAInwav Compatibility**:
- Must maintain signature integrity; can reuse existing `signConnectorServiceMap` while caching last signature.
- Works with governance as long as audit logs capture refresh events.

**Implementation Effort**: Low

---

### Option 3: Structured Task Store with TTL & Eviction

**Description**: Replace ad-hoc Maps with an LRU/TTL store (e.g., `lru-cache`) for tasks, profiles, artifacts, and events metadata. Persist closed tasks to disk or memory service, and prune idle entries automatically.

**Pros**:
- ✅ Prevents unbounded memory growth from long-running sessions. 【F:packages/asbr/src/api/server.ts†L96-L185】
- ✅ Encapsulates cleanup policies instead of manual interval sweeps.
- ✅ Aligns with 256 MB memory budget from package governance.

**Cons**:
- ❌ Needs coordination with event buffers to avoid dropping data required by subscribers.
- ❌ Might require introducing lightweight persistence for completed tasks to keep SDK semantics.

**brAInwav Compatibility**:
- Must ensure governance-mandated auditability; dropping data requires ledger sync.
- No changes to MCP/A2A surfaces if TTL > longest expected client poll interval.

**Implementation Effort**: Medium

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | High: removes blocking I/O from emit path | Medium: reduces repeated manifest work | Medium: bounds memory, avoids GC churn |
| **Security** | Neutral (local queue) | High (preserves signature flow) | Medium (must guard eviction) |
| **Maintainability** | Medium (queue complexity) | High (simple cache wrapper) | Medium (shared state refactor) |
| **brAInwav Fit** | High (matches local-first durability) | High (keeps signatures authoritative) | Medium (needs governance review) |
| **Community Support** | Medium (`p-queue` maintained) | High (`lru-cache` mature) | High (`lru-cache` widely used) |
| **License Compatibility** | MIT | MIT/ISC | MIT |

---

## Recommended Approach

Prioritize Option 2 (cached connector service map) to deliver immediate latency wins for high-frequency calls, then stage Option 1 to eliminate disk contention on event emission. Treat Option 3 as a follow-up once observability confirms memory pressure breaches targets or when task retention requirements expand.

Rationale:
- Service-map caching reduces repeated synchronous work on every health check and connector probe without governance risk.
- Event pipeline buffering directly addresses the most expensive synchronous operation (disk append) while preparing the codebase for distributed event sinks.
- Task store refactor depends on clearer retention policies and can ride after instrumentation proves the need.

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "lru-cache": "^11.0.0",
    "p-queue": "^8.0.0"
  }
}
```

**License Verification Required**:
- [ ] `lru-cache` - ISC - ✅ Compatible
- [ ] `p-queue` - MIT - ✅ Compatible

### Configuration Changes
- **File**: `packages/asbr/src/api/server.ts`
  - Introduce cache initialization (capacity, TTL) and expose metrics.
- **File**: `packages/asbr/src/core/events.ts`
  - Add queue configuration knobs (flush interval, batch size) to `Config` schema.

### Database Schema Changes
- **Migration Required**: No (local-first file stores only)
- **Impact**: None

### Breaking Changes
- **API Changes**: None expected if TTLs exceed client polling intervals.
- **Migration Path**: Document new config flags and default TTL alignment with manifest metadata.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 1 day | Add dependencies, baseline benchmarks, wire tracing timers |
| **Core Implementation** | 3 days | Implement manifest cache, event queue, and eviction policies |
| **Testing** | 2 days | Expand unit/integration coverage, add load tests for emit/caching |
| **Integration** | 1 day | Verify MCP/A2A compatibility, update SDK to reuse SSE streams |
| **Documentation** | 1 day | Update README, runbooks, and governance evidence |
| **Total** | 8 days | |

---

## Related Research

### Internal Documentation
- `/project-documentation/RAG_PACKAGE_ENHANCEMENT_ANALYSIS.md` — Reference for async cache warmers in retrieval stack.
- `/project-documentation/A2A_NATIVE_COMMUNICATION_AND_MCP_BRIDGE_ANALYSIS.md` — Notes on batching strategies shared with A2A transport.

### External Resources
- Node.js Performance WG 2025-06 meeting notes: Event loop back-pressure guidance.
- CNCF Streaming Landscape 2025 report: Queueing patterns for hybrid streaming.
- IETF RFC 9110 (HTTP Semantics): Cache-control directives.

### Prior Art in Codebase
- **Similar Pattern**: `packages/memory-core/src/cache/prefetcher.ts` (async cache warmers)
  - **Lessons Learned**: Need explicit TTL metrics and failure alerts.
  - **Reusable Components**: Telemetry helpers and TTL instrumentation.

---

## Next Steps

1. **Immediate**:
   - [ ] Capture baseline latency/memory metrics for `/v1/connectors/service-map` and `emitEvent`.
   - [ ] Define success thresholds mapped to the 250 ms p95 latency SLO.

2. **Before Implementation**:
   - [ ] Get stakeholder approval on manifest cache plan (owners: @brAInwav-devs).
   - [ ] Create TDD plan covering cache hit/miss, queue saturation, and graceful shutdown.
   - [ ] Verify dependency licenses and security posture.
   - [ ] Persist research summary to local memory MCP.

3. **During Implementation**:
   - [ ] Validate queue throughput under synthetic 1k events/min load.
   - [ ] Instrument OpenTelemetry spans for manifest refresh and queue flush.
   - [ ] Update research doc if new risks emerge.

---

## Appendix

### Code Samples

```typescript
// Sketch: cached manifest loader wrapper
const manifestCache = new LRUCache<string, ConnectorServiceMap>({
  max: 1,
  ttl: manifestTtlMs,
});

export async function getCachedConnectorServiceMap() {
  const cached = manifestCache.get('service-map');
  if (cached) return cached;

  const manifest = await loadConnectorsManifest();
  const payload = buildConnectorServiceMap(manifest);
  const secret = process.env.CONNECTORS_SIGNATURE_KEY!;
  const signature = signConnectorServiceMap(payload, secret);
  const signed = attachSignature(payload, signature);

  manifestCache.set('service-map', signed, { ttl: payload.ttlSeconds * 1000 });
  return signed;
}
```

### Benchmarks

- Pending — schedule k6 scenario measuring 100 rps `/v1/connectors/service-map` load and 500 events/sec emit throughput.

### Screenshots/Diagrams

- N/A (API-only scope).

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-13 | AI Agent | Initial research |

---

**Status**: Complete

**Stored in Local Memory**: No (MCP endpoint unavailable during review)

Co-authored-by: brAInwav Development Team
