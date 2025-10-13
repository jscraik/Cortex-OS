# Research Document: Kernel Ecosystem Performance Review

**Task ID**: `[packages-kernel-performance-review]`
**Created**: 2025-10-13
**Researcher**: AI Agent
**Status**: Complete

---

## Objective

Evaluate the current Cortex Kernel package implementation to identify performance bottlenecks across workflow execution, deterministic scheduling, and MCP adapter pathways, and produce actionable recommendations that respect brAInwav governance constraints.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/kernel/src/graph-simple.ts`
- **Current Approach**: The simplified kernel runner constructs a pseudo-LangGraph wrapper that executes `runStrategyNode`, `runBuildNode`, and `runEvaluationNode` sequentially while appending each intermediate `PRPState` snapshot to an in-memory `executionHistory` map keyed by `runId`.
- **Limitations**: Sequential execution prevents overlapping node work or early exit once evaluation has enough signal, and the unbounded in-memory history map grows with every state copy, raising per-run memory pressure for long-lived processes.

- **Location**: `packages/kernel/src/scheduler/deterministicScheduler.ts`
- **Current Approach**: Deterministic scheduling sorts tasks by priority and a seeded hash, then iterates through batches sized by `maxConcurrent`. Each batch is trimmed for memory, but tasks inside the batch execute serially via an inner `for` loop to preserve determinism.
- **Limitations**: Batching without actual parallelism keeps throughput single-threaded, while synchronous hashing and proof generation import costs hit every invocation. Dynamic imports for proof support also block the event loop.

- **Location**: `packages/kernel/src/mcp/adapter.ts`
- **Current Approach**: MCP adapter lazily creates contexts per run, but every `executeTool` call constructs a new `CortexHooks` instance, runs pre/post hooks sequentially, and never evicts stored contexts unless callers manually invoke `cleanupContext`.
- **Limitations**: Hook initialization on every tool invocation adds cold-start latency, while retaining all contexts in the `Map` leads to leaks for long-running kernels. Pre/post hooks run serially even when independent, elongating tool latency.

- **Location**: `packages/kernel/src/tools/bind-kernel-tools.ts`
- **Current Approach**: Kernel tool bindings wrap shell, filesystem, and HTTP helpers with allowlist enforcement and per-call resource checks.
- **Limitations**: Shell execution relies on spawning a new process for each command with strict allowlists, leading to high overhead for repeated diagnostics. HTTP fetches create new `AbortController` and fetch requests without agent pooling, preventing connection reuse.

### Related Components
- **`packages/orchestration`**: Provides the `workflowStateToN0` bridge used by the LangGraph integration to emit state to the orchestrator, so any scheduling change must keep exported contract compatibility.
- **`packages/hooks`**: Supplies the `CortexHooks` implementation repeatedly instantiated by the MCP adapter, so caching and lifecycle improvements should coordinate with hook initialization semantics.

### brAInwav-Specific Context
- **MCP Integration**: Kernel MCP tools emit deterministic evidence artifacts expected by downstream proof systems, so batching or caching must preserve signed payload order.
- **A2A Events**: Kernel exports graph events consumed by downstream packages, requiring any scheduler refactor to keep event sequencing deterministic for audit replay.
- **Local Memory**: Execution history snapshots feed local memory persistence; trimming must retain governance-mandated checkpoints while avoiding runaway growth.
- **Existing Patterns**: Deterministic scheduler mirrors strategies used in `packages/asbr` and `packages/agents`, so improvements should align with the broader deterministic execution roadmap.

---

## External Standards & References

### Industry Standards
1. **Node.js Performance Best Practices (OpenJS Foundation, 2025)**
   - **Relevance**: Highlights async resource pooling and worker threads to minimize event-loop blocking in long-lived Node services.
   - **Key Requirements**:
     - Reuse network agents with keep-alive.
     - Offload CPU-intensive work to worker pools.
     - Avoid unbounded in-memory caches.

2. **LangGraph Deterministic Execution Guidelines (LangChain 2025)**
   - **Relevance**: Emphasizes deterministic branching with asynchronous node resolution to maintain reproducibility while improving throughput.
   - **Key Requirements**:
     - Stable edge selection order.
     - Replayable execution traces.
     - Checkpoint pruning with audit retention controls.

### Best Practices (2025)
- **Deterministic Concurrency**: Use bounded async pools (e.g., `p-limit`, worker threads) that respect input ordering but allow overlapped I/O.  
    - Source: OpenJS Foundation recommendations above.  
    - Application: Kernel scheduler can batch tasks using promises resolved with deterministic commit order while increasing throughput.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `p-limit` | 5.x | Promise concurrency control with deterministic commit order | MIT | ✅ Use |
| `Piscina` | 4.x | Worker thread pool for CPU-bound hooks or proofs | MIT | ⚠️ Evaluate |
| `undici` Agent | 6.x | HTTP keep-alive agent for Node fetch | MIT | ✅ Use |

---

## Technology Research

### Option 1: Deterministic Async Pooling

**Description**: Introduce a bounded async pool for scheduler batches where tasks execute concurrently but results commit in original deterministic order using a promise queue. Reuse the same pattern for MCP hook execution and proof generation.

**Pros**:
- ✅ Improves throughput for I/O-bound tasks without breaking deterministic ordering.
- ✅ Allows CPU-intensive work to be handed off to worker pools opportunistically.
- ✅ Minimal API change; consumers still call `schedule` and receive ordered records.

**Cons**:
- ❌ Requires careful error propagation to maintain `failFast` semantics.
- ❌ Adds complexity to trace debugging due to overlapped execution windows.

**brAInwav Compatibility**:
- Aligns with deterministic replay requirements if commit order is preserved.
- Compatible with MCP/A2A contracts since external ordering remains unchanged.
- Security posture unchanged; uses existing hook sandboxing.

**Implementation Effort**: Medium.

---

### Option 2: Worker Thread Proof & Hook Service

**Description**: Spin up a shared worker thread pool using `Piscina` to handle proof generation, hook evaluation, and expensive CLI invocations, isolating heavy work from the main event loop.

**Pros**:
- ✅ Removes CPU spikes from the main loop, improving latency for kernel orchestration.
- ✅ Provides an isolated environment for hooks, reducing risk of blocking core logic.

**Cons**:
- ❌ Requires message serialization for complex objects.
- ❌ Higher operational complexity (lifecycle, monitoring, memory overhead per worker).

**brAInwav Compatibility**:
- Must ensure workers respect governance logging and deterministic outputs.
- Integration with MCP/A2A surfaces requires additional telemetry propagation.

**Implementation Effort**: High.

---

### Option 3: Minimalist Cache & Instrumentation Hardening

**Description**: Focus on trimming execution history, caching hook initialization, and adding metrics to identify hot paths without introducing concurrency changes.

**Pros**:
- ✅ Low-risk improvements with immediate memory relief.
- ✅ Simplifies observability to guide future optimization.

**Cons**:
- ❌ Limited throughput gains; still single-threaded.
- ❌ Defers structural fixes to scheduling and MCP tooling.

**brAInwav Compatibility**:
- Straightforward alignment; purely internal refactors.

**Implementation Effort**: Low.

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | ✅ Bounded parallelism for I/O and CPU tasks | ✅ High for CPU-heavy workloads | ⚠️ Incremental only |
| **Security** | ✅ Reuses existing guards | ⚠️ Requires worker sandbox hardening | ✅ No change |
| **Maintainability** | ⚠️ Moderate complexity | ❌ Higher maintenance burden | ✅ Simple |
| **brAInwav Fit** | ✅ Preserves deterministic traces | ⚠️ Needs additional governance hooks | ✅ Fully aligned |
| **Community Support** | ✅ Mature async utilities | ✅ Active worker thread ecosystem | ✅ No new deps |
| **License Compatibility** | ✅ MIT | ✅ MIT | ✅ N/A |

---

## Recommended Approach

**Selected**: Option 1 - Deterministic Async Pooling

**Rationale**:
Adopting bounded async pooling maximizes kernel throughput while keeping deterministic execution guarantees intact. Scheduler batches can leverage promise-based parallelism so long as record commits follow the seeded sort order, satisfying replay needs without rewriting downstream contracts. MCP adapter hooks and proof generation can reuse the same pool, amortizing initialization while preventing repeated dynamic imports from stalling the event loop. Compared to worker threads, this path minimizes operational overhead yet unlocks measurable latency improvements, especially when MCP tools perform I/O-bound work such as filesystem reads or ESLint invocations.

**Trade-offs Accepted**:
- Accept slightly more complex scheduling code with promise coordination.
- Defer full worker-thread isolation for CPU-bound proofs to a follow-up milestone if async pooling proves insufficient.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: Async pooling operates within the local runtime without external services.
- ✅ **Zero Exfiltration**: MCP tool wrappers continue enforcing filesystem/network allowlists.
- ✅ **Named Exports**: Scheduler APIs remain named exports to satisfy linting rules.
- ✅ **Function Size**: Refactors must keep functions within 40-line limits by extracting helpers.
- ✅ **Branding**: Logging should retain `[kernel]` namespace for brAInwav observability.

### Technical Constraints
- Nx monorepo tasks rely on deterministic outputs; updates must not break affected graph detection.
- Dynamic proof imports should be cached to avoid repeated module loading overhead.
- Performance budgets require p95 latency ≤ 250 ms; async pooling must be benchmarked to confirm improvement.
- Cross-platform support (macOS/Linux) demands avoiding native extensions when possible.

### Security Constraints
- Hook execution must maintain existing denial/allow flows and audit logging.
- Proof generation remains subject to tamper-evident logging; caching cannot skip signature validation.
- Shell tool pooling cannot weaken allowlist enforcement.
- Compliance with governance logs and MCP evidence retention must stay intact.

### Integration Constraints
- MCP contracts require deterministic evidence ordering for downstream proofs.
- A2A event schemas must remain stable; any concurrency must not emit duplicate events.
- No database schema today, but history trimming should align with potential persistence adapters.
- Backward compatibility with `deterministicSchedule` consumers is mandatory.

---

## Open Questions

1. **How many concurrent MCP tool invocations does the orchestrator expect per run?**
   - **Context**: Determining the optimal pool size depends on orchestrator throttling.
   - **Impact**: Overprovisioning could overwhelm shared resources; underprovisioning limits gains.
   - **Research Needed**: Instrument current runs to capture concurrent tool call peaks.
   - **Decision Required By**: Prior to implementation kickoff (2025-10-31).

2. **Should proof generation migrate to worker threads in phase two?**
   - **Context**: Proof hashing can be CPU-bound; async pooling may be insufficient.
   - **Impact**: Affects timeline and dependency planning.
   - **Options**: Stay on async pooling with caching vs. adopt worker threads after benchmarking.

---

## Proof of Concept Findings

### POC Setup
- **Environment**: Not yet executed; pending approval to build async pooling prototype.
- **Code Location**: N/A.
- **Test Scenarios**: N/A.

### Results
- **Scenario 1**: N/A  
  - **Result**: ⚠️ Not run  
  - **Observations**: Pending implementation.

- **Scenario 2**: N/A  
  - **Result**: ⚠️ Not run  
  - **Observations**: Pending implementation.

### Performance Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Throughput gain | ≥20% | N/A | ⚠️ |
| Hook latency | ≤50 ms | N/A | ⚠️ |
| Proof import overhead | ≤10 ms | N/A | ⚠️ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Async pool breaks deterministic ordering | Medium | High | Use ordered promise resolution and regression tests with recorded traces |
| Hook caching leaks stale contexts | Medium | Medium | Add lifecycle hooks to evict contexts post-run and expose metrics |
| Added dependencies introduce supply chain risk | Low | Medium | Pin versions and run existing security scans |

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
- [x] `p-limit` - MIT - ✅ Compatible

### Configuration Changes
- **File**: `packages/kernel/package.json`
- **Changes**: Add `p-limit` dependency and potentially a build script for worker pools if adopted later.

### Database Schema Changes
- **Migration Required**: No
- **Impact**: N/A

### Breaking Changes
- **API Changes**: None expected; ensure `deterministicSchedule` signature remains stable.
- **Migration Path**: Consumers get improved performance transparently once published.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 1 day | Capture baseline metrics, align on pool size |
| **Core Implementation** | 3 days | Refactor scheduler, cache proof imports, add MCP hook pooling |
| **Testing** | 2 days | Extend deterministic replay tests, add load tests |
| **Integration** | 1 day | Validate MCP/A2A flows and orchestrator expectations |
| **Documentation** | 0.5 day | Update README/runbooks and governance notes |
| **Total** | 7.5 days | |

---

## Related Research

### Internal Documentation
- `project-documentation/AGENTS_ECOSYSTEM_PERFORMANCE_REVIEW.md`
- `project-documentation/ASBR_ECOSYSTEM_PERFORMANCE_REVIEW.md`
- `project-documentation/COMMANDS_ECOSYSTEM_PERFORMANCE_REVIEW.md`

### External Resources
- OpenJS Foundation Node.js Performance Best Practices (2025): Guidance on async resource pooling.
- LangChain LangGraph Deterministic Execution Guide (2025): Recommendations for deterministic async flows.
- V8 CPU Profiling Recipes (2025): Techniques for isolating event-loop blocking tasks.

### Prior Art in Codebase
- **Similar Pattern**: `packages/asbr/src/scheduler` (deterministic batching)  
  - **Lessons Learned**: Async instrumentation improved throughput without breaking replay.
  - **Reusable Components**: Deterministic hashing utilities and tracing hooks.

---

## Next Steps

1. **Immediate**:
   - [ ] Socialize findings with kernel maintainers (#cortex-ops).
   - [ ] Capture current throughput and latency baselines in observability stack.

2. **Before Implementation**:
   - [ ] Get stakeholder approval on recommended approach.
   - [ ] Create TDD plan based on this research.
   - [ ] Verify all dependencies are license-compatible.
   - [ ] Document insights in local memory MCP for future reference.

3. **During Implementation**:
   - [ ] Validate assumptions with deterministic replay tests.
   - [ ] Monitor for deviations from research findings.
   - [ ] Update this document if new information emerges.

---

## Appendix

### Code Samples

```typescript
import pLimit from 'p-limit';

const limit = pLimit(4);
const ordered = tasks.map((task, index) => ({ task, index }));
const results: Array<ExecutionRecord> = new Array(ordered.length);

await Promise.all(
  ordered.map(({ task, index }) =>
    limit(async () => {
      const record = await executeTask(task);
      results[index] = record;
    })
  ),
);

return finalizeResults(results);
```

### Benchmarks
- Pending once async pooling prototype is implemented.

### Screenshots/Diagrams
- Not applicable for this research pass.
