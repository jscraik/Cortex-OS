# Cortex MCP Deployment Guide

This guide describes how to deploy the refactored brAInwav Cortex MCP server
with real Cortex knowledge search integration, Local Memory persistence, and the
updated security/observability stack.

> **Note**: The legacy Celery/Redis queue references have been removed from the
> runtime. Outbound dependencies are limited to the configured Cortex and Local
> Memory HTTP APIs.

## 1. Prerequisites

- **Python**: 3.12 or newer (managed automatically via `uv`).
- **Node.js / pnpm**: Only required when running Nx smart commands; not needed to
  operate the Python server directly.
- **Local Memory Service**: Accessible REST API endpoint (`/memories`,
  `/memories/search`, `/memories/{id}`) with optional namespace + bearer token.
- **Cortex Knowledge Search API**: HTTPS endpoints for search (`GET` with `q`
  parameter) and document fetch (`GET /{id}`).

## 2. Environment Configuration

Set the following environment variables in your deployment target (systemd
unit, container, or managed platform):

```bash
# Cortex search + document fetch
export CORTEX_MCP_CORTEX_SEARCH_URL="https://search.cortex-os.ai/v1/search"
export CORTEX_MCP_CORTEX_DOCUMENT_BASE_URL="https://search.cortex-os.ai/v1/documents"
export CORTEX_MCP_CORTEX_SEARCH_API_KEY="<cortex-search-bearer>"

# Local Memory REST integration
export CORTEX_MCP_LOCAL_MEMORY_BASE_URL="https://memory.brainwav.io/api/v1"
export CORTEX_MCP_LOCAL_MEMORY_API_KEY="<memory-bearer>"
export CORTEX_MCP_LOCAL_MEMORY_NAMESPACE="production"

# HTTP behaviour
export CORTEX_MCP_HTTP_TIMEOUT_SECONDS=20
export CORTEX_MCP_HTTP_RETRIES=4

# REST authentication for public API routes
export JWT_SECRET_KEY="<32+ byte secret>"
export JWT_ALGORITHM="HS256"

# Optional public metadata
export CORTEX_MCP_PUBLIC_ENDPOINT="https://cortex-mcp.brainwav.io/mcp"
export MCP_MANIFEST_GENERATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

All variables have sensible defaults except for the JWT secret and the Cortex
search/document endpoints.

## 3. Build & Install

```bash
cd packages/cortex-mcp
uv sync  # Installs project and dependencies into .venv (not committed)
```

The package is installable as a wheel if you prefer system installs:

```bash
uv build
uv pip install dist/cortex_mcp-*.whl
```

## 4. Running the Server

### 4.1 FastMCP CLI

```bash
uv run fastmcp run cortex_fastmcp_server_v2.py --transport http --port 3024
```

Available transports: `stdio`, `http`, `sse`. The server automatically registers:

- MCP tools: `search`, `fetch`, `ping`, `health_check`, `memories_store`,
  `memories_search`, `memories_get`, `memories_delete`
- REST routes: `/health`, `/health/details`, `/.well-known/mcp.json`,
  `/api/memories` (CRUD)

### 4.2 Systemd Unit (example)

```ini
[Unit]
Description=brAInwav Cortex MCP Server
After=network-online.target

[Service]
WorkingDirectory=/opt/cortex-os/packages/cortex-mcp
EnvironmentFile=/etc/cortex-mcp.env
ExecStart=/opt/cortex-os/packages/cortex-mcp/.venv/bin/uv run fastmcp run cortex_fastmcp_server_v2.py --transport http --port 3024
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 5. Health, Metrics & Discovery

- `GET /health` – basic status & version.
- `GET /health/details` – system health plus adapter readiness flags.
- `GET /.well-known/mcp.json` – MCP discovery manifest with brAInwav branding.
- Prometheus metrics middleware exposes counters/histograms when the process is
  scraped via the configured exporter (ensure `prometheus_client` is installed).

## 6. Memory REST API Usage

All routes require a valid JWT bearer with scopes:

| Route | Scope |
| --- | --- |
| `POST /api/memories` | `memories:write` |
| `GET /api/memories` | `memories:read` |
| `GET /api/memories/{id}` | `memories:read` |
| `DELETE /api/memories/{id}` | `memories:delete` |

Example store + search:

```bash
curl -X POST http://localhost:3024/api/memories \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"kind":"note","text":"Deployment is live"}'

curl -G http://localhost:3024/api/memories \
  -H "Authorization: Bearer <jwt>" \
  --data-urlencode 'query=deployment'
```

Returned payloads are fully sanitized by `sanitize_output` to prevent script
injection in downstream MCP clients.

## 7. Testing & Validation

Automatic tests cover the MCP tool wiring and REST adapters. Run them after each
change:

```bash
uv run pytest tests/test_server_integration.py
```

For Nx-aware workflows:

```bash
pnpm test:smart --focus cortex-mcp
```

Consider enabling synthetic monitoring to hit `/health`, `/health/details`, and
`/.well-known/mcp.json` via your deployment pipeline or Cloudflare tunnel.

## 8. Observability Checklist

- Metrics scraped via Prometheus + Grafana dashboards (requests, durations).
- Structured logging already includes "brAInwav Cortex MCP" prefix; ship to your
  central log pipeline.
- Health endpoints integrated with uptime checks (Cloudflare, Statuspage, etc.).

## 9. Disaster Recovery

- Local Memory persistence ensures that MCP process restarts do not lose
  conversational memories.
- All Cortex integrations are wrapped with retries + circuit breaker; if the
  upstream is unavailable the MCP surface responds with branded error payloads
  instead of raising exceptions.

## 10. Post-Deployment Validation

1. Verify `/health` and `/health/details` return `status=ok`.
2. Execute a `search` tool call through FastMCP CLI:
   ```bash
   uv run fastmcp inspect cortex_fastmcp_server_v2.py --format mcp
   ```
3. Store + retrieve a memory via REST to confirm Local Memory wiring.
4. Confirm Prometheus targets are healthy and recording request metrics.
5. Refresh the discovery manifest via `curl https://<public-host>/.well-known/mcp.json`.

Document any deviations or upstream outages in your incident tracker. Update
configuration values in the deployment environment rather than modifying source
where possible.
