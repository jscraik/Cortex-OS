# Research Document: Patchkit Ecosystem Performance Review

**Task ID**: `packages-patchkit-performance-review`
**Created**: 2025-10-11
**Researcher**: AI Agent (gpt-5-codex)
**Status**: Complete

---

## Objective

Evaluate the @cortex-os/patchkit package and its consumers to document current performance characteristics, identify bottlenecks impacting diff generation and application, and recommend mitigations that protect executor-spool throughput and downstream UI diff rendering.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/patchkit/src/diff.ts`
- **Current Approach**: Patchkit wraps the `diff` npm module to synchronously build structured patches, flatten hunks, and compute summaries for every touched file. Each `createDiff` call renders both a structured patch and a full unified diff string with identical context settings before hashing the before/after payloads. `applyPatch` proxies to the unified patch helper, and `hasConflicts` simply retries and traps errors to flag conflicts. JSON side-by-side formatting stringifies values eagerly for UI consumption. 【F:packages/patchkit/src/diff.ts†L1-L156】
- **Limitations**: Generating both structured and unified representations doubles diff work for large files, flattening hunks for summaries causes repeated array allocations, and synchronous SHA computation blocks the event loop. There is no instrumentation, memoization, or chunking, so long-running diffs tie up executor threads.

### Related Components
- **Executor spool**: `packages/executor-spool/src/spool.ts` batches filesystem mutations and invokes `createDiff` after every write/delete/replace/patch, returning sorted diffs to callers. Batch plans run sequentially on the same tick, re-reading and diffing each file synchronously. 【F:packages/executor-spool/src/spool.ts†L1-L200】
- **Protocol summary consumers**: `StreamPatchSummary` from `@cortex-os/protocol` powers MCP and UI diff feeds; Patchkit populates preview strings but does not truncate by hunk count or enforce size budgets. 【F:packages/patchkit/src/diff.ts†L1-L118】

### brAInwav-Specific Context
- **MCP Integration**: Executor spool exposes diffs to MCP bridges that rely on responsive unified patch payloads; blocking diff generation risks MCP timeout budgets.
- **A2A Events**: Patchkit diffs are serialized into A2A events for audit/training; large previews increase message size and broker pressure.
- **Local Memory**: Deterministic diffs feed history-store snapshots; slow hashing delays persistence.
- **Existing Patterns**: Other performance reviews (agents, connectors, history-store) all flag need for batching and worker offload, suggesting similar remedies for Patchkit.

---

## External Standards & References

### Industry Standards
1. **Git diff performance guidance (Pro Git, Ch. 7)**
   - **Relevance**: Highlights streaming diff computation and avoiding duplicate passes over file contents.
   - **Key Requirements**: Minimize repeated parsing, reuse hashed blobs, and bound preview output.

2. **Node.js Performance Best Practices 2025 (OpenJS Foundation)**
   - **Relevance**: Advocates worker threads or off-main-thread processing for CPU-heavy tasks like diffing and hashing.
   - **Key Requirements**: Keep event loop responsive, reuse crypto contexts, and instrument long tasks.

### Best Practices (2025)
- **Streaming diff generation**: Use incremental differs or long-lived diff worker pools to prevent blocking.  
  - Source: OpenJS performance working group notes.  
  - Application: Run diff computation in bounded worker threads and recycle buffers.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `diff` | 5.x | Current diff/patch implementation | BSD-3 | ⚠️ Evaluate (keep for compatibility but wrap for performance) |
| `@vscode/ripgrep` | 1.15.x | Fast diff/grep backend | MIT | ⚠️ Evaluate (native dependency, high performance) |
| `node-worker-threads-pool` | 1.6.x | Worker pool abstraction | MIT | ✅ Use (for offloading CPU-bound diffing) |

---

## Technology Research

### Option 1: Worker Thread Diff Pipeline

**Description**: Offload diff/hash computation to a bounded worker-thread pool that caches `diff` parser state and streams results back to the main thread.

**Pros**:
- ✅ Frees event loop for MCP and executor I/O
- ✅ Enables parallel diff generation across batch operations
- ✅ Creates a hook for structured telemetry and timeouts

**Cons**:
- ❌ Requires serialization/deserialization overhead for large file contents
- ❌ Introduces worker lifecycle management complexity

**brAInwav Compatibility**:
- Aligns with Constitution by improving determinism while maintaining local-first execution
- Requires ensuring worker pools respect MCP resource budgets
- Must audit worker message passing for zero exfiltration

**Implementation Effort**: Medium

---

### Option 2: Incremental Diff Caching & Hash Reuse

**Description**: Cache baseline/proposed hashes and structured hunks to avoid recomputing diffs for repeated calls in the same batch. Only regenerate unified text if file content actually changes.

**Pros**:
- ✅ Eliminates duplicate `structuredPatch` + `createTwoFilesPatch` passes per file
- ✅ Lowers allocations from `flatMap` + filter loops
- ✅ Keeps implementation in-process without new dependencies

**Cons**:
- ❌ Adds cache invalidation logic tied to spool lifecycle
- ❌ Provides limited relief for truly large single-file diffs

**brAInwav Compatibility**:
- Fits local-first constraints and works with existing spool map storage
- Requires consistent hashing to avoid stale cache hits

**Implementation Effort**: Low-Medium

---

### Option 3: Native Diff Backend Integration

**Description**: Replace the `diff` JS library with a native-backed differ (e.g., leveraging ripgrep's diff or libgit2) exposed via WASM or Node-API bindings for improved throughput.

**Pros**:
- ✅ Significant speedup on large files and binary diffs
- ✅ Reduces memory churn through streaming iterators

**Cons**:
- ❌ Adds native compilation/toolchain requirements to builds
- ❌ Increases maintenance burden and security review surface
- ❌ Potential portability concerns on Windows runners

**brAInwav Compatibility**:
- Must ensure licenses align with governance and maintain reproducible builds
- Native modules complicate sandboxed MCP deployments

**Implementation Effort**: High

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | High (parallelism) | Medium (deduped work) | High (faster core) |
| **Security** | Medium (worker isolation needed) | High (in-process, no new surface) | Medium (native code auditing) |
| **Maintainability** | Medium | High | Low |
| **brAInwav Fit** | Medium | High | Medium |
| **Community Support** | Medium | High | Medium |
| **License Compatibility** | High | High | ⚠️ (libgit2 GPLv2 static/dynamic linking: static linking requires full GPLv2 compliance; dynamic linking may still pose risks—legal review needed) |

---

## Recommended Approach

**Selected**: Option 2 - Incremental Diff Caching & Hash Reuse (phase 1) with a follow-on Option 1 worker-thread rollout for heavy workloads.

**Rationale**:
- Preserves existing `diff` semantics, reducing migration risk while immediately removing duplicate diff passes and preview recomputation. Executor spool already tracks before/after snapshots, so caching structured hunks keyed by SHA pairs provides quick wins without changing public APIs. Once baseline improvements land, a worker-thread pipeline can target the remaining CPU hotspots without blocking feature delivery. This staged plan aligns with governance by shipping incremental, auditable improvements and keeping local-first guarantees.

**Trade-offs Accepted**:
- Continue relying on the pure JS `diff` implementation in the short term.
- Defer native backend exploration until cache and worker strategies prove insufficient.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: All improvements must run in-process or in local worker threads without remote services.
- ✅ **Zero Exfiltration**: Worker communication must stay on-process and avoid writing diffs to temp locations outside the spool root.
- ✅ **Named Exports**: Any new helpers should remain tree-shakeable named exports from `src/index.ts`.
- ✅ **Function Size**: Maintain ≤40 line functions when adding caching utilities or telemetry.
- ✅ **Branding**: Telemetry logs should include `brAInwav` tags for observability alignment.

### Technical Constraints
- Nx/PNPM monorepo demands TypeScript-compatible implementations.
- Dependencies should avoid optional native builds to keep CI fast.
- Must honor existing default formatting contract (contextLines = 3, preview length = 180).
- Worker threads should respect Node LTS baselines used across Cortex-OS deployments.

### Security Constraints
- Ensure cached diffs are scoped to process memory and cleared after batch completion.
- Harden worker message validation to prevent arbitrary code execution.
- Maintain audit logging for diff generation duration and failures.

### Integration Constraints
- MCP contracts expect `StreamPatchSummary` shape; preview truncation must remain backward compatible.
- Executor spool commit gates rely on synchronous diff availability, so worker offload requires async API adjustments or gating hooks.
- History-store persistence expects deterministic `shaBefore`/`shaAfter` values; caching must not skip hashing when contents change.

---

## Open Questions

1. **Should executor-spool expose an async diff queue?**
   - **Context**: Worker-thread adoption implies asynchronous diff availability.
   - **Impact**: Without API changes, spool callers cannot await async diffs.
   - **Research Needed**: Prototype async batch interface and measure impact on existing agents.
   - **Decision Required By**: 2025-11-01

2. **How aggressively should previews be truncated?**
   - **Context**: Large previews inflate A2A payloads and UI rendering cost.
   - **Impact**: Over-truncation may hurt reviewer experience.
   - **Options**: Fixed char limit vs. hunk count cap vs. dynamic budgets.

---

## Proof of Concept Findings

_No dedicated POC executed for this research. Existing unit tests and historical profiling informed findings._

### POC Setup
- **Environment**: N/A
- **Code Location**: N/A
- **Test Scenarios**: N/A

### Results
- **Scenario 1**: N/A
  - **Result**: ⚠️ Partial (insufficient data)
  - **Observations**: Requires future worker-thread experiment.

- **Scenario 2**: N/A
  - **Result**: ⚠️ Partial
  - **Observations**: Add instrumentation before running benchmarks.

### Performance Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Diff generation latency (10k LOC) | ≤ 250 ms | Unknown | ⚠️ |
| Batch throughput (20 ops) | ≤ 800 ms cold | Unknown | ⚠️ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Cache inconsistencies causing stale diffs | Medium | High | Key cache by SHA tuple, invalidate on write errors |
| Worker thread resource exhaustion | Medium | Medium | Configure pool size based on CPU cores and enforce timeouts |
| Native dependency supply-chain risk | Low | High | Delay native backend adoption; pin versions and monitor advisories |
| Preview truncation impacting UX | Medium | Medium | Partner with UI to validate truncation heuristics |

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "node-worker-threads-pool": "^1.6.0"
  }
}
```

**License Verification Required**:
- [ ] node-worker-threads-pool - MIT - ✅ Compatible

### Configuration Changes
- **File**: `packages/patchkit/project.json`
  - **Changes**: Add targeted lint/test tasks for worker-thread enabled builds.
- **File**: `packages/patchkit/tsconfig.json`
  - **Changes**: Enable `moduleResolution: "bundler"` if worker wrappers require it.

### Database Schema Changes
- **Migration Required**: No
- **Impact**: None

### Breaking Changes
- **API Changes**: None for caching phase; possible async return types for worker phase.
- **Migration Path**: Gate async behavior behind feature flag and provide fallback to synchronous mode.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 0.5 day | Add benchmarks, baseline instrumentation |
| **Core Implementation** | 1 day | Implement cache layer + preview truncation guardrails |
| **Testing** | 0.5 day | Extend coverage with large diff fixtures |
| **Integration** | 1 day | Prototype worker-thread offload behind feature flag |
| **Documentation** | 0.5 day | Update README, runbooks, and governance checklists |
| **Total** | 3.5 days | |

---

## Related Research

### Internal Documentation
- History Store, Agents, and Connectors performance reviews for batching precedents (see `project-documentation/` directory).

### External Resources
- OpenJS Performance WG 2025 notes: Worker thread best practices
- Pro Git Chapter 7: Git Internals
- Node.js Crypto API docs: Hash reuse patterns

### Prior Art in Codebase
- **Similar Pattern**: `packages/executor-spool/src/spool.ts`
  - **Lessons Learned**: Sequential batching without parallelism limits throughput and surfaces double diff work.
  - **Reusable Components**: Spool entry tracking map can power diff cache keys.

---

## Next Steps

1. **Immediate**:
   - [ ] Instrument `createDiff` with duration metrics and preview size counters.
   - [ ] Prototype in-memory cache keyed by `(path, shaBefore, shaAfter)`.

2. **Before Implementation**:
   - [ ] Get stakeholder approval on caching + worker roadmap.
   - [ ] Create TDD plan covering cache hits, misses, and eviction.
   - [ ] Verify `node-worker-threads-pool` license and security posture.
   - [ ] Persist this research summary to local memory MCP.

3. **During Implementation**:
   - [ ] Validate worker-thread prototype on macOS and Linux runners.
   - [ ] Ensure fallback to synchronous diffing when pool unavailable.
   - [ ] Update research doc with benchmark evidence.

---

## Appendix

### Code Samples

```typescript
export interface DiffCacheKey {
  path: string;
  shaBefore: string | null;
  shaAfter: string | null;
}

export interface DiffCacheEntry {
  filePatch: FilePatch;
  generatedAt: number;
}
```

### Benchmarks

_To be captured after instrumentation and worker-thread experiments._

### Screenshots/Diagrams

_Not applicable for this research._
