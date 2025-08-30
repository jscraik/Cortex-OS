<!--
This README.md file follows WCAG 2.1 AA accessibility guidelines:
- Clear document structure with semantic headings
- Descriptive link text
- Alternative text for images
- High contrast content organization
-->

# Cortex OS MCP Package

## Overview

This package consolidates Model Context Protocol utilities for Cortex OS. It re-exports the core libraries and transport bridge so downstream tooling can consume them from a single entry point.

## Features

- Production transports: STDIO, HTTP, SSE (with optional writeUrl)
- Typed client with request<TResult>() and response correlation
- Policy gates: MCP_LOCAL_ONLY and MCP_EVIDENCE_REQUIRED
- Echo-JS basic server with HTTP wrapper (POST /mcp)
- Mixed-topology interop tests (STDIO + HTTP)
- Optional OTEL tracing bootstrap (OTLP) via env

## Directory Structure

```text
packages/mcp/
├── src/
│   ├── index.ts
│   ├── mcp-protocol-conformance.test.ts
│   └── test/
│       └── sse-security.test.ts
├── mcp-core/
├── mcp-registry/
├── mcp-servers/
├── mcp-transport-bridge/
├── scripts/
│   ├── start-mcp-with-tunnel.sh
│   └── test-mcp.sh
├── infrastructure/
│   └── cloudflare/
├── package.json
└── README.md
```

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build
```

## Quick Start

### Client (HTTP)

```ts
import { McpClient } from '@cortex-os/mcp';

const client = new McpClient({
  transport: { type: 'http', url: 'http://localhost:8080/mcp', timeoutMs: 10000 },
});
await client.connect();

// Initialize and discover
const init = await client.request<{
  protocolVersion?: string;
  capabilities: Record<string, unknown>;
}>('initialize', { protocolVersion: '2025-06-18' });
const tools = await client.request<{ tools: Array<{ name: string }> }>('tools/list');

// Call a tool
const result = await client.callTool('echo', { message: 'hello' });
console.log(result.result); // { ok: true, echo: 'hello' }
```

### Transports

- STDIO: spawn a stdio MCP server and exchange JSON-RPC as newline-delimited JSON.
- HTTP: POST JSON-RPC envelopes to `/mcp`; responses are emitted and correlate to pending requests.
- SSE: events via EventSource; set `writeUrl` for POSTing JSON-RPC on `send()`.

### Policy Gates

- `MCP_LOCAL_ONLY=1`: blocks non-local resource schemes (enforced in resource handlers).
- `MCP_EVIDENCE_REQUIRED=1`: blocks `tools/call` without `evidence` or `uri` in args.

### Echo-JS HTTP Wrapper

```bash
node packages/mcp/mcp-servers/echo-js/src/http-server.ts
# POST JSON-RPC to http://localhost:8080/mcp
```

### Registry CLI (mcp-bridge)

```bash
# List installed servers
mcp registry list --json
```

## Containerization & Runtime

- This package (`packages/mcp`) is a library used inside services; do not containerize it standalone.
- Containerize services that expose APIs or run workers (e.g., `apps/cortex-os`, `packages/model-gateway`, `packages/mcp-registry`).
- MLX (Metal) remains host-native on macOS; containers talk to it via `http://host.docker.internal:8081` when using OrbStack or Docker Desktop.
- For macOS development, OrbStack provides the Docker-compatible VM; a separate VM is only needed for strict Linux parity or kernel isolation tests.

### OrbStack Quickstart (Dev)

- Start lean stack:
  - `docker compose -f infra/compose/docker-compose.dev.yml --profile dev-min up --build -d`
- Add services as needed:
  - `--profile dev-full` (adds mcp-registry), `--profile web`, `--profile api`, `--profile workers`, `--profile observability`
- Container names (defaults):
  - `cortexos_nats`, `cortexos_model_gateway`, `cortexos_mcp_registry`, `cortexos_cortex_os`, `cortexos_cortex_web`, `cortexos_api`, `cortexos_agents_workers`, `cortexos_otel_collector`, `cortexos_loki`, `cortexos_tempo`, `cortexos_grafana`

### Image Tagging Guidance

- Use GHCR (or your registry): `ghcr.io/<org>/<service>:edge` for main, `:stable` for release, plus semver tags.
- Services: `model-gateway`, `mcp-registry`, `cortex-os`, `cortex-web`, `api`, `agents-workers`.

## Environment Variables

| Variable                  | Description                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `CORTEX_MCP_ROOT`         | Absolute path to the repository root used by the `repo_file` tool. Required.                               |
| `CORTEX_MCP_TOKEN`        | Authentication token required to start the MCP server.                                                     |
| `CORTEX_GATEWAY_URL`      | Base URL for the Cortex Gateway used with private Git repositories. Required when accessing private repos. |
| `CORTEX_LOCAL_BRIDGE_URL` | Base URL for the local GitMCP bridge used with public or local repositories.                               |

## Scripts

From the repository root:

```bash
pnpm mcp:start              # Start MCP server
pnpm mcp:dev                # Run in development mode
pnpm mcp:build              # Build the package
pnpm mcp:test               # Run tests
pnpm mcp:start-with-tunnel  # Start with tunnel
```

## Testing

Includes protocol conformance, security, and interop tests:

```bash
# Run all tests
pnpm test

# Mixed topology E2E (STDIO + HTTP)
pnpm -C packages/mcp vitest run packages/mcp/src/test/mixed-topology.e2e.test.ts

# Client correlation (HTTP)
pnpm -C packages/mcp vitest run packages/mcp/src/lib/client.e2e.test.ts
```

## Architecture & Governance

- Clear boundaries: no cross-domain imports; MCP logic isolated under `src/lib`.
- Functional-first: transports via factories; SSE uses class where EventEmitter ergonomics are valuable.
- Named exports only and ≤40-line functions for new code.
- Deterministic policy gates and reproducible behavior via environment.

## Accessibility

This module follows WCAG 2.1 AA accessibility guidelines. All interactive elements are keyboard accessible and screen reader compatible.
