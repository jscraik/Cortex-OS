# Research Document: MVP Ecosystem Performance Review

**Task ID**: `packages-mvp-performance-review`
**Created**: 2025-10-13
**Researcher**: AI Agent
**Status**: Complete

---

## Objective

Evaluate the MVP package family (kernel, teaching layer, MCP adapter, Fastify server, and supporting core utilities) to surface the most impactful performance bottlenecks and produce an actionable optimization roadmap aligned with brAInwav reliability and local-first constraints.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/mvp/mvp/src/graph-simple.ts`
- **Current Approach**: `SimplePRPGraph.runPRPWorkflow` executes strategy → build → evaluation sequentially, persisting every state snapshot into an unbounded in-memory history map and simulating work with fixed-duration timers for each phase.【F:packages/mvp/mvp/src/graph-simple.ts†L39-L303】
- **Limitations**: Each workflow run pays ~350 ms of artificial latency, phases cannot overlap, and history retention grows without eviction, risking latency spikes and elevated memory pressure under bursty workloads.

- **Location**: `packages/mvp/mvp/src/teaching/example-capture.ts`
- **Current Approach**: The example capture system stores every captured example and derived pattern in maps and recalculates pattern statistics by re-reading the full example list on every update.【F:packages/mvp/mvp/src/teaching/example-capture.ts†L90-L267】
- **Limitations**: Pattern updates are O(n²) as captured data grows, there is no TTL/compaction, and replay operations materialize full contexts, which threatens both latency and memory ceilings during long-running sessions.

- **Location**: `packages/mvp/mvp/src/mcp/adapter.ts`
- **Current Approach**: The adapter keeps a per-run context map without lifecycle management, loads heavyweight modules (fs, path, ESLint, child_process) via dynamic imports on every tool invocation, and the test runner probes for CLI availability with sequential `pnpm` invocations before executing tests with large buffers.【F:packages/mvp/mvp/src/mcp/adapter.ts†L77-L479】
- **Limitations**: Context maps leak until callers remember to clean them, tool execution repeatedly pays module load costs, and the probing strategy serializes external process launches—amplifying cold latency and load spikes.

- **Location**: `packages/mvp/mvp-server/src`
- **Current Approach**: The Fastify server boots with synchronous plugin registration, global in-memory rate limiting, and health endpoints that recompute status on every request without caching.【F:packages/mvp/mvp-server/src/http-server.ts†L10-L46】【F:packages/mvp/mvp-server/src/plugins/security.ts†L7-L17】【F:packages/mvp/mvp-server/src/routes/health.ts†L4-L17】
- **Limitations**: The default logger streams synchronously, rate limiting is single-node only, and repeated health computations waste cycles that could be served from cached probes.

- **Location**: `packages/mvp/mvp-core/src/secure-executor.ts`
- **Current Approach**: The secure executor serializes command launches behind a shared counter with a hard cap and performs blocking output sanitization after process completion.【F:packages/mvp/mvp-core/src/secure-executor.ts†L6-L241】
- **Limitations**: Without queueing or streaming, bursts rapidly hit the concurrency ceiling, produce errors instead of backpressure, and defer sanitization work until after the child process exits.

### Related Components
- **Teaching Behavior Extensions**: `packages/mvp/mvp/src/teaching/behavior-extension.ts` sorts and applies every registered extension on each state transition, then appends to a bounded history buffer.【F:packages/mvp/mvp/src/teaching/behavior-extension.ts†L57-L167】
- **MCP WebSocket Surface**: `packages/mvp/mvp-server/src/McpConnection.ts` streams tool capability payloads synchronously on connect and handles every request in-band on the single Fastify worker.【F:packages/mvp/mvp-server/src/McpConnection.ts†L26-L92】

### brAInwav-Specific Context
- **MCP Integration**: The adapter exposes code analysis and test running tools that block on external CLI completion, so improving throughput must retain deterministic auditing while honoring security policy flags.【F:packages/mvp/mvp/src/mcp/adapter.ts†L220-L450】
- **A2A Events**: MVP state transitions feed downstream validation and promotion events, so any batching strategy must preserve event ordering to keep rule engines stable.【F:packages/mvp/mvp/src/graph-simple.ts†L69-L266】
- **Local Memory**: Teaching subsystems depend on retained examples for adaptive behavior, requiring performance fixes that maintain on-device storage guarantees.【F:packages/mvp/mvp/src/teaching/example-capture.ts†L90-L267】
- **Existing Patterns**: Other ecosystems (agents, commands) have adopted async discovery caches and worker-pool backed tool execution, offering precedents we can mirror without violating package boundaries.

---

## External Standards & References

### Industry Standards
1. **OpenTelemetry Spec (Tracing & Metrics)**
   - **Relevance**: Guides batching/aggregation for spans and metrics to reduce per-span overhead while keeping observability intact.
   - **Key Requirements**: Exporters should batch, limit synchronous span operations, and reuse processors.

2. **Node.js Worker Pool Guidance (Node.js 22 LTS)**
   - **Relevance**: Defines best practices for offloading CPU-heavy work to worker threads or a task queue to avoid main event loop stalls.
   - **Key Requirements**: Share pools, cap concurrency, and stream results rather than buffering entire payloads.

### Best Practices (2025)
- **Fastify Production Hardening**: Enable shared rate-limit stores and cached readiness probes to minimize per-request cost.
  - Application: Adopt pluggable stores (Redis/Memcached) and schedule background health checks before serving traffic.

- **CLI Execution**: Prefer long-lived worker pools or spawn wrappers with queueing and streaming output to control resource use.
  - Application: Wrap secure executor calls in a queue with telemetry for concurrency and latency budgets.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `piscina` | 4.x | Worker pool for Node.js | MIT | ⚠️ Evaluate (for CPU-bound telemetry aggregation) |
| `fastify-rate-limit` w/ Redis store | 10.x | Distributed rate limiting | MIT | ✅ Use |
| `eslint` API caching | 9.x | Reuse ESLint instances | MIT | ✅ Use |

---

## Technology Research

### Option 1: Async Phase Pipeline & History Batching

**Description**: Replace sequential `simulateWork` timers with promise-based phase scheduling that supports parallel sub-agent execution, constrain history retention via ring buffers, and emit events as streams.

**Pros**:
- ✅ Removes artificial per-phase latency while allowing orchestrator-driven concurrency.【F:packages/mvp/mvp/src/graph-simple.ts†L69-L303】
- ✅ Bounded history prevents runaway memory usage under repeated runs.【F:packages/mvp/mvp/src/graph-simple.ts†L65-L293】
- ✅ Streaming events enable incremental persistence for downstream consumers.

**Cons**:
- ❌ Requires refactoring phase APIs to accept async iterators.
- ❌ Needs new telemetry to ensure determinism remains testable.

**brAInwav Compatibility**:
- Aligns with Constitution by maintaining deterministic mode while improving default latency.
- Compatible with MCP/A2A flows when event order is preserved.
- Must verify security policies when introducing streaming persistence.

**Implementation Effort**: Medium.

---

### Option 2: MCP Tool Execution Pool & Module Cache

**Description**: Introduce a pooled executor for CLI-based tools, cache dynamic imports, and add TTL-based context cleanup with telemetry hooks.

**Pros**:
- ✅ Eliminates repeated module loading by caching fs/path/ESLint instances.【F:packages/mvp/mvp/src/mcp/adapter.ts†L220-L325】
- ✅ Worker pool smooths spikes from sequential `pnpm` probes and test runs.【F:packages/mvp/mvp/src/mcp/adapter.ts†L329-L450】
- ✅ Context TTLs stop silent memory leaks from long-lived run IDs.【F:packages/mvp/mvp/src/mcp/adapter.ts†L77-L215】

**Cons**:
- ❌ Adds pool lifecycle complexity and requires queue instrumentation.
- ❌ Potentially increases baseline memory footprint for cached modules.

**brAInwav Compatibility**:
- Keeps local execution by reusing on-device workers.
- Maintains auditability with deterministic command logs.
- Needs guardrails so cached ESLint configs remain policy-compliant.

**Implementation Effort**: Medium.

---

### Option 3: Teaching Data Compaction & Approximate Matching

**Description**: Introduce configurable retention policies, summary statistics, and approximate nearest-neighbor matching to cut per-update costs in the teaching layer.

**Pros**:
- ✅ Converts O(n²) pattern recalculation into incremental counters.【F:packages/mvp/mvp/src/teaching/example-capture.ts†L230-L267】
- ✅ Reduces replay latency by precomputing embeddings or hashed signatures.【F:packages/mvp/mvp/src/teaching/example-capture.ts†L200-L224】
- ✅ Keeps memory bounded with TTL-based purges.

**Cons**:
- ❌ Requires migration path for existing captured examples.
- ❌ Approximate matching may reduce determinism without careful tuning.

**brAInwav Compatibility**:
- Must store compaction metadata locally to honor zero-exfiltration.
- Needs governance approval for probabilistic matching in promotion workflows.

**Implementation Effort**: Medium-High.

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | ✅ Parallelizes phases & caps history | ✅ Cuts tool invocation overhead | ✅ Lowers teaching CPU/memory |
| **Security** | ✅ Maintains deterministic mode | ✅ Honors securityPolicy flags | ⚠️ Requires review for probabilistic matching |
| **Maintainability** | ✅ Moderate refactor | ✅ Adds reusable pool utilities | ❌ Higher complexity in data lifecycle |
| **brAInwav Fit** | ✅ Preserves governance order | ✅ Aligns with local execution | ⚠️ Needs Constitution alignment |
| **Community Support** | ✅ Uses native promises | ✅ Uses popular pool libs | ⚠️ Custom logic |
| **License Compatibility** | ✅ Built-in | ✅ MIT ecosystems | ✅ MIT-compatible |

---

## Recommended Approach

**Selected**: Option 2 – MCP Tool Execution Pool & Module Cache (Phase 1), followed by Option 1 – Async Phase Pipeline (Phase 2)

**Rationale**:
- Module caching and pooled execution immediately reduce median workflow time because test and analysis tools are the dominant bottleneck today; caching addresses repeated dynamic imports while respecting security guards.【F:packages/mvp/mvp/src/mcp/adapter.ts†L220-L450】
- Introducing TTL-based context cleanup resolves the silent leak in the adapter and keeps long-running orchestrations from exhausting memory.【F:packages/mvp/mvp/src/mcp/adapter.ts†L77-L215】
- Once tool latency is tamed, the sequential PRP graph becomes the next limiter; upgrading to an async pipeline improves throughput while keeping deterministic runs available via configuration.【F:packages/mvp/mvp/src/graph-simple.ts†L50-L303】
- Teaching compaction (Option 3) remains valuable but depends on telemetry gathered after phase/tool improvements, so it lands as a follow-up workstream with clearer sizing.

**Trade-offs Accepted**:
- Delaying teaching-layer compaction prolongs O(n²) updates, but instrumentation from earlier phases will provide precise sizing before altering adaptive behavior.
- Pooled execution increases baseline memory to keep worker contexts warm; this is acceptable given the latency savings and can be bounded through pool sizing.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: Worker pools and caches operate entirely on the local host.
- ✅ **Zero Exfiltration**: No new outbound calls are introduced; all telemetry stays on-device.
- ✅ **Named Exports**: Refactors must retain existing export surfaces for kernel and teaching modules.
- ✅ **Function Size**: New helpers should remain ≤40 lines to satisfy linting rules.
- ✅ **Branding**: Ensure logs emitted by pooled executors and async phases include brAInwav identifiers.

### Technical Constraints
- Nx/PNPM dependency graphs must treat new pools as optional so affected builds stay incremental.
- Need feature flags to toggle async phase execution for safe rollout.
- Performance budgets: keep cold start <800 ms and p95 latency ≤250 ms per package charter.【F:packages/mvp/AGENTS.md†L12-L21】

### Security Constraints
- Security policy toggles from `MCPContext` must remain authoritative when executing pooled tools.【F:packages/mvp/mvp/src/mcp/adapter.ts†L85-L140】
- Rate limiting upgrades must integrate with existing auth/token flow without widening attack surface.【F:packages/mvp/mvp-server/src/plugins/security.ts†L7-L17】

### Integration Constraints
- A2A consumers rely on ordered emission of validation results; async pipeline must buffer outputs accordingly.【F:packages/mvp/mvp/src/graph-simple.ts†L69-L266】
- Fastify plugin registration should stay compatible with current config loader and logging decorators.【F:packages/mvp/mvp-server/src/http-server.ts†L10-L46】

---

## Risk Assessment & Mitigation
- **Pool Starvation**: Instrument queue depth and emit Otel metrics to detect starvation early; fall back to direct execution if pool fails.
- **Behavior Drift**: Guard async pipeline rollout behind deterministic toggles and regression tests for existing PRP flows.【F:packages/mvp/mvp/src/graph-simple.ts†L50-L303】
- **Memory Budget Breach**: Enforce hard caps on cached contexts and examples, logging warnings when nearing thresholds.【F:packages/mvp/mvp/src/mcp/adapter.ts†L77-L215】【F:packages/mvp/mvp/src/teaching/example-capture.ts†L90-L267】

---

## Implementation Plan & Timeline

1. **Week 1** – Implement module cache + worker pool prototype for MCP tools, add TTL cleanup for contexts, and expose instrumentation endpoints.
2. **Week 2** – Add distributed rate-limit store support and cached health probes to the Fastify server, wiring Otel metrics for pool health.【F:packages/mvp/mvp-server/src/http-server.ts†L10-L46】【F:packages/mvp/mvp-server/src/plugins/security.ts†L7-L17】
3. **Week 3-4** – Refactor PRP graph to async pipeline with bounded history buffers and streaming event emission, including deterministic regression suite.【F:packages/mvp/mvp/src/graph-simple.ts†L50-L303】
4. **Week 5** – Design teaching-layer compaction strategy (Option 3) using telemetry gathered during earlier phases.【F:packages/mvp/mvp/src/teaching/example-capture.ts†L230-L267】

---

## Open Questions & Next Steps
- What pool size keeps test runs under 250 ms p95 without breaching the 256 MB package memory budget?【F:packages/mvp/AGENTS.md†L12-L21】
- Can existing observability hooks expose pool depth and phase timings without introducing heavy dependencies?【F:packages/mvp/mvp-core/src/secure-executor.ts†L6-L241】
- Do downstream consumers require schema updates to handle streamed PRP phase outputs, or can we wrap them transparently?
- Schedule follow-up review after Week 4 to finalize the teaching-layer roadmap.

