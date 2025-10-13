# Research Document: Gateway Ecosystem Performance Review

**Task ID**: `packages-gateway-performance-review-2025-10-13`
**Created**: 2025-10-13
**Researcher**: AI Agent (gpt-5-codex)
**Status**: Complete

---

## Objective

Document the current performance characteristics and bottlenecks within the `@cortex-os/gateway` package so we can prioritize remediations that protect 250 ms P95 latency budgets while scaling MCP, A2A, and RAG traffic.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/gateway/src/server.ts`
- **Current Approach**: Fastify server mounts `/mcp`, `/a2a`, `/rag`, and `/simlab` handlers through `createAgentRoute`, materializes an enhanced MCP client on each request, and exposes Prometheus metrics at `/metrics`.
- **Limitations**:
  1. `handleMCP` creates and tears down a fresh enhanced MCP client per call, even for HTTP transports, forcing TCP/TLS setup on every tool invocation and eliminating connection reuse opportunities.【F:packages/gateway/src/server.ts†L112-L140】
  2. `handleRAGViaA2A` binds a new listener on the in-process bus for every query but never unregisters it, so concurrent workloads leak handlers and degrade throughput as the process runs longer.【F:packages/gateway/src/server.ts†L62-L110】【F:packages/gateway/src/a2a.ts†L118-L165】
  3. `getMCPServerInfo` re-parses environment variables and runs `resolveTransport` for every request even though configuration is static after boot, adding synchronous overhead to the hot path.【F:packages/gateway/src/server.ts†L42-L86】

### Related Components
- **Gateway bus singleton**: `packages/gateway/src/a2a.ts` instantiates an in-memory bus with schema validation, which is reused via a module-level singleton but lacks backpressure or rate limiting when multiple RAG queries publish events simultaneously.【F:packages/gateway/src/a2a.ts†L7-L117】【F:packages/gateway/src/a2a.ts†L166-L176】
- **Route factory**: `packages/gateway/src/lib/create-agent-route.ts` performs schema validation with Zod on each request and toggles JSON/plain text responses but has no caching of compiled schemas, adding CPU cost under high concurrency.【F:packages/gateway/src/lib/create-agent-route.ts†L1-L44】
- **MCP tool definitions**: `packages/gateway/src/mcp/tools.ts` enumerates MCP tool schemas yet does not integrate with gateway routing, so there is no opportunity to reuse structured metadata for caching or scheduling decisions.【F:packages/gateway/src/mcp/tools.ts†L1-L66】

### brAInwav-Specific Context
- **MCP Integration**: Gateway proxies MCP requests to transports surfaced by `@cortex-os/mcp-core` which already supports HTTP keep-alive agents when reused; failing to reuse clients prevents us from realizing those optimizations.【F:packages/gateway/src/server.ts†L42-L140】
- **A2A Events**: Gateway reuses the in-process transport which is optimal for tests but serializes all dispatch onto a single event loop; without worker fan-out, cross-package RAG requests compete for the same microtask queue.【F:packages/gateway/src/a2a.ts†L7-L165】
- **Local Memory**: Current gateway routes do not emit local-memory telemetry, so we have no persisted evidence to correlate route-level latency with downstream bus pressure.

---

## External Standards & References

### Industry Standards
1. **Node.js HTTP Keep-Alive Guidance** — Encourage reusing HTTP agents to avoid repeated TCP handshakes for outbound calls.
2. **Fastify Lifecycle Hooks** — Recommend dedicated plugins for metrics and instrumentation to prevent per-request closure allocations.

### brAInwav References
1. **Cortex-OS Performance Optimization Guide** — Highlights connection pooling, batching, and worker fan-out as baseline strategies for latency-sensitive services.【F:PERFORMANCE_OPTIMIZATION_GUIDE.md†L1-L84】
2. **Performance Implementation Summary** — Captures organization-wide focus on async batching and pooling for network-bound workloads, which should extend to gateway MCP proxying.【F:PERFORMANCE_IMPLEMENTATION_SUMMARY.md†L1-L40】

### Libraries / Tools
- `undici` Agent pooling (via `@cortex-os/mcp-core`) for HTTP MCP transports.
- Fastify plugins such as `under-pressure` for backpressure signaling.
- `piscina` worker threads for CPU-bound schema validation if benchmarks justify.

---

## Options Considered

1. **MCP Client Pooling**
   - **Description**: Initialize a shared enhanced MCP client (or pool) during boot, reuse across requests, and attach keep-alive agents for HTTP transports.
   - **Pros**: Eliminates repeated handshakes, leverages existing retry/timeout logic, supports circuit breakers.
   - **Cons**: Requires lifecycle management to avoid stale clients when transports rotate.

2. **Bounded Bus Listeners with Auto-Unsubscribe**
   - **Description**: Replace ad-hoc `bus.bind` usage with scoped subscriptions that auto-unsubscribe after the query completes or times out.
   - **Pros**: Prevents listener leaks, stabilizes memory footprint, improves fan-out fairness.
   - **Cons**: Needs enhancements in `@cortex-os/a2a-core` if disposable bindings are not already exposed.

3. **Precompiled Validation & Worker Offload**
   - **Description**: Precompute Zod schemas (`.transformer()`) at module load or offload heavy validation to worker threads using `piscina` when payloads are large.
   - **Pros**: Reduces per-request CPU cost, aligns with brAInwav CPU budget guidance.
   - **Cons**: Adds complexity; must ensure async worker dispatch does not exceed latency budgets.

4. **Backpressure & Rate Limiting**
   - **Description**: Adopt Fastify's `under-pressure` plugin and expose RAG-specific rate limiting using the existing `RateLimitExceeded` event schema.
   - **Pros**: Provides clear signals when downstream services saturate, enabling responsive throttling.
   - **Cons**: Requires new configuration and coordination with orchestrators to honor signals.

---

## Recommendation

Prioritize a two-phase remediation plan:

1. **Phase 1 — MCP Client & RAG Listener Hygiene**
   - Create a singleton MCP client (or small pool keyed by transport) initialized during server boot, reused per request, and closed gracefully on shutdown.
   - Wrap RAG event bindings in a helper that auto-unsubscribes once the matching response arrives or on timeout, and add metrics for orphaned listeners.

2. **Phase 2 — Validation & Backpressure Hardening**
   - Precompile Zod schemas (e.g., via `schema.strict().describe()` caching) and benchmark payload-heavy endpoints; if CPU remains high, offload to a worker pool sized per CPU core.
   - Integrate Fastify `under-pressure` to emit gateway backpressure events that reuse the existing `RateLimitExceeded` schema for governance visibility.

This sequence unlocks immediate latency savings from pooling while setting the stage for sustainable load management.

---

## Implementation Considerations

- **Configuration**: Introduce environment flags to control MCP client pool size and listener timeout budgets while maintaining current defaults for backward compatibility.
- **Observability**: Extend `/metrics` to report pool utilization, listener counts, and timeout rates so we can validate improvements post-rollout.
- **Testing**: Add load-focused vitest suites or k6 scripts under `packages/gateway/tests` to regress pooling logic and event cleanup.
- **Governance**: Update gateway runbooks to document new backpressure signals and pool configuration knobs in `docs/runbooks/`.

### Sample Pseudocode

```ts
// Example: reusing enhanced MCP clients
const clientPool = createEnhancedClientPool({ size: 4, transport: resolvedTransport });

app.addHook('onClose', async () => {
  await clientPool.closeAll();
});

createAgentRoute(app, '/mcp', MCPRoute, async ({ request }) => {
  return clientPool.use(async (client) => client.callTool({
    name: request.tool,
    arguments: request.args,
  }));
});
```

### Benchmarks

- Pending. Capture baseline latency (P50/P95) for MCP proxying and RAG queries before implementing pooling and listener hygiene.

### Screenshots/Diagrams

- Not applicable for this research pass.

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-13 | AI Agent (gpt-5-codex) | Initial research |

---

**Status**: Complete

**Stored in Local Memory**: No

Co-authored-by: brAInwav Development Team
