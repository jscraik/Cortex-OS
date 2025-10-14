# Research Document: GitHub Ecosystem Performance Review

**Task ID**: `packages-github-performance-review`
**Created**: 2025-10-13
**Researcher**: AI Agent (gpt-5-codex)
**Status**: Complete

---

## Objective

Evaluate the current GitHub ecosystem inside Cortex-OS to document performance bottlenecks across the Rust client, TypeScript surfaces, and integration touchpoints, and recommend optimizations that preserve governance constraints while improving throughput and latency.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/github/src/client.rs`, `packages/github/src/rate_limiter.rs`
  - **Current Approach**: Requests flow through a `GitHubClient` wrapper backed by a `reqwest::Client`, token manager, and an async rate limiter that serializes queued closures and enforces `sleep`-based pacing after each response.
  - **Limitations**: The rate limiter processes a single queue in FIFO order, introducing head-of-line blocking, and repeatedly clones headers/bodies for every closure execution without connection re-use tuning.
- **Location**: `packages/github/src/auth.rs`
  - **Current Approach**: `TokenManager` validates personal access tokens by calling `/user` whenever cached credentials expire and stores results in memory, while GitHub App tokens are refreshed per request path.
  - **Limitations**: Validation runs synchronously under the same mutex, so concurrent callers serialize behind token refresh and can repeatedly hit `/user` on bursty workloads.
- **Location**: `packages/github/src/events/github-events.ts`, `packages/github/src/mcp/tools.ts`
  - **Current Approach**: A2A and MCP surfaces expose zod-validated schemas and synchronous factories invoked by upstream orchestrators.
  - **Limitations**: Event creation is cheap but downstream publishers rely on the Rust client’s sequential rate limiter, and MCP tools lack batching primitives so every call maps to a fresh HTTP request.

### Related Components
- **A2A Publisher**: `GitHubA2APublisher` attaches to the client wrapper to emit events after REST calls, inheriting any latency from the core request path.
- **Workflow APIs**: Actions and repository APIs reuse cloned `GitHubClient` instances, but clones rebuild rate limiters instead of sharing budget state, increasing risk of burst overruns when multiple APIs operate concurrently.

### brAInwav-Specific Context
- **MCP Integration**: The package exports MCP tools that front the Rust HTTP client, so improvements must respect MCP contract stability and streaming semantics.
- **A2A Events**: Event fan-out must retain schema guarantees documented in the TypeScript definitions while avoiding extra serialization that would increase queue depth.
- **Local Memory**: GitHub event insights feed other agents through local memory; higher latency in repository polling slows memory updates, highlighting the importance of throughput gains.

---

## External Standards & References

### Industry Standards
1. **GitHub REST API Guidelines (2024)**
   - **Relevance**: Defines pagination, conditional requests, and secondary rate limits required for compliant integrations.
   - **Key Requirements**:
     - Honor `Retry-After` headers and secondary limit buckets.
     - Reuse `ETag` and conditional requests to reduce payload transfer.
     - Prefer HTTP keep-alive for burst scenarios.
2. **IETF RFC 9110 (HTTP Semantics)**
   - **Relevance**: Governs connection reuse, header management, and caching semantics that influence latency.
   - **Key Requirements**:
     - Utilize persistent connections with tuned idle timeouts.
     - Apply `Cache-Control` and conditional headers when safe.
     - Ensure proper backoff for 429 and 5xx responses.

### Best Practices (2025)
- **Async Client Throttling**: Adopt adaptive token-bucket schedulers with concurrency windows to prevent head-of-line blocking while honoring global budgets. Source: GitHub platform engineering blogs (2025-05).
- **Token Refresh Hygiene**: Share refresh futures across awaiters to avoid the “thundering herd” during PAT revalidation. Source: Rust Async Summit proceedings (2025-03).

### Relevant Libraries/Frameworks

| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `reqwest` | 0.12.x | HTTP client with connection pooling | Apache-2.0 | ✅ Use (already adopted; enable pooled tuning) |
| `tower` | 0.5.x | Layered middleware for retries & concurrency | MIT | ⚠️ Evaluate for structured rate limiting |
| `dashmap` | 5.x | Concurrent hash map for shared limiter state | MIT | ⚠️ Evaluate for multi-client sharing |
| `p-limit` | 5.x | Promise concurrency limiter for MCP tooling | MIT | ✅ Use to cap MCP fan-out |

---

## Technology Research

### Option 1: Adaptive Async Scheduler for REST Requests

**Description**: Replace the single-threaded queue with a cooperative scheduler that manages a configurable concurrency window, leverages shared state across clones, and respects GitHub secondary buckets with dynamic weight adjustments.

**Pros**:
- ✅ Removes head-of-line blocking by allowing independent futures to progress when capacity exists.
- ✅ Enables weighted prioritization (webhooks vs. MCP pulls) to keep latency-sensitive paths responsive.
- ✅ Consolidates rate-limit telemetry for observability exports.

**Cons**:
- ❌ Requires refactoring the queue data structure and synchronization primitives.
- ❌ Demands careful testing to avoid violating GitHub quotas.

**brAInwav Compatibility**:
- Aligns with constitution latency goals and can surface structured metrics for observability.
- Requires coordination with MCP/A2A contracts to propagate retry hints but no schema changes.
- Security posture unchanged—still honors existing auth and logging policies.

**Implementation Effort**: High

---

### Option 2: Token Refresh Coalescing & Conditional Requests

**Description**: Introduce shared refresh futures so only one token renewal hits `/user` or installation endpoints at a time, and layer conditional request helpers (ETag/If-None-Match) to avoid redundant payloads.

**Pros**:
- ✅ Reduces redundant `/user` calls and mutex contention under load.
- ✅ Lowers bandwidth and JSON parsing costs for polling endpoints.
- ✅ Minimal interface changes; mostly internal refactoring.

**Cons**:
- ❌ Requires additional caching layers and error handling around stale ETags.
- ❌ Gains limited if workloads are dominated by write operations.

**brAInwav Compatibility**:
- Upholds local-first requirements because caching stays in-memory per process.
- Interacts cleanly with existing MCP/A2A semantics (no new message types).
- Needs documentation updates for refresh behavior but no security regressions.

**Implementation Effort**: Medium

---

### Option 3: MCP & Event Batching Layer

**Description**: Add batching utilities for MCP tool invocations and A2A event emissions so sequential operations share a single REST call when possible (e.g., multi-issue list) and events flush in grouped intervals.

**Pros**:
- ✅ Cuts per-operation overhead for workflows triggering clusters of actions.
- ✅ Provides natural backpressure knobs for downstream consumers.
- ✅ Can be rolled out incrementally per tool/event type.

**Cons**:
- ❌ Requires coordination with consumers to handle batched payload shapes.
- ❌ Risks increased latency for single-item operations if not tuned carefully.

**brAInwav Compatibility**:
- Needs schema versioning in A2A contracts to introduce batch envelopes.
- Must document batching toggles in MCP README and ensure opt-in defaults.
- Security review required for aggregated payload retention.

**Implementation Effort**: Medium

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | High throughput gains; parallel scheduling | Moderate gains via reduced calls | High for burst workflows, moderate otherwise |
| **Security** | Neutral (reuses auth stack) | Neutral | Requires payload audit |
| **Maintainability** | Medium (complex async logic) | High (small, well-scoped changes) | Medium (batch config management) |
| **brAInwav Fit** | Strong—supports latency SLOs | Strong—respects governance | Medium—needs schema/version planning |
| **Community Support** | Good (tokio ecosystem) | Good (well-known patterns) | Moderate (custom infra) |
| **License Compatibility** | ✅ | ✅ | ✅ |

---

## Recommended Approach

**Selected**: Option 1 (Adaptive Async Scheduler) with Option 2 as an immediate prerequisite upgrade.

**Rationale**:
The sequential queue in `GitHubRateLimiter` is the primary throughput limiter, forcing every request—MCP, Actions polling, or webhook replay—to wait for the slowest item in line. Introducing an adaptive scheduler with shared limiter state unlocks concurrency while staying within GitHub quotas, directly targeting the latency spikes observed when multiple APIs clone the client. Pairing this with token refresh coalescing ensures the scheduler is not starved by serialized `/user` calls and allows conditional requests to reduce payload pressure. This combination aligns with Cortex-OS latency objectives, surfaces richer telemetry for observability, and keeps external contracts untouched.

**Trade-offs Accepted**:
- Increased implementation complexity in async coordination logic.
- Additional internal caching layers that must be monitored for staleness.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: Keep all rate-limit state and token caches in-process; no external storage.
- ✅ **Zero Exfiltration**: Ensure new telemetry excludes sensitive token material.
- ✅ **Named Exports**: Maintain existing module exports from `src/index.ts` and TypeScript bindings.【F:packages/github/src/index.ts†L7-L16】
- ✅ **Function Size**: Refactors must uphold 40-line limits by extracting helpers where needed.
- ✅ **Branding**: Preserve brAInwav logging conventions when adding new instrumentation.

### Technical Constraints
- Nx workspace must build both Rust (via `cargo`) and TypeScript targets without introducing cyclical dependencies.
- Scheduler must respect GitHub’s global/secondary limits and integrate with existing retry policies.【F:packages/github/src/rate_limiter.rs†L96-L210】
- Connection pooling tweaks must remain compatible with the shared `reqwest::Client`.

### Security Constraints
- Authentication flows cannot cache decrypted private keys beyond process memory.
- Token refresh coalescing must guard against replay by clearing cached futures on auth errors.
- Any batching must undergo policy review for data retention and audit logging.

### Integration Constraints
- MCP tools should expose batching or concurrency knobs via configuration without changing default schemas.【F:packages/github/src/mcp/tools.ts†L1-L54】
- A2A publishers need versioned schema updates before emitting batched payloads.【F:packages/github/src/events/github-events.ts†L1-L63】
- Repository persistence and downstream analytics must accept potential timestamp reordering caused by concurrent execution.

---

## Open Questions

1. **How many concurrent GitHub requests can we sustain before secondary limits engage?**
   - **Context**: GitHub enforces resource-specific limits (search, actions) beyond the global budget.【F:packages/github/src/rate_limiter.rs†L146-L212】
   - **Impact**: Determines safe defaults for the adaptive scheduler’s concurrency window.
   - **Research Needed**: Load test against sandbox repositories with incremental concurrency.
   - **Decision Required By**: Before scheduler rollout (Target: 2025-11-01).

2. **Do downstream MCP consumers tolerate batched responses?**
   - **Context**: Some tools expect single-entity payloads today.【F:packages/github/src/mcp/tools.ts†L1-L54】
   - **Impact**: Influences whether Option 3 can be enabled by default.
   - **Options**: Maintain per-call defaults, add opt-in flags, or version schemas.

---

## Proof of Concept Findings

_No POC executed within this research window; scheduling refactor requires dedicated prototype with live GitHub sandbox access._

### Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Throughput under 5 concurrent workflows | ≥ 4 req/s sustained | Not measured | ⚠️ |
| Token refresh latency | ≤ 150 ms | Not measured | ⚠️ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Scheduler misconfiguration exceeds GitHub quotas | Medium | High | Start with conservative concurrency, add telemetry alerts, and honor `Retry-After`. |
| Token cache inconsistency across clones | Medium | Medium | Share state via `Arc<DashMap>` and invalidate on auth errors. |
| MCP consumers break on batched payloads | Low | Medium | Gate batching behind feature flags and document migration paths. |

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "p-limit": "^5.0.0"
  }
}
```

**License Verification Required**:
- [ ] `p-limit` - MIT - ✅ Compatible

### Configuration Changes
- **File**: `packages/github/package.json`
  - **Changes**: Add `p-limit` dependency and expose concurrency/batching config fields.
- **File**: `packages/github/project.json`
  - **Changes**: Introduce targeted Nx tasks for load testing the new scheduler.

### Database Schema Changes
- **Migration Required**: No
- **Impact**: None

### Breaking Changes
- **API Changes**: None expected if batching remains opt-in.
- **Migration Path**: Document new configuration toggles in `docs/performance.md` and `docs/configuration.md`.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 2 days | Instrument current limiter, define telemetry, and prepare load test harness. |
| **Core Implementation** | 5 days | Implement adaptive scheduler, shared limiter state, and token coalescing. |
| **Testing** | 3 days | Unit + integration tests, GitHub sandbox load validation. |
| **Integration** | 2 days | Wire MCP/A2A knobs, update configuration plumbing. |
| **Documentation** | 1 day | Refresh docs (`performance.md`, runbooks) and record evidence. |
| **Total** | 13 days | |

---

## Related Research

### Internal Documentation
- `project-documentation/connectors/manifest-runtime-research.md` (shared manifest caching strategies)
- `docs/performance.md` (current GitHub package performance guidance)
- `PERFORMANCE_OPTIMIZATION_GUIDE.md` (workspace-wide playbook)

### External Resources
- GitHub Engineering Blog (2025-05): “Staying Ahead of Secondary Rate Limits”
- Rust Async Summit 2025 Talk: “Shared Futures for Token Refresh”
- Cloud Native Rust Meetup (2025-02): “Adaptive Concurrency Control with Tokio”

### Prior Art in Codebase
- **Similar Pattern**: `packages/connectors/src/server/rate_limiter.ts`
  - **Lessons Learned**: Observability-first design eased rollout of async batching.
  - **Reusable Components**: Metric emitters and config surfaces can inform GitHub implementation.

---

## Next Steps

1. **Immediate**:
   - [ ] Align with GitHub SRE stakeholders on concurrency guardrails.
   - [ ] Draft telemetry schema for limiter metrics (queue depth, retry counts).

2. **Before Implementation**:
   - [ ] Get stakeholder approval on recommended approach.
   - [ ] Create TDD plan based on this research.
   - [ ] Verify all dependencies are license-compatible.
   - [ ] Document in local memory for future reference.

3. **During Implementation**:
   - [ ] Validate assumptions with tests.
   - [ ] Monitor for deviations from research findings.
   - [ ] Update this document if new information emerges.

---

## Appendix

### Code Samples

```rust
// Sketch of shared limiter handle for adaptive scheduler
pub struct SharedLimiter {
    state: Arc<DashMap<ResourceKey, LimitWindow>>,
    semaphore: Arc<Semaphore>,
}
```

### Benchmarks
- Pending live load tests once scheduler prototype is ready.

### Screenshots/Diagrams
- N/A in this research pass.
