# Research Document: OPENAI_APPS_SDK_ECOSYSTEM_PERFORMANCE_REVIEW

**Task ID**: `packages-openai-apps-sdk-performance-review`
**Created**: 2025-10-13
**Researcher**: AI Agent (gpt-5-codex)
**Status**: Complete

---

## Objective

Evaluate the @openai/apps-sdk ecosystem (runtime client surface plus agent and instructor adapters) to catalog current performance characteristics, identify bottlenecks observed in Cortex-OS deployments, and recommend optimizations that preserve brAInwav governance constraints while improving latency, throughput, and resiliency.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/openai-apps-sdk/src/index.ts`
- **Current Approach**: Exposes a minimal `createClient()` that returns a `connectors.serviceMap()` method which throws whenever the ChatGPT Apps runtime surface (`window.openai.apps`) is unavailable. The client mirrors the runtime service-map contract without local caching or retry semantics.
- **Limitations**: Repeated service map calls within Cortex-OS shells rely entirely on the remote runtime implementation, creating avoidable round-trips and duplicated JSON parsing even though the interface includes a TTL. There is no in-package memoization, no batching for concurrent callers, and errors bubble synchronously without structured diagnostics.

- **Location**: `packages/openai-apps-sdk/src/agents/openai-agents-js-adapter.ts`
- **Current Approach**: Provides a thin wrapper around `client.chat`, emitting informational/error logs and rethrowing failures with branded messaging. No additional flow control, instrumentation, or result normalization is performed.
- **Limitations**: Adapter-level latency is dominated by the upstream SDK. The wrapper serially forwards each request and lacks timeout or retry hooks, optimistic tool prefetch, or telemetry correlation identifiers, which complicates tuning inside higher-level providers.

- **Location**: `packages/openai-apps-sdk/src/agents/instructor-js-adapter.ts`
- **Current Approach**: Wraps a user-supplied synchronous validator to return parsed schema-constrained results or throw branded errors.
- **Limitations**: Validation executes on the caller thread, so large schema validations block event loops. There is no batching, incremental parsing, or cooperative scheduling for complex Instructor responses.

### Related Components
- **Model Gateway Provider**: `packages/model-gateway/src/providers/openai-agents.provider.ts` orchestrates adapter usage, layering logging, timeout guards, and abort controllers, so adapter changes must integrate with this provider without breaking expectation of a simple `chat` method.
- **Protocol Contracts**: `packages/protocol/src/connectors/service-map.ts` defines canonical connector payloads with TTLs and signatures that the runtime client is expected to respect. Any caching must remain signature-aware and TTL-compliant.

### brAInwav-Specific Context
- **MCP Integration**: OpenAI Apps connectors feed Cortex MCP discovery flows, so service-map latency directly impacts MCP handshake time. Batching or caching must preserve signed payload verification downstream.
- **A2A Events**: Agent responses are fanned out via A2A topics; improved adapter observability is required to correlate ChatGPT latency spikes with agent bus backpressure incidents.
- **Local Memory**: Instructor validations are frequently invoked during memory summarization tasks. Blocking parsing on the main loop delays memory ingestion pipelines that depend on deterministic turnaround.
- **Existing Patterns**: Other ecosystems (e.g., connectors, agents) have introduced memoized fetchers with TTL and background refresh, providing a reference for applying similar strategies here without violating zero-exfiltration guarantees.

---

## External Standards & References

### Industry Standards
1. **WHATWG Fetch Standard** (https://fetch.spec.whatwg.org/)
   - **Relevance**: Governs `AbortSignal`, keepalive, and streaming semantics that the ChatGPT Apps runtime surface follows; aligning adapter behavior with the standard ensures predictable cancellation and timeouts.
   - **Key Requirements**: Respect signal abort, propagate reason, avoid blocking event loop during body consumption, and leverage persistent connections via `keepalive` when appropriate.

2. **RFC 5861: HTTP Cache-Control Extensions for Stale Content** (https://www.rfc-editor.org/rfc/rfc5861)
   - **Relevance**: Guides stale-while-revalidate TTL handling for service map caching, ensuring Cortex-OS can reuse signed connector manifests without introducing stale data risk.
   - **Key Requirements**: Track freshness lifetime, allow asynchronous revalidation, and fail closed when TTL expires without refreshed data.

3. **ECMAScript SharedArrayBuffer & Atomics Guidance** (https://tc39.es/ecma262/#sec-sharedarraybuffer-objects)
   - **Relevance**: Provides patterns for worker-based offloading of CPU-heavy validation without violating memory isolation, informing Instructor adapter background parsing options.
   - **Key Requirements**: Use postMessage/structured clone for worker communication, avoid blocking main thread, and maintain deterministic ordering of results.

### Best Practices (2025)
- **Client-Side TTL Memoization**: Utilize promise-based deduplication with background refresh to avoid thundering herds on identical fetches while keeping data within TTL windows.
  - Source: Google Web Dev Performance Playbook (2025 edition).
  - Application: Cache `serviceMap()` responses locally, refresh asynchronously before TTL expiry, and expose cache metrics for MCP readiness probes.

- **Observability-Driven Retries**: Implement idempotent retry strategies with jitter and instrumentation hooks.
  - Source: OpenTelemetry Spec 1.26.0 reliability guidelines.
  - Application: Wrap `client.chat` with correlation IDs emitted to A2A logs, exposing retry counts and durations for Cortex SLO tracking.

- **Worker Offloading for Parsing**: Move expensive JSON/schema validation to Web Workers or Node worker_threads to keep UI/event loops responsive.
  - Source: Chrome Dev Summit 2024 performance recommendations.
  - Application: Provide optional worker-backed Instructor parser that posts results when validation completes.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `async-cache-dedupe` | ^1.10.0 | Promise-based memoization with TTL and background refresh | MIT | ✅ Use |
| `undici` | ^6.19.8 | WHATWG-compliant HTTP client with keep-alive pools | MIT | ✅ Use |
| `piscina` | ^4.6.0 | Node worker thread pool for CPU-heavy tasks | MIT | ⚠️ Evaluate |
| `p-retry` | ^6.1.2 | Retry with exponential backoff and abort support | MIT | ✅ Use |

---

## Technology Research

### Option 1: TTL-Aware Service Map Memoization

**Description**: Wrap `createClient().connectors.serviceMap` in a memoized function that caches successful responses keyed by connector brand/ID, respects the returned `ttlSeconds`, and schedules a background refresh with jitter. Concurrent callers share the same in-flight promise, and stale data is served only within an allowed grace window with telemetry about age.

**Pros**:
- ✅ Eliminates redundant remote calls, reducing handshake latency for MCP clients that repeatedly request the manifest.
- ✅ Provides natural backpressure protection by collapsing concurrent calls into a single fetch.
- ✅ Enables instrumentation hooks (cache hits/misses) for observability.

**Cons**:
- ❌ Requires secure handling of signatures to avoid serving tampered cached data.
- ❌ Adds complexity around invalidation when runtime indicates revocation outside TTL.

**brAInwav Compatibility**:
- Aligns with Constitution by honoring TTL metadata defined in protocol contracts and keeping data local-first.
- Integrates cleanly with existing MCP/A2A flows that already consume memoized resources.
- Security impact is low so long as signature verification remains intact before caching.

**Implementation Effort**: Medium

---

### Option 2: Adapter-Level Resilient Chat Pipeline

**Description**: Extend `createOpenAIAgentsAdapter` to wrap `client.chat` in a resilience layer that adds configurable timeouts, limited retries with jitter, request deduplication for identical tool invocations, and OpenTelemetry span emission. Supports streaming tokens where available and surfaces partial progress via callbacks.

**Pros**:
- ✅ Reduces perceived latency by retrying transient failures quickly.
- ✅ Improves visibility through standardized telemetry, enabling targeted performance tuning.
- ✅ Offers hooks for downstream providers to apply adaptive timeouts per tool.

**Cons**:
- ❌ Additional abstraction may complicate usage for lightweight consumers.
- ❌ Requires careful guardrails to avoid violating OpenAI rate limits during retries.

**brAInwav Compatibility**:
- Compatible with A2A governance by surfacing metrics to logging pipelines and honoring abort semantics.
- Must ensure retries remain idempotent and respect zero-exfiltration policies (no extra data emission).

**Implementation Effort**: Medium-High

---

### Option 3: Worker-Backed Instructor Validation

**Description**: Provide an optional `createInstructorAdapter` variant that offloads schema validation to a worker thread or web worker. The adapter posts the raw text to the worker, which runs the provided validator and returns structured results, allowing the main loop to stay responsive during heavy JSON schema checks.

**Pros**:
- ✅ Prevents long-running validations from blocking UI/event loop tasks.
- ✅ Enables parallel validation of batched Instructor outputs.
- ✅ Aligns with cross-platform worker APIs available in Node 20+ and browsers.

**Cons**:
- ❌ Requires serialization of validator functions or bundling validator modules, which may complicate dependency injection.
- ❌ Adds message-passing overhead that can outweigh benefits for small payloads.

**brAInwav Compatibility**:
- Must ensure worker execution remains local-first with no external communication.
- Security review needed to guarantee validator sandboxing and memory isolation.

**Implementation Effort**: High

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | High impact on manifest latency via caching | Medium impact through retries/telemetry | High impact for CPU-bound validations |
| **Security** | Medium (requires signature validation) | Medium (must guard retries) | Medium-High (worker sandboxing) |
| **Maintainability** | High (memoization logic is self-contained) | Medium (more moving parts) | Medium-Low (worker orchestration complexity) |
| **brAInwav Fit** | Strong alignment with TTL contracts | Good alignment with observability mandates | Requires additional governance review |
| **Community Support** | Mature cache libraries available | Resilience patterns widely adopted | Worker pooling libraries stable but heavier |
| **License Compatibility** | MIT-friendly options | MIT-friendly options | MIT-friendly options |

---

## Recommended Approach

**Selected**: Option 1 - TTL-Aware Service Map Memoization

**Rationale**:
Implementing TTL-aware caching inside the runtime client delivers the largest performance benefit for the least complexity. Service map retrieval is on the hot path for agent bootstrap and MCP connector discovery; memoizing results honors the TTL contract already present in the protocol schema while collapsing redundant fetches. The approach aligns with brAInwav Constitution requirements by staying local-first, verifying signatures before storing responses, and exposing observability hooks that integrate with existing logging patterns in the connectors ecosystem. Compared to adapter-level resilience or worker offloading, memoization avoids introducing streaming abstractions or worker orchestration, reducing risk and shortening the implementation timeline. It also provides an extensible foundation for future enhancements (such as background refresh or offline bootstrapping) without blocking subsequent work on retries or workerization.

**Trade-offs Accepted**:
- Sacrifices immediate improvements to chat resiliency and validation parallelism, which may still require future investment.
- Introduces minor cache invalidation complexity that must be carefully tested to avoid serving stale or revoked connector manifests.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: Cache remains in-memory within the runtime process; no remote storage is introduced.
- ✅ **Zero Exfiltration**: Cached data mirrors existing service map payloads without new telemetry leaving the host.
- ✅ **Named Exports**: Enhancements must preserve named export surfaces in `src/index.ts`.
- ✅ **Function Size**: Memoization helpers should maintain ≤40 line functions via smaller utilities.
- ✅ **Branding**: Logging and error messages continue to include "brAInwav Cortex-OS" branding as in current adapters.

### Technical Constraints
- Nx monorepo build graph requires keeping TypeScript compilation isolated; memoization utilities must avoid circular deps.
- Optional peer dependencies (`@openai/agents`, `instructor`) cannot be imported eagerly, so new features must remain dependency-injection friendly.
- Performance improvements must support both browser (ChatGPT Apps iframe) and Node runtimes without assuming Node-only APIs unless polyfilled.
- Need to maintain compatibility with bundlers expecting `sideEffects: false` for tree-shaking.

### Security Constraints
- Service map caching must verify signatures using existing protocol helpers before storage.
- Any background refresh should clamp retries to avoid hammering runtime endpoints and respect governance rate limits.
- Worker-based features must ensure validators cannot escape sandbox or access restricted resources without explicit allowance.
- Logging must avoid leaking secrets embedded in connector metadata.

### Integration Constraints
- MCP contract compatibility: cached manifests must serialize identically to protocol expectations and expose TTL metadata for downstream consumers.
- A2A event schema requirements: telemetry emitted from adapters should map to existing observability schemas without breaking dashboards.
- Database/persistence considerations: No persistent storage allowed; ephemeral caches reset on process restart.
- Backward compatibility: Public APIs must remain unchanged to avoid breaking existing consumers relying on current adapter signatures.

---

## Open Questions

1. **How does the ChatGPT Apps runtime signal connector revocation outside TTL expiration?**
   - **Context**: Memoization risks serving revoked connectors if runtime invalidates them before TTL lapses.
   - **Impact**: Without a revocation signal, cached results could violate compliance or serve stale connector endpoints.
   - **Research Needed**: Investigate runtime events or headers indicating revocation, and evaluate polling/backchannel approaches.
   - **Decision Required By**: Prior to enabling background refresh in production.

2. **What is the acceptable cache warm-up latency for Cortex MCP clients?**
   - **Context**: Determining TTL prefetch timing requires understanding SLA for connector availability during startup.
   - **Impact**: Too aggressive refreshes reintroduce load; too lax refreshes risk expired manifests.
   - **Options**: Gather metrics from existing deployments, consult governance SLOs, or run staged experiments to calibrate refresh intervals.

---

## Proof of Concept Findings

### POC Setup
- **Environment**: No dedicated POC executed; analysis is code-review-based within the Cortex-OS monorepo.
- **Code Location**: N/A
- **Test Scenarios**: N/A

### Results
- **Scenario 1**: Not Applicable
  - **Result**: ⚠️ Partial
  - **Observations**: Empirical validation deferred until memoization prototype is implemented.

- **Scenario 2**: Not Applicable
  - **Result**: ⚠️ Partial
  - **Observations**: Streaming and worker offload behaviors require future experimentation.

### Performance Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Connector service-map latency | ≤150 ms p95 | Not measured | ⚠️ |
| Agent chat completion latency | ≤5 s p95 | Not measured | ⚠️ |
| Instructor validation throughput | ≥50 req/s | Not measured | ⚠️ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Cache serves stale or revoked manifests | Medium | High | Enforce TTL strictly, add revocation checks, surface cache age metrics |
| Retry layer triggers OpenAI rate limiting | Medium | Medium | Implement capped exponential backoff with jitter and rate-limit aware headers |
| Worker-based validation increases bundle size | Low | Medium | Ship optional entry points and document tree-shaking patterns |
| Added dependencies introduce supply-chain risk | Low | Medium | Pin versions, run license/compliance review, maintain lockfile |

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "async-cache-dedupe": "^1.10.0",
    "p-retry": "^6.1.2"
  }
}
```

**License Verification Required**:
- [ ] async-cache-dedupe - MIT - ✅ Compatible
- [ ] p-retry - MIT - ✅ Compatible

### Configuration Changes
- **File**: `packages/openai-apps-sdk/package.json`
- **Changes**: Add runtime dependencies for memoization/retry helpers and ensure optional peer dependencies remain untouched.

### Database Schema Changes
- **Migration Required**: No
- **Impact**: None

### Breaking Changes
- **API Changes**: None anticipated; `createClient`, `createOpenAIAgentsAdapter`, and `createInstructorAdapter` signatures remain stable.
- **Migration Path**: Not required; improvements are additive and backward-compatible.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 0.5 day | Add dependencies, draft memoization scaffolding, align with governance |
| **Core Implementation** | 1.5 days | Implement TTL-aware cache, background refresh, and instrumentation |
| **Testing** | 1 day | Add unit tests for cache behavior, signature verification, and error paths |
| **Integration** | 0.5 day | Verify compatibility with model gateway provider and MCP discovery |
| **Documentation** | 0.5 day | Update README usage notes and changelog |
| **Total** | 4 days | |

---

## Related Research

### Internal Documentation
- `project-documentation/AGENTS_ECOSYSTEM_PERFORMANCE_REVIEW.md` – Guidance on memoized discovery flows.
- `project-documentation/CONNECTORS_ECOSYSTEM_PERFORMANCE_REVIEW.md` – Context on connector manifest caching strategies.
- `project-documentation/COMMANDS_ECOSYSTEM_PERFORMANCE_REVIEW.md` – Observability patterns applicable to adapter telemetry.

### External Resources
- OpenTelemetry Reliability Guide 1.26.0: Telemetry-driven retry recommendations.
- Google Web Dev Performance Playbook (2025): Client-side caching strategies.
- Chrome Dev Summit 2024 Sessions: Worker offloading for performance-sensitive parsing.

### Prior Art in Codebase
- **Similar Pattern**: `packages/agents/src/connectors/registry.ts`
  - **Lessons Learned**: Shared promise memoization reduced startup latency but required strict TTL enforcement.
  - **Reusable Components**: Cache invalidation utilities and structured logging conventions can inform the apps SDK implementation.

---

## Next Steps

1. **Immediate**:
   - [ ] Align with runtime owners on cache invalidation signals.
   - [ ] Draft detailed TDD plan for memoized `serviceMap` implementation.

2. **Before Implementation**:
   - [ ] Get stakeholder approval on recommended approach
   - [ ] Create TDD plan based on this research
   - [ ] Verify all dependencies are license-compatible
   - [ ] Document in local memory for future reference

3. **During Implementation**:
   - [ ] Validate assumptions with tests
   - [ ] Monitor for deviations from research findings
   - [ ] Update this document if new information emerges

---

## Appendix

### Code Samples

```typescript
import AsyncCacheDedupe from 'async-cache-dedupe';

const cache = new AsyncCacheDedupe({ ttl: () => ttlSeconds * 1000 });

export const createCachedServiceMap = (fetchServiceMap: () => Promise<ConnectorServiceMap>) => {
        return async (): Promise<ConnectorServiceMap> => {
                return cache.wrap('service-map', () => fetchServiceMap());
        };
};
```

### Benchmarks

No synthetic benchmarks executed yet; targets documented in Proof of Concept section.

### Screenshots/Diagrams

Not applicable for this research iteration.
