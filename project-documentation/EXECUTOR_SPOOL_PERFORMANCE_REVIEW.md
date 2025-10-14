# Research Document: Executor Spool Performance Review

**Task ID**: `packages-executor-spool-performance-review`
**Created**: 2025-10-13
**Researcher**: AI Agent (gpt-5-codex)
**Status**: Complete

---

## Objective

Provide a focused performance assessment of the `@cortex-os/executor-spool` package, cataloguing current latency, throughput, and memory behaviors across filesystem spooling, persistent shell execution, and restricted fetch surfaces, and recommend actionable optimizations that align with brAInwav governance.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/executor-spool/src/spool.ts`
- **Current Approach**: Maintains an in-memory `Map` of file snapshots, eagerly reading entire files on first touch and re-writing whole contents for each mutation before producing per-file diffs with `@cortex-os/patchkit`. Commits iterate serially through tracked entries, re-applying validators and optional commit gates prior to mutating on-disk state. ([packages/executor-spool/src/spool.ts](../../packages/executor-spool/src/spool.ts#L1-L205))
- **Limitations**:
  - Full-file reads/writes on every operation cause quadratic behavior when manipulating large assets; there is no chunking or streaming diff support.
  - `diff()` recalculates `createDiff` for every touched entry on demand, which scales poorly for large batches and re-runs validators with identical inputs.
  - `batch()` executes sequentially without short-circuiting for idempotent operations or coalescing of same-file updates, amplifying I/O churn.
  - `reset()` rewrites every tracked entry even when unchanged since last commit, extending rollback latency under heavy workloads. ([packages/executor-spool/src/spool.ts](../../packages/executor-spool/src/spool.ts#L131-L204))

### Related Components
- **Persistent Shell**: `packages/executor-spool/src/shell.ts` — Provides a long-lived bash process with serialized command execution through a promise chain, sentinel-based completion detection, and 2 MB aggregate stdout buffering. ([packages/executor-spool/src/shell.ts](../../packages/executor-spool/src/shell.ts#L1-L216))
- **Restricted Fetch**: `packages/executor-spool/src/fetch.ts` — Wraps global `fetch` with host allowlists, simple token-bucket rate limiting, and eager buffering of entire response bodies into memory. ([packages/executor-spool/src/fetch.ts](../../packages/executor-spool/src/fetch.ts#L1-L108))

### brAInwav-Specific Context
- **MCP Integration**: Executor spool backs MCP tool execution, so filesystem diffs gate outbound mutations while persistent shells execute toolchains with policy enforcement.
- **A2A Events**: Shell results feed downstream orchestration topics; serialized execution constrains A2A throughput for agent actions requiring concurrent shell access.
- **Local Memory**: Spool diffs power memory persistence; present design replays entire files, risking timeouts on large journal flushes without incremental updates.
- **Existing Patterns**: Other packages (e.g., connectors, logging) favor keep-alive HTTP agents and bounded worker pools; executor-spool currently diverges, creating inconsistent observability and throttling semantics.

---

## External Standards & References

### Industry Standards
1. **Node.js File System Performance Guidelines** (Node.js docs)
   - **Relevance**: Highlights benefits of streaming and `FileHandle` re-use to avoid repeated full-file writes.
   - **Key Requirements**: Prefer buffered writes, reuse handles, avoid synchronous disk operations on hot paths.

2. **POSIX Shell Resource Control**
   - **Relevance**: Encourages job control, ulimit enforcement, and output streaming to manage resource contention in long-lived shells.
   - **Key Requirements**: Bound CPU/memory per job, support asynchronous monitoring, ensure timely cleanup on timeout.

### Best Practices (2025)
- **HTTP Client Efficiency**: Adopt connection pooling (e.g., `undici.Agent`) and request coalescing to minimize TLS handshake overhead and reduce latency under burst traffic.
  - Source: Node.js `undici` maintainers' 2025 performance notes.
  - Application: Replace bare `fetch` usage in restricted fetch with a shared agent and per-policy circuit breakers.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `undici` | ^6.19.0 | HTTP client with keep-alive pooling | MIT | ✅ Use |
| `p-limit` | ^5.0.0 | Promise concurrency limiting | MIT | ✅ Use |
| `fs/promises` streaming APIs (`FileHandle.createWriteStream`) | Node 22 LTS | Incremental file writes | MIT-like (Node.js) | ✅ Use |
| `lru-cache` | ^11.0.0 | Memoize diffs/validators | ISC | ⚠️ Evaluate |

---

## Technology Research

### Option 1: Bounded Worker Pools with Streaming I/O

**Description**: Introduce a configurable worker pool for persistent shell jobs and spool file operations, combining promise concurrency control (`p-limit`) with streaming read/write APIs and incremental hashing to avoid full-buffer materialization.

**Pros**:
- ✅ Improves throughput by allowing parallel shell runs within safety limits.
- ✅ Reduces memory pressure via chunked file writes and streaming diff computation.
- ✅ Enables fine-grained instrumentation hooks per worker for metrics.

**Cons**:
- ❌ Requires refactoring to handle concurrent access to shared spool maps.
- ❌ Demands additional locking or conflict detection to prevent race conditions on the same file.

**brAInwav Compatibility**:
- Aligns with Constitution emphasis on deterministic behavior if worker scheduling stays deterministic per session.
- Requires MCP coordination to avoid exceeding sandbox policies but integrates with existing telemetry hooks.
- Needs security review to ensure concurrency does not bypass validators.

**Implementation Effort**: Medium-High

---

### Option 2: Snapshot Delta Optimization and Diff Memoization

**Description**: Maintain per-file content hashes and memoized diffs to short-circuit redundant `createDiff` invocations, and lazily load file contents only when validation/commit occurs.

**Pros**:
- ✅ Cuts repeated diff computation for unchanged files across successive `diff()` calls.
- ✅ Defers disk reads for untouched files, lowering cold-start latency.
- ✅ Compatible with existing sequential flow, minimizing churn.

**Cons**:
- ❌ Hash maintenance adds CPU overhead on every write/replace.
- ❌ Memoization invalidation complexity grows with large file counts.

**brAInwav Compatibility**:
- Preserves deterministic commit semantics.
- Minimal impact on security boundaries.
- Works with current validators and commit gates without API changes.

**Implementation Effort**: Medium

---

### Option 3: Externalized Sandbox Microservice

**Description**: Replace in-process shell and filesystem management with a dedicated sandbox microservice that exposes RPC for job submission, leveraging containerized execution and remote storage.

**Pros**:
- ✅ Strong isolation and resource governance.
- ✅ Horizontal scalability for concurrent workloads.

**Cons**:
- ❌ Introduces network latency and departs from local-first principles.
- ❌ Requires substantial infra investment and new deployment pipeline.

**brAInwav Compatibility**:
- Conflicts with local-first mandate; increases exfiltration risk if not tightly controlled.
- Complicates MCP/A2A integration due to remote dependency.

**Implementation Effort**: High

---

## Comparative Analysis

Criteria | Option 1 | Option 2 | Option 3
----------|----------|----------|----------
**Performance** | High gains via concurrency & streaming | Moderate gains via caching | Variable; depends on network
**Security** | Requires careful sandbox limits | Neutral | Higher risk (remote surface)
**Maintainability** | Moderate complexity | Low complexity | High operational burden
**brAInwav Fit** | Strong (local-first preserved) | Strong | Weak
**Community Support** | Strong (Node ecosystem) | Strong | Mixed
**License Compatibility** | MIT/ISC | MIT/ISC | Varies by platform

---

## Recommended Approach

**Selected**: Option 1 - Bounded Worker Pools with Streaming I/O

**Rationale**:
Option 1 directly addresses the dominant bottlenecks: serialized shell execution and whole-file rewrites. Introducing a bounded worker pool preserves determinism by enforcing an ordered queue per file while allowing parallel execution for disjoint workloads. Streaming reads/writes and incremental diffing align with Node.js performance guidance and keep operations local, satisfying Constitution requirements for local-first execution and zero exfiltration. Instrumentation hooks per worker provide the telemetry needed to observe saturation and feed the Ops dashboard. Compared to Option 2, Option 1 offers broader improvements (latency, throughput, observability) instead of focusing solely on diff recomputation, and avoids the governance conflicts of Option 3.

**Trade-offs Accepted**:
- Additional synchronization complexity is introduced, requiring rigorous unit tests and perhaps a lightweight lock manager.
- Short-term development cost rises due to refactoring, but future enhancements (e.g., adaptive throttling) become easier.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: All changes remain in-process within the sandbox runtime.
- ✅ **Zero Exfiltration**: No new outbound network surfaces are added.
- ✅ **Named Exports**: Module exports stay within current index conventions. 【F:packages/executor-spool/src/index.ts†L1-L20】
- ✅ **Function Size**: Streaming helpers must stay ≤40 lines per governance.
- ✅ **Branding**: Logging emitted by new workers should include `brAInwav` tags per logging standards.

### Technical Constraints
- Nx workspace requires executor updates to respect target inference.
- Existing TypeScript config mandates ES module semantics.
- Performance budgets: cold-start ≤800 ms, p95 latency ≤250 ms, memory ≤256 MB (per local AGENTS spec).
- Platform support: Linux focus; macOS developers rely on same Node APIs.

### Security Constraints
- Maintain validator and commit gate invocation order.
- Ensure concurrency respects allowlists and prevents command injection.
- Preserve audit logs for shell invocations and fetches.

### Integration Constraints
- MCP contracts expect deterministic diffs; worker pool must not reorder commit outputs.
- A2A topics rely on sequential result streaming; introduce buffering/backpressure accordingly.
- No schema changes anticipated for persistence layers.

---

## Open Questions

1. **What concurrency level preserves deterministic replay while providing measurable throughput gains?**
   - **Context**: Current serialized queue avoids conflicts entirely.
   - **Impact**: Overly high concurrency risks diff race conditions; too low yields minimal benefit.
   - **Research Needed**: Benchmark worker counts (2, 4, 8) against synthetic workloads.
   - **Decision Required By**: Before implementation kickoff.

2. **Should validator execution remain global or become file-scoped?**
   - **Context**: Validators run across all patches, potentially expensive with many touched files.
   - **Impact**: Per-file validation could reduce latency but might miss cross-file invariants.
   - **Options**: Keep global; add optional per-file validators; hybrid approach.

---

## Proof of Concept Findings

### POC Setup
- **Environment**: Not executed in sandbox (vibe check endpoint unavailable).
- **Code Location**: N/A
- **Test Scenarios**: Pending once worker pool prototype exists.

### Results
- **Scenario 1**: Streaming diff with worker pool — ⚠️ Pending
  - **Observations**: Requires future benchmarking harness.

- **Scenario 2**: Keep-alive restricted fetch — ⚠️ Pending
  - **Observations**: Dependent on `undici` adoption plan.

### Performance Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Worker queue throughput (jobs/sec) | ≥2x baseline | Pending | ⚠️ |
| Diff computation latency (ms per 1k lines) | ≤25 ms | Pending | ⚠️ |
| Restricted fetch handshake latency (ms) | ≤50 ms | Pending | ⚠️ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Race conditions on shared file entries | Medium | High | Introduce per-path mutexes and expand test coverage |
| Increased memory footprint from worker queues | Medium | Medium | Cap queue size, measure usage via `usage.maxRssMb` metrics | 【F:packages/executor-spool/src/shell.ts†L35-L68】
| Dependency drift (e.g., `undici` API changes) | Low | Medium | Pin versions and monitor release notes |

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "p-limit": "^5.0.0",
    "undici": "^6.19.0"
  }
}
```

**License Verification Required**:
- [ ] `p-limit` - MIT - ✅ Compatible
- [ ] `undici` - MIT - ✅ Compatible

### Configuration Changes
- **File**: `packages/executor-spool/project.json`
- **Changes**: Introduce new targets for worker pool benchmarks (`pnpm --filter executor-spool test:perf`).

### Database Schema Changes
- **Migration Required**: No
- **Impact**: None

### Breaking Changes
- **API Changes**: None expected if worker pool stays internal.
- **Migration Path**: Document concurrency settings defaults; expose feature flag for staged rollout.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 1 week | Add dependencies, scaffold worker pool, baseline benchmarks |
| **Core Implementation** | 2 weeks | Refactor spool and shell flows to use concurrency + streaming |
| **Testing** | 1 week | Unit tests, race detection, performance regression harness |
| **Integration** | 0.5 week | Wire telemetry to Ops dashboard, update MCP adapters |
| **Documentation** | 0.5 week | Update READMEs, runbooks, and configuration notes |
| **Total** | 5 weeks | |

---

## Related Research

### Internal Documentation
- `PERFORMANCE_OPTIMIZATION_GUIDE.md` — baseline performance practices.
- `packages/executor-spool/README.md` — high-level package purpose.

### External Resources
- Node.js `undici` documentation: connection pooling best practices.
- Linux cgroups v2 docs: resource isolation references.
- POSIX shell job control guide: timeout/kill behaviors.

### Prior Art in Codebase
- **Similar Pattern**: `packages/executor-spool/src/shell.ts`
  - **Lessons Learned**: Serialized queue avoids conflicts but limits throughput.
  - **Reusable Components**: Sentinel-based exit detection, resource usage reporting.

---

## Next Steps

1. **Immediate**:
   - [ ] Socialize findings with @brAInwav-devs and #cortex-ops.
   - [ ] Align on target worker-pool concurrency limits.

2. **Before Implementation**:
   - [ ] Get stakeholder approval on recommended approach.
   - [ ] Create TDD plan based on this research.
   - [ ] Verify all dependencies are license-compatible.
   - [ ] Document in local memory for future reference once service reachable.

3. **During Implementation**:
   - [ ] Validate assumptions with performance tests.
   - [ ] Monitor for deviations from research findings.
   - [ ] Update this document if new information emerges.

---

## Appendix

### Code Samples

```typescript
// Sketch: worker queue wrapper for persistent shell commands
import pLimit from 'p-limit';

const limit = pLimit(4);

export const runShellJob = <T>(job: () => Promise<T>) => limit(job);
```

### Benchmarks
- Pending once prototype available.

### Screenshots/Diagrams
- Not applicable for this research pass.

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-13 | AI Agent (gpt-5-codex) | Initial research |

---

**Status**: Complete

**Stored in Local Memory**: No (local-memory MCP unavailable in sandbox)

Co-authored-by: brAInwav Development Team
