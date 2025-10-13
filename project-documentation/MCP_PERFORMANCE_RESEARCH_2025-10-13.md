# Research Document: MCP Performance Review

**Task ID**: `mcp-performance-review`
**Created**: 2025-10-13
**Researcher**: AI Agent
**Status**: In Progress

---

## Objective

Evaluate the Cortex-OS MCP ecosystem (core package, bridge, server, registry, and connectors) to identify bottlenecks impacting latency, throughput, and resource consumption, and propose actionable performance improvements that preserve brAInwav governance and reliability guarantees.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/mcp/src/connectors/manager.ts`
- **Current Approach**: Connector manifests are fetched on demand, then each connector is processed sequentially. For every enabled entry, `ensureProxy` awaits a network handshake before invoking `registerRemoteTools`, and gauge metrics are updated per connector. 【F:packages/mcp/src/connectors/manager.ts†L62-L149】
- **Limitations**: Sequential `await` chains block discovery of other connectors, TLS handshakes are repeated without shared keep-alive agents, and the registry never evicts stale tool metadata when manifests shrink, risking memory growth over long uptimes.

### Related Components
- **Connector service map loader**: `packages/mcp/src/connectors/service-map.ts` performs blocking fetches with a single timeout and no cache headers or jitter between retries. Failures always throw, forcing callers to retry the full manifest refresh. 【F:packages/mcp/src/connectors/service-map.ts†L33-L89】
- **Remote proxy runtime**: `packages/mcp-bridge/src/runtime/remote-proxy.ts` maintains one SSE client per connector with serialized reconnect logic, logging on every call and reconnect event. Tool discovery runs after each connect, but tool lists are only stored in memory. 【F:packages/mcp-bridge/src/runtime/remote-proxy.ts†L30-L188】
- **Server base class**: `packages/mcp/src/server.ts` tracks request counts and correlation IDs but lacks rate limiting or adaptive batching. Registration APIs mutate maps without visibility into registration latency or duplication. 【F:packages/mcp/src/server.ts†L59-L185】
- **Registry persistence**: `packages/mcp-registry/src/fs-store.ts` rewrites the entire JSON file for every upsert/remove operation with naive file locking, re-reading the entire registry before each write. 【F:packages/mcp-registry/src/fs-store.ts†L5-L75】
- **Enhanced client**: `packages/mcp-core/src/client.ts` issues `safeFetch` calls without reusing HTTP agents, so each invocation incurs TCP setup unless the runtime reuses connections implicitly. WebSocket clients also create new sockets per call without pooling. 【F:packages/mcp-core/src/client.ts†L58-L200】

### brAInwav-Specific Context
- **MCP Integration**: The MCP server wrapper in `packages/mcp-server` wraps FastMCP with branded logging, OAuth hooks, and ping/health endpoints that run every 20 seconds regardless of load. 【F:packages/mcp-server/src/server/mcp-server.ts†L23-L80】
- **A2A Events**: Connector availability metrics feed Prometheus gauges but no histograms exist for call duration, limiting anomaly detection for workflow orchestrators that depend on MCP endpoints. 【F:packages/mcp/src/connectors/metrics.ts†L1-L35】
- **Local Memory**: No direct integration in performance-sensitive paths, but the registry writes to `~/.config/cortex-os/mcp/servers.json`, which can block local-memory sync jobs when lock contention occurs. 【F:packages/mcp-registry/src/fs-store.ts†L26-L55】
- **Existing Patterns**: Other Cortex packages use background refresh tasks (e.g., workflow orchestrator caches) and share keep-alive agents; similar techniques are absent in MCP connectors, suggesting room for alignment with established patterns.

---

## External Standards & References

### Industry Standards
1. **Model Context Protocol Specification (2024-11 edition)** (https://modelcontextprotocol.io/)
   - **Relevance**: Defines required tool discovery and event streaming semantics that any performance optimization must preserve.
   - **Key Requirements**: Deterministic tool listings, prompt/resource sync invariants, and proper streaming backpressure handling.

2. **OpenTelemetry Metrics Semantic Conventions** (https://opentelemetry.io/docs/specs/otel/metrics/semantic_conventions/)
   - **Relevance**: Guides consistent metric naming (histograms, gauges) for latency and availability instrumentation.
   - **Key Requirements**: Use explicit units, monotonic counters for request volume, and exemplars for sampling high latency calls.

### Best Practices (2025)
- **Node.js HTTP Performance**: Use shared `undici.Agent` instances with keep-alive to reduce TLS handshakes and DNS lookups on repeated fetches.
  - Source: https://nodejs.org/en/docs/guides/keeping-nodejs-fast
  - Application: Replace per-request fetch defaults in connector sync and MCP client calls with a long-lived agent to improve throughput.

- **Resilient Cache Refresh**: Stagger background refreshes with jitter and support stale-on-error semantics to avoid thundering herds.
  - Source: Google Cloud Architecture Center – Caching Best Practices (https://cloud.google.com/architecture/best-practices-for-using-the-cloud-memorystore)
  - Application: Apply TTL-aware refreshes for connector manifests and maintain last-known-good data if new fetches fail.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `undici` Agent pooling | 6.x | Shared HTTP client with keep-alive and pipelining | MIT | ✅ Use |
| `p-limit` | 5.x | Concurrency limiter for async work | MIT | ✅ Use |
| `prom-client` Histogram | 15.x | Prometheus histogram support | MIT | ✅ Use |

---

## Technology Research

### Option 1: Async Connector Sync with Caching

**Description**: Introduce a background scheduler that refreshes connector manifests at staggered intervals, parallelizes proxy connections with `Promise.allSettled`, and caches discovered tool metadata with TTL-aware invalidation. HTTP calls reuse a shared `undici.Agent` for keep-alive.

**Pros**:
- ✅ Reduces cold-start latency by parallelizing connector handshakes.
- ✅ Provides stale-on-error behavior, preventing downtime during manifest outages.
- ✅ Aligns with existing Prometheus instrumentation by exposing refresh duration histograms.

**Cons**:
- ❌ Requires careful invalidation to avoid serving disabled tools.
- ❌ Background refresh adds complexity to startup sequencing.

**brAInwav Compatibility**:
- Aligns with governance by improving reliability without altering public MCP contracts.
- Enables connectors to meet 250 ms p95 latency budgets documented in package AGENTS.
- Security posture unchanged; reuse existing auth headers.

**Implementation Effort**: Medium

---

### Option 2: Streaming Proxy Pipeline with Batching

**Description**: Extend `RemoteToolProxy` to batch tool invocations and stream responses via SSE multiplexing, using a worker pool to process results. Add adaptive reconnect backoff and telemetry for request throughput.

**Pros**:
- ✅ Amortizes network overhead when orchestrators call multiple tools in bursts.
- ✅ Allows better backpressure by pausing SSE consumption when queues grow.
- ✅ Enhances observability with per-batch metrics.

**Cons**:
- ❌ Requires protocol-level verification to avoid violating MCP streaming guarantees.
- ❌ Higher maintenance burden and potential incompatibility with third-party connectors.

**brAInwav Compatibility**:
- Must preserve MCP spec semantics; riskier without full integration tests.
- Adds complexity to audit logging and error propagation.

**Implementation Effort**: High

---

### Option 3: Registry Persistence Optimization

**Description**: Introduce an in-memory cache with batched flushes to the filesystem, using a lightweight append-only journal to minimize full rewrites. Employ advisory locks and atomic rename only on flush boundaries.

**Pros**:
- ✅ Cuts repeated JSON rewrites for frequent upserts/removals.
- ✅ Reduces lock contention with other local processes (e.g., local-memory sync).
- ✅ Keeps registry hot in memory for CLI queries.

**Cons**:
- ❌ Requires recovery logic to replay journal on crash.
- ❌ Additional complexity for configuration directories across OSes.

**brAInwav Compatibility**:
- Keeps compatibility with existing CLI tools reading `servers.json`.
- Must ensure Local Memory integrations still see consistent state.

**Implementation Effort**: Medium

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | ✅ Parallel refresh and caching reduces latency | ✅ Batch throughput, but higher risk | ✅ Faster local operations, no network impact |
| **Security** | ✅ Reuses auth flows | ⚠️ Requires audit of multiplexing | ✅ No auth changes |
| **Maintainability** | ✅ Moderate complexity | ❌ High complexity | ✅ Moderate complexity |
| **brAInwav Fit** | ✅ Aligns with governance budgets | ⚠️ Needs extensive review | ✅ Fits local-first goals |
| **Community Support** | ✅ Uses standard Node tooling | ⚠️ Custom streaming logic | ✅ Common persistence patterns |
| **License Compatibility** | ✅ MIT tooling | ✅ MIT | ✅ MIT |

---

## Recommended Approach

Adopt **Option 1** combined with targeted pieces of **Option 3**. Parallel connector refresh with keep-alive agents addresses the most visible latency issues while maintaining protocol safety. Pairing it with batched registry persistence prevents local I/O bottlenecks that surface during orchestrator restarts. Option 2 delivers theoretical gains but introduces protocol risk and should be deferred until new benchmarks justify the investment.

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "undici": "^6.19.0",
    "p-limit": "^5.0.0"
  }
}
```

**License Verification Required**:
- [ ] `undici` - MIT - ✅ Compatible
- [ ] `p-limit` - MIT - ✅ Compatible

### Configuration Changes
- **File**: `packages/mcp/src/connectors/manager.ts`
- **Changes**: Inject shared `Agent` and concurrency limiter, add background scheduler toggles via env (`MCP_CONNECTOR_REFRESH_INTERVAL_MS`).
- **File**: `packages/mcp-registry/src/fs-store.ts`
- **Changes**: Add in-memory cache with periodic flush interval and feature flag to fall back to existing behavior.

### Database Schema Changes
- **Migration Required**: No
- **Impact**: Persistence remains file-based; introduce optional journal file under `~/.config/cortex-os/mcp/servers.log` for crash recovery.

### Breaking Changes
- **API Changes**: None—tool names and MCP contracts unchanged.
- **Migration Path**: Provide fallback env flag (`MCP_CONNECTOR_REFRESH_SYNC=true`) to disable async refresh if regressions appear.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 1 day | Baseline latency benchmarks, add feature flags, wire shared agent scaffolding |
| **Core Implementation** | 3 days | Implement async connector refresh, caching layer, and registry batching |
| **Testing** | 2 days | Unit tests for refresh scheduler, integration tests for manifest fallback, mutation coverage |
| **Integration** | 1 day | Validate with workflow orchestrator smoke tests and MCP bridge regression suite |
| **Documentation** | 0.5 day | Update package READMEs, runbooks, and governance evidence |
| **Total** | 7.5 days | |

---

## Related Research

### Internal Documentation
- `project-documentation/MCP_IMPLEMENTATION_TASKS_PHASE1.md` – prior rollout steps for MCP bridge integration.
- `docs/mcp/CHATGPT_CONNECTOR_MCP_SERVER_SUMMARY.md` – operational playbooks for connector proxies.
- `PERFORMANCE_OPTIMIZATION_GUIDE.md` – workspace-wide guidance for instrumentation and profiling.

### External Resources
- Model Context Protocol Reference – streaming and tool contracts.
- Node.js Diagnostics Channel – instrumentation hooks for HTTP clients.
- Prometheus Histograms best practices – bucket selection for latency tracking.

### Prior Art in Codebase
- **Similar Pattern**: `packages/workflow-orchestrator` caching layer (see `cache` module) uses background refresh with stale-on-error fallback.
  - **Lessons Learned**: Feature flags allowed gradual rollout; metrics validated improved p95 latency.
  - **Reusable Components**: Shared telemetry helpers and environment flag parsing utilities.

---

## Next Steps

1. **Immediate**:
   - [ ] Capture baseline connector sync timings via existing Prometheus gauges.
   - [ ] Draft feature flag proposal for async refresh rollout.

2. **Before Implementation**:
   - [ ] Get stakeholder approval on recommended approach.
   - [ ] Create TDD plan referencing `.cortex/templates/tdd-plan-template.md` for scheduler and registry cache changes.
   - [ ] Verify `undici` and `p-limit` license compatibility with compliance team.
   - [ ] Document findings in Local Memory once vibe_check access is restored.

3. **During Implementation**:
   - [ ] Validate concurrency controls with unit and integration tests.
   - [ ] Monitor Prometheus histograms for regressions during canary rollout.
   - [ ] Update research document if unexpected bottlenecks arise.

---

## Appendix

### Code Samples

```typescript
// Example: Shared undici agent injected into connector refresh
import { Agent } from 'undici';
import pLimit from 'p-limit';

const agent = new Agent({ connections: 10, pipelining: 1 });
const limit = pLimit(4);

await Promise.allSettled(
  connectors.map((entry) =>
    limit(async () => {
      const proxy = await ensureProxy(entry, agent);
      await registerRemoteTools(entry, proxy);
    }),
  ),
);
```

### Benchmarks
- Baseline metrics to capture: connector manifest fetch duration, proxy connect latency, tool call p95/p99, registry write throughput.
- Target improvements: ≥35% reduction in cold-start manifest sync, ≤150 ms connector tool call p95 during steady state.

### Screenshots/Diagrams
- N/A (to be captured after prototype dashboards are updated).

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-13 | AI Agent | Initial research |

---

**Status**: Complete when implementation plan approved

**Stored in Local Memory**: Pending (vibe_check server unreachable in current sandbox; log attempt once available)
