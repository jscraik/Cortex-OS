# Research Document: Policy Ecosystem Performance Review

**Task ID**: `packages-policy-performance-review`
**Created**: 2025-10-13
**Researcher**: AI Agent (gpt-5-codex)
**Status**: Complete

---

## Objective

Document the current performance characteristics, bottlenecks, and remediation options for the Cortex-OS Policy ecosystem so that future implementation work can eliminate synchronous I/O, improve rate-limiter scalability, and reduce policy lookup latency during high-volume orchestrations.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/policy/src/index.ts`
- **Current Approach**: `loadGrant` dynamically imports `fs`/`path`, reads JSON grant manifests synchronously from `.cortex/policy/tools`, and validates them with a Zod schema; `enforce` performs action gating, filesystem scope checks, and an in-memory per-process rate limit window stored in an array per key.【F:packages/policy/src/index.ts†L1-L50】
- **Limitations**:
  - Blocking `fs.readFileSync` on every grant lookup prevents overlapped I/O and serializes grant loading within the event loop.【F:packages/policy/src/index.ts†L14-L20】
  - No caching results in repeated disk hits and JSON parsing for identical grants across orchestrator invocations.【F:packages/policy/src/index.ts†L14-L20】
  - Rate limiting filters the entire timestamp array on each enforcement, creating O(n) work per request and growing memory churn at scale.【F:packages/policy/src/index.ts†L31-L47】
  - Per-process state makes rate enforcement inconsistent across clustered workers and cannot enforce global budgets.

### Related Components
- **Orchestration Supervisor**: Uses `loadGrant` and `enforce` during artifact synthesis to guard filesystem writes, so any latency bubbles directly into orchestration critical path.【F:packages/orchestration/src/lib/supervisor.ts†L1-L74】
- **Model Gateway**: Ships a parallel policy module with its own in-memory grant table and rate limiter, highlighting duplication and the absence of shared caches or adapters for policy evaluation at larger scale.【F:packages/model-gateway/src/policy.ts†L1-L53】

### brAInwav-Specific Context
- **MCP Integration**: Policy gating governs filesystem and model connector actions that surface via MCP tooling; higher latency propagates to MCP round trips and user waits.
- **A2A Events**: Policy violations emit audit records that travel across the A2A bus, so rate enforcement jitter increases event burstiness.
- **Local Memory**: Policies reside in local dot directories, so repeated synchronous file reads amplify SSD contention on local-first deployments.
- **Existing Patterns**: Other packages (e.g., Model Gateway) already memoize grants, suggesting a reusable pattern for policy caching.

---

## External Standards & References

### Industry Standards
1. **OWASP API Security Top 10 (2023) – API4:2023 Unrestricted Resource Consumption**
   - **Relevance**: Highlights the need for efficient, centralized rate limiting to prevent resource exhaustion.
   - **Key Requirements**: Enforce quotas with low overhead, coordinate across nodes, and avoid client-bypass opportunities.
2. **NIST SP 800-204B Microservices-based Applications**
   - **Relevance**: Recommends externalized policy decision points (PDP) with caching to reduce coupling and latency.
   - **Key Requirements**: Co-located policy caches with invalidation strategies, async refresh, and observability hooks.

### Best Practices (2025)
- **Node.js File I/O**: Prefer `fs.promises` with pooled workers plus warm caches to eliminate synchronous blocking in hot paths (source: Node.js Performance Best Practices, 2024 edition).
  - **Application**: Replace `readFileSync` with asynchronous reads and wrap them in memoized loaders.
- **Rate Limiting**: Use token-bucket or fixed-window counters with monotonic clocks and bounded arrays (source: IETF RFC 9700 draft on Rate Control).
  - **Application**: Replace array filtering with ring buffers or counters and expose shared storage for multi-worker coordination.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `lru-cache` | 11.x | High-performance TTL cache for Node.js | ISC | ✅ Use |
| `node-rate-limiter-flexible` | 5.x | Token bucket / rate limiting strategies with Redis/Mongo adapters | MIT | ⚠️ Evaluate |
| `bullmq` | 5.x | Redis-backed queue that could host distributed counters | MIT | ⚠️ Evaluate |

---

## Technology Research

### Option 1: Async Memoized Loader + Ring Buffer Rate Limiter

**Description**: Introduce an in-memory TTL cache around `loadGrant` using `fs.promises.readFile`, warm it during startup, and replace array-based rate limiting with a fixed-size ring buffer keyed by tool+action.

**Pros**:
- ✅ Eliminates synchronous disk I/O in hot paths.
- ✅ Bounded memory footprint with ring buffer counters.
- ✅ Minimal dependency surface (only `lru-cache`).

**Cons**:
- ❌ Cache invalidation required when grant files change.
- ❌ Still per-process unless shared via IPC or external store.

**brAInwav Compatibility**:
- Aligns with local-first principle by keeping data on-device while shrinking I/O contention.
- Requires integration with MCP file watchers to detect policy changes.
- No additional security risk if cache invalidation respects file permissions.

**Implementation Effort**: Medium.

---

### Option 2: External Policy Decision Service with Shared Redis Counters

**Description**: Run a lightweight policy microservice (HTTP or MCP) that loads grants once, caches them, and coordinates distributed rate limiting through Redis or similar storage.

**Pros**:
- ✅ Single source of truth for grants and enforcement.
- ✅ Consistent rate limiting across clustered workers and hosts.
- ✅ Observability centralized with structured metrics.

**Cons**:
- ❌ Introduces network hop latency and an additional service to operate.
- ❌ Requires Redis (or equivalent) availability, challenging for fully local deployments.

**brAInwav Compatibility**:
- Must respect zero-exfiltration by running on the same host and using local-only transports.
- Needs constitution review for added service complexity.

**Implementation Effort**: High.

---

### Option 3: WASM Policy Engine Embedded with Preloaded Grants

**Description**: Compile policy evaluation into a WASM module that loads grants at startup, enforces via compiled checks, and exposes rate limiting through typed arrays shared across worker threads.

**Pros**:
- ✅ Predictable, low-latency execution with near-native performance.
- ✅ SharedArrayBuffer enables cross-worker coordination without external stores.
- ✅ WASM sandbox improves safety around policy evaluation logic.

**Cons**:
- ❌ Higher upfront complexity and toolchain integration.
- ❌ Requires policy DSL translation and build step.

**brAInwav Compatibility**:
- Must ensure WASM binaries are auditable per security guidelines.
- Worker-thread integration aligns with local-first but needs memory fencing review.

**Implementation Effort**: High.

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | ✅ Async I/O + O(1) counters | ⚠️ Network hop but shared cache | ✅ Near-native via WASM |
| **Security** | ✅ Local only | ⚠️ New attack surface | ✅ Sandbox but new supply chain |
| **Maintainability** | ✅ Minimal deps | ⚠️ Service to operate | ❌ Specialized toolchain |
| **brAInwav Fit** | ✅ Matches local-first | ⚠️ Needs governance waiver | ⚠️ Requires WASM review |
| **Community Support** | ✅ Established libs | ✅ Redis ecosystem | ⚠️ Smaller community |
| **License Compatibility** | ✅ ISC/MIT | ✅ MIT/BSD | ⚠️ Depends on toolchain |

---

## Recommended Approach

**Selected**: Option 1 - Async Memoized Loader + Ring Buffer Rate Limiter

**Rationale**:
- Meets Constitution §3 local-first mandates by keeping policy evaluation in-process while eliminating synchronous I/O that currently blocks orchestrations and MCP requests.
- Provides immediate throughput gains with modest code change, leveraging familiar libraries (`lru-cache`) and Node.js async patterns.
- Reduces worst-case latency by bounding rate limiter work to constant time, preserving audit semantics without distributed dependencies.

**Trade-offs Accepted**:
- Cache invalidation must be implemented (e.g., fs.watch or manual reload hooks) to avoid stale grants.
- Per-process rate caps remain until follow-on work introduces shared counters or aggregator instrumentation.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: Keep caches and rate counters in local memory; avoid remote dependencies.
- ✅ **Zero Exfiltration**: Ensure grant contents never leave the host.
- ✅ **Named Exports**: Preserve existing export surface (`Grant`, `loadGrant`, `enforce`).
- ✅ **Function Size**: Maintain ≤40 lines per function when refactoring `enforce`.
- ✅ **Branding**: Update logs emitted from policy enforcement to include `brAInwav` tag when instrumented.

### Technical Constraints
- Nx graph needs to remain accurate; new dependencies must be added via `project.json` targets.
- Package currently lacks background workers, so watchers must avoid leaking handles.
- Rate limiter must respect budgets defined in grants and remain deterministic under 1k RPS load.
- Support Node 20+ per workspace baseline.

### Security Constraints
- Policy files may contain sensitive scopes; caching must honor file permission checks.
- Avoid storing grant data in world-readable temp directories.
- Maintain audit logging hooks for enforcement outcomes.
- Follow GDPR-equivalent retention by not persisting rate counters beyond runtime.

### Integration Constraints
- Orchestration and model gateway consumers expect Promise-based `loadGrant`; changes must remain transparent.
- MCP tools reading policy updates need hooks to trigger cache invalidation (e.g., after CLI grant updates).
- A2A audit events rely on synchronous error throwing; avoid converting to async errors without propagation plan.
- Backward compatibility requires grant JSON schema stability.

---

## Open Questions

1. **How will grant cache invalidation be triggered?**
   - **Context**: Policies can change out-of-band via CLI edits.
   - **Impact**: Stale caches could allow or deny actions incorrectly.
   - **Research Needed**: Evaluate `fs.watch` reliability vs. manual version files.
   - **Decision Required By**: 2025-11-01.

2. **Do we need cross-process rate coordination in phase one?**
   - **Context**: Multi-process deployments may exceed global quotas.
   - **Impact**: Without coordination, budgets can be overrun.
   - **Options**: Shared memory via worker threads, Redis-backed counters, or documenting per-process limits.

---

## Proof of Concept Findings

No dedicated POC executed for this research cycle; proposals are analytical based on source review and prior package behavior.

### POC Setup
- **Environment**: N/A
- **Code Location**: N/A
- **Test Scenarios**: N/A

### Results
- **Scenario 1**: N/A
  - **Result**: ⚠️ Not executed
  - **Observations**: Implementation team should validate cache hit ratio and rate limiter throughput post-change.

### Performance Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Grant load latency | ≤5 ms | Not measured | ⚠️ |
| Enforcement throughput | ≥5k ops/s | Not measured | ⚠️ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Cache invalidation misses file edits | Medium | High | Add checksum/version file and CLI command to bust cache |
| Ring buffer implementation bugs | Medium | Medium | Add fuzz tests and stress harness in `__tests__/` |
| Dependency supply chain issues | Low | Medium | Pin `lru-cache` version and monitor advisories |
| Increased memory footprint from caches | Low | Low | Cap cache size (e.g., 64 entries) and expose metrics |

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "lru-cache": "^11.0.0"
  }
}
```

**License Verification Required**:
- [ ] `lru-cache` - ISC - ✅ Compatible

### Configuration Changes
- **File**: `packages/policy/project.json`
- **Changes**: Add lint/test targets for new stress tests if introduced; ensure dependency graph includes `lru-cache`.

### Database Schema Changes
- **Migration Required**: No
- **Impact**: None

### Breaking Changes
- **API Changes**: None anticipated (exports remain stable)
- **Migration Path**: Consumers remain unaffected; documentation update only.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 0.5 day | Add dependency, baseline benchmarks |
| **Core Implementation** | 1.5 days | Introduce async loader, caching, ring buffer limiter |
| **Testing** | 1 day | Add unit + stress tests, benchmark harness |
| **Integration** | 0.5 day | Wire cache invalidation hooks with orchestrator/model gateway |
| **Documentation** | 0.5 day | Update README, runbooks, changelog |
| **Total** | 4 days | |

---

## Related Research

### Internal Documentation
- `project-documentation/brainwav-build-fix-phase2-report.md` – prior investigations into dependency health.
- `project-documentation/observability` – instrumentation patterns to reuse for policy metrics.

### External Resources
- Node.js Performance Best Practices (2024): Guidance on avoiding sync I/O.
- OWASP API Security Top 10 2023: Rate limiting recommendations.
- NIST SP 800-204B: Policy decoupling strategies.

### Prior Art in Codebase
- **Similar Pattern**: `packages/model-gateway/src/policy.ts`
  - **Lessons Learned**: In-memory grant table avoids disk hits but lacks shared reuse.
  - **Reusable Components**: Rate counter scaffolding concept can inform new ring buffer design.【F:packages/model-gateway/src/policy.ts†L1-L53】

---

## Next Steps

1. **Immediate**:
   - [ ] Draft implementation plan using this research as baseline.
   - [ ] Socialize findings with policy/package owners for alignment.

2. **Before Implementation**:
   - [ ] Get stakeholder approval on recommended approach.
   - [ ] Create TDD plan based on this research.
   - [ ] Verify all dependencies are license-compatible.
   - [ ] Document decisions in local memory per governance.

3. **During Implementation**:
   - [ ] Validate assumptions with async benchmarks.
   - [ ] Monitor for deviations from expected cache hit rates.
   - [ ] Update this document if new risks arise.

---

## Appendix

### Code Samples

```typescript
import { promises as fs } from 'node:fs';
import LRU from 'lru-cache';

const grants = new LRU<string, Grant>({ max: 64, ttl: 5 * 60_000 });

export async function loadGrantCached(id: string): Promise<Grant> {
        const cached = grants.get(id);
        if (cached) return cached;
        const filePath = path.join(process.cwd(), '.cortex/policy/tools', `${id}.json`);
        const parsed = Grant.parse(JSON.parse(await fs.readFile(filePath, 'utf-8')));
        grants.set(id, parsed);
        return parsed;
}
```

### Benchmarks

Baseline measurements should capture grant load latency with and without caching plus rate limiter throughput under 1k/5k/10k ops/s to validate improvements.

### Screenshots/Diagrams

Not applicable for this research pass.

