# Research Document: Agents Ecosystem Performance Review

**Task ID**: `packages-agents-performance-review`
**Created**: 2025-10-13
**Researcher**: AI Agent
**Status**: Complete

---

## Objective

Evaluate the `packages/agents` ecosystem to surface current performance bottlenecks and provide actionable remediation strategies that keep the LangGraphJS master-agent runtime within the package SLO targets.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/agents/src/MasterAgent.ts`
- **Current Approach**: Master agent coordination builds a LangGraph state graph per process startup, routes requests to specialized subagents, and dispatches model tool jobs through the orchestration layer with a single-worker budget.
- **Limitations**: Tool execution is hard-coded to `concurrency: 1`, prompt rendering runs per-request without caching, and job assembly eagerly instantiates both MLX and Ollama adapters regardless of downstream availability, increasing latency for every invocation.

- **Location**: `packages/agents/src/server.ts`
- **Current Approach**: The server bootstraps shared hooks, sequentially notifies the A2A bus about each subagent, and runs ad-hoc test tasks after startup for smoke coverage.
- **Limitations**: Agent registration and smoke workflows happen serially without timeouts or batching, and coordination tests run synchronously on the critical path, extending cold-start beyond the 800 ms budget.

- **Location**: `packages/agents/src/a2a.ts`
- **Current Approach**: A minimal in-memory bus exposes emit/subscribe helpers without buffering or QoS guarantees.
- **Limitations**: Event handlers execute in-process synchronously; high-frequency emissions can starve the event loop and there is no back-pressure, retry, or metrics instrumentation.

### Related Components
- **Component 1**: `packages/agents/src/lib/error-handling.ts` – resource manager serializes cleanup tasks and can be extended to surface graceful shutdown hooks for new async pipelines.
- **Component 2**: `packages/agents/src/logging` – pino logger setup is available but not used in the high-volume coordination paths, limiting observability for performance tuning.

### brAInwav-Specific Context
- **MCP Integration**: Tool dispatch leverages `@cortex-os/orchestration` to call MCP-enabled adapters; aligning concurrency controls with the orchestration budget keeps MCP rate limits intact.
- **A2A Events**: The local bus implementation mirrors `@cortex-os/a2a-core` semantics but lacks durable transport, so improvements must preserve contract compatibility until the real transport is swapped in.
- **Local Memory**: No direct local-memory hooks exist today, yet master-agent traces will need to annotate memory writes to diagnose cache effects.
- **Existing Patterns**: The RAG and SKILLS ecosystems recently adopted async batching for registry refresh; similar patterns can be reused for agent registration and event fan-out.

---

## External Standards & References

### Industry Standards
1. **OpenTelemetry Tracing Spec** (v1.28)
   - **Relevance**: Defines span batching and exporter throttling patterns suited for high-throughput orchestration flows.
   - **Key Requirements**: Context propagation, span attribute budgets, and exporter flush intervals should be configurable per service.

2. **Node.js Performance Best Practices 2025** (OpenJS Foundation)
   - **Relevance**: Highlights event loop utilization, async resource pooling, and HTTP keep-alive management for latency-sensitive services.
   - **Key Requirements**: Avoid synchronous loops in hot paths, reuse expensive objects, enable `globalAgent.keepAlive`, and monitor event loop lag.

### Best Practices (2025)
- **LangGraph Async Execution**: Employ parallel node execution with bounded concurrency and cancellation tokens.
  - Source: LangChain/LangGraph JS guidelines (2025-05).
  - Application: Drive `dispatchTools` with configurable worker counts, using ResourceManager for cleanup.

- **A2A Event Batching**: Buffer agent lifecycle events and publish via micro-batches to prevent bus thrash while preserving ordering.
  - Source: brAInwav A2A bus SLO memo (2025-07).
  - Application: Introduce batching window defaults (e.g., 50 ms) with jitter.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `piscina` | 4.x | Worker thread pool for CPU-heavy tasks | MIT | ⚠️ Evaluate |
| `p-limit` | 5.x | Promise concurrency control | MIT | ✅ Use |
| `emittery` | 1.x | Async event emitter with buffering | MIT | ⚠️ Evaluate |

---

## Technology Research

### Option 1: Adaptive Tool Dispatch Pipeline

**Description**: Wrap `dispatchTools` with a dynamic concurrency controller driven by workload metadata, prefetch prompts once per agent, and reuse adapter instances across invocations.

**Pros**:
- ✅ Reduces per-request setup by reusing adapters and cached prompts.
- ✅ Unlocks parallel tool execution when MCP limits permit.
- ✅ Fits existing orchestration abstraction with minimal API changes.

**Cons**:
- ❌ Requires careful budget guardrails to avoid MCP throttling.
- ❌ Demands additional telemetry to tune concurrency safely.

**brAInwav Compatibility**:
- Aligns with orchestration contracts and ResourceManager lifecycle hooks.
- Preserves MCP/A2A architecture while honoring constitution-mandated guardrails.
- No new data exfiltration vectors; adapters remain local-first.

**Implementation Effort**: Medium

---

### Option 2: Batched Agent Registration & Event Fan-out

**Description**: Batch agent registration notifications and use micro-task queues for event delivery, optionally backed by an async iterator to yield between emissions.

**Pros**:
- ✅ Keeps cold-start under budget by emitting one composite payload.
- ✅ Prevents event loop starvation during bursty lifecycle events.
- ✅ Simplifies downstream consumption by grouping related events.

**Cons**:
- ❌ Introduces slight delay (batch window) before observers receive updates.
- ❌ Requires compatibility shim while `@cortex-os/a2a-core` mock remains synchronous.

**brAInwav Compatibility**:
- Needs schema version bump but follows documented A2A governance.

**Implementation Effort**: Low

---

### Option 3: Replace In-Memory Bus with Instrumented Transport Stub

**Description**: Swap the Map-based emitter for an async emitter (e.g., Emittery) layered with metrics, retries, and back-pressure.

**Pros**:
- ✅ Provides observability hooks (span events, counters) for performance tuning.
- ✅ Enables future drop-in of the real transport with minimal refactor.

**Cons**:
- ❌ Slightly higher memory footprint and complexity.
- ❌ Requires alignment with forthcoming A2A core package rollout.

**brAInwav Compatibility**:
- Must retain local-first execution; instrumentation writes stay within workspace telemetry stores.

**Implementation Effort**: Medium

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | High (parallel tool runs, cache hits) | Medium (faster startup) | Medium (reduced handler lag) |
| **Security** | High (no new surfaces) | High | High |
| **Maintainability** | Medium (more knobs) | High | Medium |
| **brAInwav Fit** | High | High | Medium |
| **Community Support** | Medium (custom logic) | Medium | Medium |
| **License Compatibility** | High | High | High |

---

## Recommended Approach

**Selected**: Option 1 - Adaptive Tool Dispatch Pipeline, paired with Option 2’s batched registration as a near-term incremental win.

**Rationale**:
- Adaptive dispatch delivers the largest steady-state latency reduction by eliminating redundant adapter creation and enabling bounded concurrency aligned with MCP budgets. Coupling this with prompt memoization ensures subagents reuse deterministic context without repeated prompt registry I/O.
- Batched registration keeps cold-start within the 800 ms performance budget by collapsing sequential notifications into a single async operation and deferring smoke workloads until after readiness is published.
- Together they honor the brAInwav Constitution’s local-first mandate, reuse existing ResourceManager hooks for cleanup, and surface telemetry needed by the observability team to validate improvements.

**Trade-offs Accepted**:
- Slightly higher implementation complexity due to new concurrency controls and caches.
- Minor delay before downstream systems receive lifecycle events when batching is enabled.

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: Adapter reuse must avoid remote caching; all state stays in-process.
- ✅ **Zero Exfiltration**: No new outbound endpoints introduced; telemetry sticks to existing OTLP exporters.
- ✅ **Named Exports**: New helpers should follow `export const` conventions enforced by CODESTYLE.md.
- ✅ **Function Size**: Refactors must preserve ≤40 line limits; consider extracting helpers for concurrency controls.
- ✅ **Branding**: Continue emitting `brand: 'brAInwav'` metadata in tool dispatch payloads.

### Technical Constraints
- Nx/PNPM workspace boundaries enforce dependency graph integrity; shared utilities should live in existing common packages.
- Concurrency tuning must respect `@cortex-os/orchestration` budgets and MCP rate limits.
- Cold-start improvements cannot rely on Node worker threads on resource-constrained edge devices.
- Need compatibility with Node ≥20.0.0 per package engines.

### Security Constraints
- Preserve current auth flows handled in `packages/agents/src/auth`.
- Ensure adapter caches do not leak credentials; sanitize logs through pino serializers.
- Maintain audit logging through existing `@cortex-os/observability` integration hooks.

### Integration Constraints
- Pending rollout of `@cortex-os/a2a-core` requires feature flags to toggle batching once real transport is available.
- Coordinated changes with `@cortex-os/orchestration` may be needed to expose concurrency knobs.
- Observability exporters must be updated alongside to capture new metrics.

---

## Implementation Roadmap

1. **Telemetry & Guardrails (Week 1)**
   - Add high-cardinality-safe metrics for dispatch latency and queue depth.
   - Expose config for tool concurrency via env/feature flags with sane defaults.

2. **Adaptive Dispatch (Weeks 2-3)**
   - Memoize prompt rendering per subagent during server bootstrap.
   - Reuse MLX/Ollama adapter instances and gate concurrency via `p-limit`.
   - Implement cancellation hooks tied to ResourceManager for graceful shutdown.

3. **Batched Lifecycle Events (Week 3)**
   - Introduce registration batcher with jittered flush and schema version notes.
   - Move smoke coordination tests behind a readiness hook triggered after initial batch flush.

4. **Validation (Week 4)**
   - Run `pnpm --filter agents test:coverage` and targeted load tests to confirm p95 latency ≤250 ms.
   - Capture OpenTelemetry spans demonstrating reduced cold-start and execution latency.

---

## Open Questions

1. What MCP throttling thresholds will the infrastructure team accept for adaptive concurrency rollout?
2. Should agent registration batching emit partial updates for long-lived boot sequences?
3. Do downstream consumers require strict ordering guarantees that constrain batching window sizes?

