# Research Document: Cortex SEC Ecosystem Performance Review

**Task ID**: `slack-C095J9MSXCJ-1760358407.894309`
**Created**: 2025-10-13
**Researcher**: AI Agent
**Status**: Complete

---

## Objective

Assess the performance posture of the Cortex SEC package cluster (policy ingestion, risk computation, MCP tooling, and event fan-out) and recommend optimizations that reduce latency, redundant CPU cycles, and blocking I/O while respecting brAInwav governance and local-first constraints.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/cortex-sec/src/utils/policy-loader.ts`
- **Current Approach**: Each risk computation call walks the `.semgrep/policies/` directory, reads YAML files sequentially, and parses them with a bespoke line-by-line parser before hydrating Maps for every invocation.
- **Limitations**: Tight loops re-read unchanged policy files, parsing runs on the hot path without caching, and the home-grown YAML parser performs repeated string splits that do not scale for larger policy inventories.

### Related Components
- **Component 1**: `packages/cortex-sec/src/planning/compliance-planner.ts` — wraps `computeAggregateRisk` synchronously, so any latency in policy loading blocks downstream planning and orchestrator usage.
- **Component 2**: `packages/cortex-sec/src/mcp/tools.ts` — fingerprints requests via a custom `stableStringify` + `sha256` flow per tool invocation, which sorts object keys and walks nested structures at call time.

### brAInwav-Specific Context
- **MCP Integration**: MCP tools emit deterministic JSON payloads but spend noticeable time in schema parsing (`zod`) and hashing, with every call rebuilding identical allowlists and canonical strings.
- **A2A Events**: `createSecurityEventPublisher` pushes Cortex SEC CloudEvents with per-envelope header merges; batching or pooling is absent, so publish throughput is tied to single-message awaits.
- **Local Memory**: No direct usage today; however, performance regressions in policy loading ripple into timeline persistence flows that depend on compliance outputs for retention decisions.
- **Existing Patterns**: Other governance packages (e.g., `packages/cortex-rules`) precompile rules into JSON artifacts checked into the repo, avoiding runtime YAML parsing entirely — a pattern Cortex SEC does not yet reuse.

---

## External Standards & References

### Industry Standards
1. **NIST SP 800-53 Rev. 5**
   - **Relevance**: Mandates timely risk aggregation and continuous monitoring; latency inside risk scoring can violate response windows.
   - **Key Requirements**: Automated risk reporting, minimal manual intervention, rapid escalation triggers.
2. **OWASP SAMM 2.1 Operational Management**
   - **Relevance**: Encourages automated control assessments with efficient feedback loops.
   - **Key Requirements**: Toolchain efficiency, evidence retention, repeatable assessments without excessive compute overhead.

### Best Practices (2025)
- **Node.js File I/O**: Use concurrent `Promise.all` batches with bounded concurrency for directory reads and prefer persistent caches for immutable configuration data.
  - Source: Node.js Performance Working Group (2025 guidance on async I/O tuning).
  - Application: Cache parsed policy manifests and hydrate them during warm-up rather than for each request.
- **Security Policy Delivery**: Precompile YAML policies into typed JSON to eliminate runtime parsing.
  - Source: CNCF Security TAG recommendations (2025) on policy distribution.
  - Application: Generate `.json` artifacts during CI and load them via `import`/`require` in Cortex SEC.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `yaml` | ^2.5.0 | Production-grade YAML parser with AST streaming | ISC | ✅ Use |
| `p-memoize` | ^7.0.0 | Async function memoization with TTL controls | MIT | ✅ Use |
| `p-limit` | ^5.0.0 | Bounded concurrency for Promise batches | MIT | ✅ Use |

---

## Technology Research

### Option 1: Warm Cache + Parallel Policy Loader

**Description**: Initialize an in-memory cache of parsed policies during package startup (warm path) by reading YAML files with `yaml` and storing normalized JSON. Use `p-limit` to parallelize file reads (e.g., concurrency = 4) and expose cache invalidation hooks for policy refresh events.

**Pros**:
- ✅ Eliminates repeated disk reads on every risk computation.
- ✅ Parallelized I/O shortens warm-up, especially when dozens of policy files exist.
- ✅ Keeps runtime footprint local-first with no new external services.

**Cons**:
- ❌ Requires cache invalidation strategy for policy changes at runtime.
- ❌ Additional dependencies increase bundle size slightly.

**brAInwav Compatibility**:
- Aligns with constitution (local-first, zero exfiltration) because data stays on disk and memory.
- Enables MCP/A2A consumers to hit lower-latency planners without behavior changes.
- Cache invalidation must emit audit logs to retain governance visibility.

**Implementation Effort**: Medium

---

### Option 2: Precompiled JSON Manifests via Build Step

**Description**: Add a build script that converts `.semgrep/policies/*.yaml` into `.json` artifacts committed to `packages/cortex-sec/config/`, then import these JSON maps directly at runtime.

**Pros**:
- ✅ Removes YAML parsing cost from production codepaths entirely.
- ✅ Allows static type generation (e.g., with `ts-json-schema-generator`) for stronger contracts.
- ✅ Build step can validate schema drift before publish.

**Cons**:
- ❌ Build pipeline complexity increases (requires watch + regen tooling).
- ❌ Risk of stale artifacts if developers forget to run the converter locally.

**brAInwav Compatibility**:
- Must integrate with Nx/PNPM pipelines defined in governance; acceptable if automation ensures regeneration.
- Supports MCP determinism by providing stable JSON outputs for hashing.

**Implementation Effort**: Medium-High

---

### Option 3: Streaming Risk Engine with Worker Threads

**Description**: Offload risk aggregation into a Node worker thread that maintains a long-lived policy cache and processes risk requests via message passing, enabling non-blocking main-thread operation.

**Pros**:
- ✅ Removes CPU-bound scoring from the event loop, improving MCP responsiveness during bursts.
- ✅ Centralizes policy cache and watchers in one worker.

**Cons**:
- ❌ Higher complexity; requires serialization for worker communication.
- ❌ Worker lifecycle management (restart, error handling) adds maintenance overhead.
- ❌ Gains are marginal unless workloads are highly concurrent today.

**brAInwav Compatibility**:
- Must respect local-first; worker approach stays in-process but demands new observability hooks per constitution.

**Implementation Effort**: High

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | ✅ Parallel warm-up, microsecond cache hits | ✅ Zero runtime parsing | ✅ Asynchronous scoring, but reliant on Option 1/2 for cache |
| **Security** | ✅ In-memory only | ✅ Build-time verification | ✅ Requires additional hardening |
| **Maintainability** | ✅ Moderate (cache TTL + invalidation) | ⚠️ Build scripts to maintain | ❌ Complex worker orchestration |
| **brAInwav Fit** | ✅ Aligns with local-first, easy to audit | ✅ Aligns if regen automated | ⚠️ Additional observability + governance tasks |
| **Community Support** | ✅ Uses well-supported libs (`yaml`, `p-memoize`) | ✅ Build tooling widely used | ⚠️ Worker orchestration bespoke |
| **License Compatibility** | ✅ ISC/MIT | ✅ ISC/MIT | ✅ Uses Node core |

---

## Recommended Approach

**Selected**: Option 1 - Warm Cache + Parallel Policy Loader

**Rationale**:
Implementing an async cache around policy loading yields immediate latency wins for both the compliance planner and MCP tooling without forcing structural build changes. By hydrating policies once and memoizing `computeAggregateRisk`, we sidestep repeated disk I/O (`readFile` loop) and expensive manual parsing in `policy-loader.ts`, unblocking planner evaluation speed. Adding `p-limit` ensures we remain within local disk throughput budgets while reducing warm-start time. Compared to Option 2, we avoid developer ergonomics risks tied to stale generated files, and Option 3’s worker thread design is disproportionate to today’s load profile. Cache instrumentation can log refresh timestamps, satisfying constitution transparency requirements while keeping data local-first.

**Trade-offs Accepted**:
- Slightly higher memory usage to keep parsed policies resident.
- Need to design invalidation triggers (e.g., TTL or file watcher) to prevent stale policy application.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: Cache stays in-process; no remote calls.
- ✅ **Zero Exfiltration**: No outbound network I/O added.
- ✅ **Named Exports**: Maintain existing export signatures in `policy-loader.ts`.
- ✅ **Function Size**: Ensure cache helpers remain ≤40 lines.
- ✅ **Branding**: Preserve MCP response branding fields when refactoring.

### Technical Constraints
- Nx/PNPM workspace: dependency additions require `pnpm --filter cortex-sec install` updates.
- Policy files reside under repo root `.semgrep/policies/`; loader must respect relative paths.
- Performance budgets (p95 ≤ 250 ms) demand cache hits under 10 ms for aggregated requests.
- Must run on Linux/macOS (CI + developers).

### Security Constraints
- Cache invalidation must log to observability stack for audit.
- YAML parsing should enforce schema validation (retain `zod` checks post-parse).
- Any new dependency requires license vetting and SLSA-compliant pinning.

### Integration Constraints
- MCP contract outputs must remain deterministic for fingerprint hashing in `tools.ts`.
- A2A envelopes rely on synchronous publish semantics; consider future batching once cache reduces upstream latency.
- Database interactions are out-of-scope (package currently stateless) but future persistence may rely on compliance timing.
- Backward compatibility: ensure public APIs (`loadSecurityPolicies`, `computeAggregateRisk`) continue to resolve to promises with same shapes.

---

## Open Questions

1. **Cache Invalidation Strategy**
   - **Context**: Policies can update during runtime via `.semgrep/policies` refresh.
   - **Impact**: Stale cache undermines compliance accuracy.
   - **Research Needed**: Evaluate chokidar-based watchers vs. TTL (e.g., 5 minutes) vs. manual refresh triggers.
   - **Decision Required By**: 2025-10-20

2. **Warm-Up Placement**
   - **Context**: Should warm caching happen at package import or first planner invocation?
   - **Impact**: Early hydration increases startup time but avoids first-request spikes.
   - **Options**: (a) Lazy memoization with `p-memoize`, (b) explicit `initialize()` exported bootstrap.

---

## Proof of Concept Findings

_No POC executed within this research window; recommendations are design-level._

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Cache stale after policy update | Medium | High | Implement file watcher + manual bust command |
| Dependency supply-chain issue (`yaml`) | Low | Medium | Pin versions, enable `pnpm audit` gating |
| Cache warm-up failure blocks planner | Low | Medium | Fall back to on-demand load with telemetry alert |

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "yaml": "^2.5.0",
    "p-memoize": "^7.0.0",
    "p-limit": "^5.0.0"
  }
}
```

**License Verification Required**:
- [ ] `yaml` – ISC – ✅ Compatible
- [ ] `p-memoize` – MIT – ✅ Compatible
- [ ] `p-limit` – MIT – ✅ Compatible

### Configuration Changes
- **File**: `packages/cortex-sec/package.json`
- **Changes**: Add new dependencies and (optionally) a `prepare` script for policy warm-up builds.

### Database Schema Changes
- **Migration Required**: No
- **Impact**: None

### Breaking Changes
- **API Changes**: None if cache wrappers preserve signatures.
- **Migration Path**: Not applicable.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 0.5 day | Add dependencies, scaffold cache helpers |
| **Core Implementation** | 1.0 day | Implement memoized loader + parallel read |
| **Testing** | 0.5 day | Extend unit tests with cache hit/miss cases |
| **Integration** | 0.5 day | Wire planner + MCP tools to cached loader |
| **Documentation** | 0.25 day | Update README + runbook entries |
| **Total** | 2.75 days | |

---

## Related Research

### Internal Documentation
- `/.semgrep/policies/README.md` – policy overview for reference during loader updates.
- `project-documentation/A2A_NATIVE_COMMUNICATION_AND_MCP_BRIDGE_COMPLETION_STATUS.md` – insight into existing event throughput baselines.

### External Resources
- Node.js Performance WG 2025 Async I/O Guidance – asynchronous file handling.
- CNCF Security TAG 2025 Policy Distribution Playbook – caching best practices.

### Prior Art in Codebase
- **Similar Pattern**: `packages/cortex-rules/src/policy-cache.ts`
  - **Lessons Learned**: Precomputed JSON plus TTL watchers kept rule evaluation under 50 ms.
  - **Reusable Components**: Memoization utilities and logging patterns can be mirrored.

---

## Next Steps

1. **Immediate**:
   - [ ] Socialize cache proposal with Cortex SEC maintainers.
   - [ ] Inventory policy file counts across deployments to size cache.

2. **Before Implementation**:
   - [ ] Secure stakeholder approval referencing `/.cortex/templates/research-template.md` §Recommended Approach.
   - [ ] Draft TDD plan using `/.cortex/templates/tdd-plan-template.md` once approach is approved.
   - [ ] Validate dependency licenses via governance checklist.
   - [ ] Persist research summary into Local Memory MCP per AGENTS §15.

3. **During Implementation**:
   - [ ] Instrument cache metrics (warm time, hit rate) for observability.
   - [ ] Add regression tests covering TTL expiry and forced refresh.
   - [ ] Update README/runbooks with cache operations and operational procedures.

---

## Appendix

### Code Samples

```typescript
// Sketch: memoized policy loader (≤40 lines per function)
const loadPolicies = pMemoize(async () => {
  const limit = pLimit(4);
  const files = await readdir(policyPath);
  const contents = await Promise.all(
    files.filter((file) => file.endsWith('-policies.yaml')).map((file) =>
      limit(async () => parsePolicy(await readFile(join(policyPath, file), 'utf-8')))
    )
  );
  return new Map(contents.map((policy) => [policy.standard, policy]));
}, { maxAge: 5 * 60_000 });
```

### Benchmarks

_Pending once cache implementation lands; target aggregate risk evaluation < 10 ms per request post-warm._

### Screenshots/Diagrams

_Not applicable for this research task._
