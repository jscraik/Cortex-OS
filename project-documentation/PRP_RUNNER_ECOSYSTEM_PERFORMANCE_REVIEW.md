# Research Document: PRP Runner Ecosystem Performance Review

**Task ID**: `packages-prp-runner-performance-review`
**Created**: 2025-10-13
**Researcher**: AI Agent
**Status**: Complete

---

## Objective

Evaluate the current PRP Runner execution, orchestration, and observability surfaces to locate the primary performance bottlenecks and recommend remediation strategies that respect brAInwav governance while improving throughput and latency.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/prp-runner/src/runner.ts`
- **Current Approach**: The workflow initializes gate state, then feeds every gate into `runSpool` with `concurrency: 1`, executing each gate sequentially even when automated checks could run in parallel. Each gate performs synchronous approval checks and writes, and the final document generation hits disk after every run.
- **Limitations**: Sequential spool dispatch lengthens end-to-end latency, the approval provider is synchronous even for auto-approvals, and IO (enforcement profile reads + markdown writes) is repeated for every invocation with no caching.

### Related Components
- **PRP Orchestrator**: `packages/prp-runner/src/orchestrator.ts` maintains a map of sub-agents and runs level-based batches via `ConcurrentExecutor`, but its per-level orchestration resets state for every sub-agent and limits concurrency to four slots regardless of resource headroom.
- **Concurrent Executor**: `packages/prp-runner/src/lib/concurrent-executor.ts` wraps `semaphore-promise` with retries, yet it never reuses results between cycles and applies a fixed timeout, causing idle wait when long-running neurons need more time.
- **Metrics Middleware**: `packages/prp-runner/src/monitoring/metrics.ts` tracks process stats and request counters but collects metrics synchronously on each scrape, which scales poorly without background aggregation.
- **MCP Surface**: `packages/prp-runner/src/mcp/tools.ts` exposes workflow control tools that currently run on the same thread as the runner, meaning MCP requests are blocked by long-running gates.

### brAInwav-Specific Context
- **MCP Integration**: MCP tooling invokes runner operations directly, so throughput bottlenecks cascade to remote agents using these tools.
- **A2A Events**: Event schemas in `packages/prp-runner/src/events/prp-runner-events.ts` expect timely task lifecycle notifications; slow gate execution delays downstream consumers.
- **Local Memory**: Enforcement loading repeatedly parses `initial.md`, preventing effective local-memory reuse for enforcement profiles.
- **Existing Patterns**: Other Cortex-OS ecosystems (e.g., A2A, logging) are migrating toward adaptive batching and keep-alive agents; PRP Runner still relies on sequential loops and per-request initialization.

---

## External Standards & References

### Industry Standards
1. **Node.js Event Loop Utilization (OpenJS Diagnostics WG, 2025)**
   - **Relevance**: Guides when to offload CPU-bound or blocking work to worker pools.
   - **Key Requirements**: Monitor event loop delay, use worker threads for blocking tasks, prefer async IO.

2. **OpenTelemetry Metrics Signals (v1.28)**
   - **Relevance**: Encourages exporting metrics asynchronously with aggregations to reduce scrape overhead.
   - **Key Requirements**: Use async instruments, delta temporality, and batch export on background intervals.

### Best Practices (2025)
- **Async Task Scheduling**: Adopt adaptive concurrency with token budgeting (source: OpenJS Foundation performance playbooks) to match concurrency to load and prevent head-of-line blocking.
  - Application: Replace fixed `concurrency: 1` spool scheduling with adaptive pools sized via configuration and backpressure from approvals.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `p-limit` | ^5.0.0 | Lightweight promise concurrency control | MIT | ⚠️ Evaluate |
| `undici` | ^6.0.0 | HTTP client with connection pooling | MIT | ✅ Use |
| `@opentelemetry/sdk-metrics` | ^1.28.0 | OTEL metrics pipeline | Apache-2.0 | ✅ Use |

---

## Technology Research

### Option 1: Adaptive Gate Dispatch & Approval Batching

**Description**: Increase spool concurrency based on gate class, pre-fetch approvals asynchronously, and stream gate evidence to storage while gates finish.

**Pros**:
- ✅ Removes head-of-line blocking caused by `concurrency: 1` gate scheduling.
- ✅ Supports mixed human/automated gate approvals by overlapping pre-approval checks.
- ✅ Minimal architectural change—enhances existing spool usage.

**Cons**:
- ❌ Requires careful ordering to preserve gate dependencies.
- ❌ Needs new telemetry to avoid overrunning approval channels.

**brAInwav Compatibility**:
- Aligns with Agentic Workflow by keeping gate order deterministic while allowing internal parallelism.
- Requires updated MCP/A2A contracts to note potential simultaneous gate activity.
- Security posture unchanged; approvals remain auditable.

**Implementation Effort**: Medium.

---

### Option 2: Warm Execution Context & Enforcement Cache

**Description**: Cache parsed enforcement profiles and prebuild execution contexts per repository, reducing repeated IO and object creation.

**Pros**:
- ✅ Eliminates redundant `initial.md` parsing and context creation.
- ✅ Enables multi-run workflows to start faster with warmed caches.
- ✅ Straightforward to implement with in-memory LRU keyed by repo.

**Cons**:
- ❌ Must invalidate cache when enforcement files change.
- ❌ Increases memory footprint if many repos are active.

**brAInwav Compatibility**:
- Respects local-first constraints; caches stay in-process.
- Requires governance note to document caching retention policies.

**Implementation Effort**: Low.

---

### Option 3: Worker Thread Offload for MCP & Metrics

**Description**: Move long-running gate execution to a worker pool and expose MCP control/metrics from the main thread.

**Pros**:
- ✅ Frees the main event loop for MCP traffic and metrics scrapes.
- ✅ Allows CPU-heavy gates (e.g., linting) to run without blocking instrumentation.
- ✅ Scales with core count.

**Cons**:
- ❌ Significant refactor to share state between threads.
- ❌ Requires serialization of gate results and approvals.

**brAInwav Compatibility**:
- Must ensure worker threads honor governance (logging, evidence capture).
- Additional complexity for security review.

**Implementation Effort**: High.

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | ✅ Removes primary bottleneck | ⚠️ Improves warm starts only | ✅ Major gains if completed |
| **Security** | ✅ Approval flow unchanged | ✅ Cache stays local | ⚠️ Requires new review |
| **Maintainability** | ⚠️ Moderate complexity | ✅ Simple cache logic | ❌ Higher maintenance |
| **brAInwav Fit** | ✅ Aligns with workflow | ✅ Respects constraints | ⚠️ Additional governance |
| **Community Support** | ✅ Uses existing spool patterns | ✅ Common caching patterns | ⚠️ Worker thread orchestration |
| **License Compatibility** | ✅ No new deps | ✅ No new deps | ⚠️ Potential worker libs |

---

## Recommended Approach

**Selected**: Option 1 - Adaptive Gate Dispatch & Approval Batching (with Option 2 as supporting enhancement)

**Rationale**:
- Sequential gate execution is the largest latency source; lifting the `concurrency: 1` restriction and overlapping approval checks offers immediate improvements without re-architecting the runner. The existing spool contract can support dynamic concurrency and task-level timeouts, making this change incremental.
- Combining adaptive dispatch with a lightweight enforcement cache (Option 2) addresses repeated IO overhead, allowing cold starts to improve while Option 1 handles throughput for long-running workflows. This hybrid plan adheres to the Agentic Coding Workflow by preserving deterministic gate ordering when approvals fail.
- The approach keeps governance simple: evidence capture and approvals still flow through existing structures, and metrics additions can reuse current middleware with minimal change.

**Trade-offs Accepted**:
- Accept additional scheduling complexity in exchange for latency reductions.
- Defer worker thread offload, acknowledging potential future refactor if CPU-bound gates increase.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: Adaptive dispatch and caching remain in-process.
- ✅ **Zero Exfiltration**: No external storage introduced.
- ✅ **Named Exports**: Existing module structure maintained.
- ✅ **Function Size**: Adjust scheduling logic while keeping functions within 40-line guidance.
- ✅ **Branding**: No new branding surfaces added.

### Technical Constraints
- Nx monorepo execution must respect affected graphs; concurrency knobs should be configurable via env vars.
- Existing `ConcurrentExecutor` defaults to four slots; adaptive logic must coordinate with spool concurrency to avoid oversubscription.
- Need to guard against unbounded memory usage from caches.
- Must operate on macOS/Linux where local runners execute.

### Security Constraints
- Approval batching requires audit trail updates to show overlapped approvals.
- Cache must respect enforcement file permissions and avoid stale governance data.
- Metrics exports should continue to redact sensitive labels.

### Integration Constraints
- MCP tool handlers need to surface new status fields for concurrently running gates.
- A2A event schemas may require optional fields to represent batched completions.
- Database persistence is unaffected; no schema changes anticipated.
- Maintain backward compatibility by defaulting concurrency to 1 until feature flag enabled.

---

## Open Questions

1. **How should gate dependencies be expressed when multiple gates run concurrently?**
   - **Context**: Current gate definitions assume sequential execution.
   - **Impact**: Unclear dependencies could lead to race conditions.
   - **Research Needed**: Audit each gate implementation for implicit ordering requirements.
   - **Decision Required By**: 2025-10-27.

2. **What telemetry granularity is required for approval batching?**
   - **Context**: Observability must show parallel approvals.
   - **Impact**: Without detail, operators cannot diagnose stuck approvals.
   - **Options**: Expand metrics registry vs. emit A2A audit events.

---

## Proof of Concept Findings

### POC Setup
- **Environment**: Not executed within this research cycle.
- **Code Location**: N/A.
- **Test Scenarios**: N/A.

### Results
- **Scenario 1**: Adaptive spool concurrency
  - **Result**: ⚠️ Not executed
  - **Observations**: Requires future prototype.

- **Scenario 2**: Enforcement cache hit/miss measurement
  - **Result**: ⚠️ Not executed
  - **Observations**: Needs instrumentation plan.

### Performance Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| End-to-end PRP latency | ≤ 10 min | N/A | ⚠️ |
| Gate throughput per hour | ≥ 30 | N/A | ⚠️ |
| Approval wait time | ≤ 30 s | N/A | ⚠️ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Misconfigured concurrency causing overload | Medium | High | Default to conservative concurrency, add circuit breakers |
| Cache staleness leading to outdated enforcement | Medium | Medium | Hash enforcement files and invalidate on change |
| Approval batching hides audit trails | Low | High | Emit detailed A2A audit events and extend review JSON |
| Increased complexity in tests | Medium | Medium | Expand unit tests for scheduler and caches |

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
- **File**: `packages/prp-runner/src/config/index.ts`
- **Changes**: Introduce `PRP_SPOOL_CONCURRENCY` and `PRP_APPROVAL_BATCH_SIZE` settings with sane defaults.

### Database Schema Changes
- **Migration Required**: No
- **Impact**: None

### Breaking Changes
- **API Changes**: MCP status endpoints may surface additional `activeGates` arrays.
- **Migration Path**: Default concurrency flag to `1` unless explicitly enabled; document upgrade steps in README.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 1 day | Add configuration flags, baseline metrics |
| **Core Implementation** | 3 days | Implement adaptive spool dispatch and approval batching |
| **Testing** | 2 days | Expand unit/integration tests for concurrency paths |
| **Integration** | 1 day | Update MCP tools and A2A events |
| **Documentation** | 0.5 day | Update README, runbooks, and governance notes |
| **Total** | 7.5 days | |

---

## Related Research

### Internal Documentation
- `/.cortex/rules/agentic-coding-workflow.md`
- `project-documentation/CORTEX_CODE_MCP_IMPLEMENTATION.md`
- `project-documentation/orchestration-langgraph-refactor-plan.md`

### External Resources
- OpenJS Diagnostics WG: Event Loop Utilization whitepaper (2025-06)
- OpenTelemetry Metrics SIG: v1.28 release notes
- Node.js Performance Best Practices (2025 edition)

### Prior Art in Codebase
- **Similar Pattern**: `packages/orchestration/src/spool.ts`
  - **Lessons Learned**: Adaptive concurrency with token budgets prevents starvation.
  - **Reusable Components**: `runSpool` configuration options and circuit breakers.

---

## Next Steps

1. **Immediate**:
   - [ ] Socialize findings with PRP Runner maintainers in #cortex-ops.
   - [ ] Capture cache invalidation requirements in a follow-up task.

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

```typescript
// Sketch: adaptive spool configuration stub
export interface AdaptiveSpoolConfig {
  baseConcurrency: number;
  maxConcurrency: number;
  approvalBatchSize: number;
}

export const createAdaptiveSpoolConfig = (): AdaptiveSpoolConfig => ({
  baseConcurrency: Number(process.env.PRP_SPOOL_CONCURRENCY ?? 1),
  maxConcurrency: Number(process.env.PRP_SPOOL_MAX_CONCURRENCY ?? 4),
  approvalBatchSize: Number(process.env.PRP_APPROVAL_BATCH_SIZE ?? 2),
});
```

### Benchmarks

_To be collected during implementation once prototypes exist._

### Screenshots/Diagrams

_Not applicable for this research task._
