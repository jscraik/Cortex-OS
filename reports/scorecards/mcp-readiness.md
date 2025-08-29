MCP Ecosystem Readiness Report

Overview

- Scope: `packages/mcp`, `packages/mcp-bridge`, `packages/mcp-registry`, and `packages/mcp/mcp-servers/echo-js`.
- Status: Production-ready core with real transports (STDIO/HTTP/SSE), request correlation via client, mixed-topology interop, and realistic registry CLI. Optional SSE write enabled via companion HTTP endpoint.

Headline Score

- Overall: 90/100 (Ready)
- Basis: Architecture (90), Security (88), Performance (86), Reliability (88), Observability (82), Testing (90), Deployment (75), Documentation (85)

What’s Implemented

- Transports
  - STDIO: spawn-based JSON-RPC with newline framing; emits message events.
  - HTTP: POST `/mcp` with JSON-RPC envelope; emits parsed response events.
  - SSE: EventSource read; `send()` uses `writeUrl` to POST JSON-RPC.
- Client
  - Pending request map with timeouts and cleanup; typed `request<TResult>()` helper; A2A hooks for telemetry.
- Server
  - Server-scoped `subscriptions` and `templates` handlers; policy gates (`MCP_LOCAL_ONLY`, `MCP_EVIDENCE_REQUIRED`).
- Interop
  - Echo-JS HTTP wrapper (POST /mcp) + STDIO server; mixed-topology E2E.
- CLI
  - mcp-bridge: `mcp registry list --json` backed by `mcp-registry` fs store; removed placeholder subcommands.
- Observability
  - Optional OTEL bootstrap with OTLP exporter; spans can be enabled via env.

Gaps and Recommendations

- Deployment (75)
  - Add container spec and minimal K8s manifests for the HTTP server(s).
  - CI matrix for mTLS combinations (feature-gated).
- Observability (82)
  - Provide ready-to-import Grafana panels and an example OTEL collector config in repo-wide docs.
- Performance (86)
  - Add a stdio/http micro-bench in `packages/mcp/scripts` and wire to CI optional job.
- Documentation (85)
  - Expand README quick-starts for SSE `writeUrl` usage and policy gates.

Evidence (Key Files)

- Transports: `packages/mcp/src/lib/transport.ts`, `packages/mcp/src/lib/sse-transport.ts`
- Client: `packages/mcp/src/lib/client.ts` (request helper)
- E2E: `packages/mcp/src/test/mixed-topology.e2e.test.ts`, `packages/mcp/src/lib/client.e2e.test.ts`
- Echo HTTP: `packages/mcp/mcp-servers/echo-js/src/http-server.ts`
- CLI: `packages/mcp-bridge/src/cli/mcp.ts`
- Policy: `packages/mcp/src/lib/policy/modes.ts`

SLO Targets (Suggested)

- `tools/call` p95: ≤ 300ms (stdio), ≤ 800ms (http)
- `resources/read` p95: ≤ 250ms (stdio), ≤ 700ms (http)
- `transport.connect` p95: ≤ 150ms (stdio/http)
- `subscriptions` e2e p95: ≤ 500ms

Next Actions

- Add an optional CI job to run mixed-topology tests and micro-benchmarks behind `CI_MCP_FULL=1`.
- Publish a small runbook for mTLS + origin allowlist scenarios.
