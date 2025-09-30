# MCP (Model Context Protocol) Packages

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-88%25-green.svg)](coverage)

## Overview

The Cortex MCP package now ships a production-fast FastMCP server with
first-class integrations into the Cortex knowledge search API and the Local
Memory REST service. Requests are validated and sanitized by brAInwav security
helpers, outbound calls are wrapped with retries + circuit breakers, and
observability is handled via Prometheus metrics + health probes.

## Packages

### @cortex-os/mcp-core

Minimal building blocks for the Model Context Protocol (TypeScript).

### @cortex-os/mcp-registry

File-system backed registry for managing MCP server configurations.

### @cortex-os/mcp-bridge

Stdio ↔ HTTP/SSE bridge for MCP transports with rate limiting.

### mcp (Python)

Complete Python implementation of the Model Context Protocol.

## Configuration

The server reads all settings from environment variables (see `config.py`). Key
values include:

| Variable | Description |
| --- | --- |
| `CORTEX_MCP_CORTEX_SEARCH_URL` | HTTPS endpoint for knowledge search queries |
| `CORTEX_MCP_CORTEX_DOCUMENT_BASE_URL` | Base URL for document fetch by ID |
| `CORTEX_MCP_CORTEX_SEARCH_API_KEY` | Bearer token for Cortex search/document APIs |
| `CORTEX_MCP_LOCAL_MEMORY_BASE_URL` | Local Memory REST API base (defaults to `http://localhost:3028/api/v1`) |
| `CORTEX_MCP_LOCAL_MEMORY_API_KEY` | Optional Local Memory bearer token |
| `CORTEX_MCP_LOCAL_MEMORY_NAMESPACE` | Optional namespace header for Local Memory |
| `CORTEX_MCP_HTTP_TIMEOUT_SECONDS` | Timeout for outbound HTTP (default 15s) |
| `CORTEX_MCP_HTTP_RETRIES` | Retry attempts for outbound HTTP (default 3) |
| `CORTEX_MCP_SEARCH_BREAKER_FAILURES` | Failure threshold before the search circuit opens (default 5) |
| `CORTEX_MCP_SEARCH_BREAKER_TIMEOUT_SECONDS` | Recovery timeout for the search circuit breaker (default 30s) |
| `CORTEX_MCP_MEMORY_BREAKER_FAILURES` | Failure threshold before the memory circuit opens (default 5) |
| `CORTEX_MCP_MEMORY_BREAKER_TIMEOUT_SECONDS` | Recovery timeout for the memory circuit breaker (default 15s) |

JWT authentication for REST routes requires:

```bash
export JWT_SECRET_KEY="<32+ byte secret>"
export JWT_ALGORITHM="HS256"
```

## Memory Management

1. Use the MCP-aware memory manager to observe production traffic:

   ```bash
   ./scripts/memory-manager-mcp.sh --gentle
   ```

2. Exercise memory CRUD through the REST bridge or MCP tools; data now persists
   via Local Memory instead of process dictionaries.

3. Coverage reports are generated automatically when `pytest` is invoked with
   the `--cov` configuration in `pyproject.toml`.

## Docker Deployment

```bash
docker-compose -f docker/docker-compose.mcp.yml up
```

## Test Coverage

All MCP packages target 90%+ coverage:

- `mcp-core`: 94%+
- `mcp-registry`: 94%+
- `mcp-bridge`: 94%+
- `mcp`: 90%+

## Development Guidelines

1. Always run tests with memory constraints
2. TDD (Red → Green → Refactor)
3. Maintain 90%+ test coverage
4. Follow contract-driven modular architecture
5. Ensure cross-package compatibility

## Quality Gates

Changes must pass:

- Unit tests (≥90% coverage)
- Integration tests
- Security scanning
- Code quality checks
- Memory usage validation

## License

Apache 2.0

## Operational Notes

## Quick Start

```bash
# 1. Install dependencies via uv (no virtualenv committed anymore)
cd packages/cortex-mcp
uv sync

# 2. Run the FastMCP server with real adapters
JWT_SECRET_KEY=dev-secret CORTEX_MCP_CORTEX_SEARCH_URL=https://search.cortex-os.ai/v1/search \
  CORTEX_MCP_CORTEX_DOCUMENT_BASE_URL=https://search.cortex-os.ai/v1/documents \
  uv run fastmcp run src/cortex_mcp/cortex_fastmcp_server_v2.py --transport http --port 3024

# 3. Exercise REST memory routes (persist via Local Memory)
curl -H "Authorization: Bearer <jwt>" -X POST \
  -d '{"kind":"note","text":"Persisted by Local Memory"}' \
  http://localhost:3024/api/memories

# 4. Run test suite (new adapter & REST coverage)
uv run pytest tests/test_server_integration.py

# 5. Optional: proxy through Cloudflare tunnel
cloudflared tunnel --config packages/cortex-mcp/infrastructure/cloudflare/tunnel.config.yml run cortex-mcp
```

### Deployment & Discovery Verification

1. Build the latest FastMCP bundle locally:

   ```bash
   pnpm mcp:build
   ```

2. Sync the updated package to the production host and restart the managed
   process. For the default systemd unit, run:

   ```bash
  ssh brainwav-mcp "sudo systemctl restart cortex-fastmcp.service && sudo systemctl status cortex-fastmcp.service --no-pager"
   ```

3. Confirm the health endpoints through the Cloudflare tunnel:

  ```bash
  scripts/cloudflare/mcp-tunnel-health.sh cortex-mcp.brainwav.io /health
  ```

4. Validate discovery by fetching the manifest. This must succeed before
   reconnecting ChatGPT:

   ```bash
   curl -fsSL https://cortex-mcp.brainwav.io/.well-known/mcp.json | jq
   ```

### CDN Cache Flush (Cloudflare)

[Unverified] Update the placeholders below with the Cloudflare account details for
the brAInwav zone before executing the purge call.

```bash
export CLOUDFLARE_ZONE_ID="<zone-id>"
export CLOUDFLARE_API_TOKEN="<token-with-cache-purge-scope>"

curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://cortex-mcp.brainwav.io/.well-known/mcp.json"]}'
```

Re-run the manifest curl after the purge to confirm the latest payload is served
from the edge.

### Connector Retest Playbook

1. In ChatGPT → Settings → MCP, remove any cached `cortex-mcp.brainwav.io`
   configuration.
2. Add the connector again and allow the client to fetch
   `/.well-known/mcp.json`.
3. Trigger a basic tool invocation to confirm SSE transport health. Example:

   ```text
   /mcp.tool call cortex-mcp search '{"query":"FastMCP manifest smoke"}'
   ```

4. Capture logs from the MCP host while running the test for observability:

   ```bash
   journalctl -u cortex-fastmcp.service -f
   ```

### MCP Discovery RFC Tracking

- Watch the upstream issue: [modelcontextprotocol/spec issues](https://github.com/modelcontextprotocol/spec/issues)
  (filter for "discovery manifest" / "auth hints").
- Subscribe to the governance feed at
   [modelcontextprotocol/spec discussions](https://github.com/modelcontextprotocol/spec/discussions).
- When new fields (for example `auth`, `registries`) are proposed, mirror them in
  `cortex_fastmcp_server_v2.py` and note the change in `CHANGELOG.md` under the
  MCP section.

## Available MCP Tools (Python server)

The FastMCP server exposes these core tools:

- `search(query: str, max_results: int = 10)` — Find Cortex-OS docs/content
- `fetch(resource_id: str)` — Retrieve full content for a specific resource
- `ping(transport?: str)` — Basic status with transport echo
- `health_check()` — Minimal health probe returning `{status, version}`
- `list_capabilities()` — Lists tools/resources/prompts and version

An HTTP `GET /health` route is also provided when running with HTTP/SSE transports.

## Contracts

Relevant contract/schema assets for MCP-related events & streaming:

- `contracts/streaming-events.schema.json`
- `contracts/cloudevents/` (envelope + event shape definitions)
- `contracts/asyncapi/` (AsyncAPI specs for event catalogue)

When adding new cross-boundary events, follow the Contract Versioning Rules in the root playbook and add a validation test under `contracts/tests/`.

## Status Matrix

| Category | Item / Purpose | Path / Command |
|----------|----------------|----------------|
| Port | Fixed MCP server port | `3024` |
| Port (forbidden) | Historical blocked port | `3004` (guarded) |
| Startup Script | Launch & guard checks | `scripts/start-mcp-server.sh` |
| CI Guard | Block reintroduction of 3004 | `scripts/ci/guard_port_3004.sh` |
| Tunnel Config | Canonical Cloudflare config | `packages/cortex-mcp/infrastructure/cloudflare/tunnel.config.yml` |
| Tunnel Rotate Config | Blue/Green template | `packages/cortex-mcp/infrastructure/cloudflare/tunnel.rotate.config.yml` |
| Rotation Script | Zero-downtime tunnel swap | `scripts/cloudflare/mcp-tunnel-rotate.sh` |
| Tunnel Health Script | Endpoint health probe | `scripts/cloudflare/mcp-tunnel-health.sh` |
| Memory Manager | Constrained memory helper | `./scripts/memory-manager-mcp.sh` |
| Tests Runner | MCP test harness | `./scripts/run-mcp-tests.sh` |
| Forensic Script | Port 3004 attribution loop | `scripts/port3004_bind_loop.py` |
| Forensic Script | Capture killer attribution | `scripts/capture_port3004_attribution.sh` |
| Forensic Script | Mitigation experiment | `scripts/mitigate_port3004.sh` |

> NOTE: Any addition touching external event shapes must include a schema update + test.

### Fixed MCP Port

The Python MCP server binds exclusively to port `3024` (migrated off
`3004` after forensic analysis showed macOS `syspolicyd` terminated any
listener there). A startup guard and CI check enforce this. Do NOT
reintroduce `3004`.

### CI Guard

Script: `scripts/ci/guard_port_3004.sh`

Manual run:

```bash
pnpm ci:guard:ports
```

Extended governance (includes guard):

```bash
pnpm ci:governance:extended
```

### Startup Self-Check

`scripts/start-mcp-server.sh` aborts if:

- `run_server.py` contains `3004`
- `MCP_PORT` resolves to `3004`

### Cloudflare Tunnel

Canonical config: `packages/cortex-mcp/infrastructure/cloudflare/tunnel.config.yml`

Deploy example:

```bash
cloudflared tunnel --config packages/cortex-mcp/infrastructure/cloudflare/tunnel.config.yml run cortex-mcp
```

### Zero-Downtime Tunnel Rotation

Blue/Green rotation keeps the hostname serving while updating tunnel identity.

1. Create new tunnel (green):

   ```bash
   cloudflared tunnel create cortex-mcp-green
   ```

2. Populate `packages/cortex-mcp/infrastructure/cloudflare/tunnel.rotate.config.yml` with the new tunnel UUID or token.

3. Rotate:

   ```bash
   scripts/cloudflare/mcp-tunnel-rotate.sh \
   --new-config packages/cortex-mcp/infrastructure/cloudflare/tunnel.rotate.config.yml \
     --old-name cortex-mcp \
     --new-name cortex-mcp-green \
     --hostname cortex-mcp.brainwav.io \
     --health-path /health \
     --grace 20
   ```

4. Observe logs:

   ```bash
   tail -f logs/tunnel-cortex-mcp-green.log
   ```

5. (Optional) Delete old tunnel:

   ```bash
   cloudflared tunnel delete cortex-mcp
   ```

Environment tuning (defaults):

```bash
ROTATE_MIN_SUCCESSES=3
ROTATE_POLL_INTERVAL=3
ROTATE_MAX_ATTEMPTS=20
```

Manual health probe:

```bash
scripts/cloudflare/mcp-tunnel-health.sh cortex-mcp.brainwav.io /health
```

Ingress maps `cortex-mcp.brainwav.io` → `http://localhost:3024`; other hostnames 404.

### Forensic Artifacts

Legacy diagnostic scripts (evidence & regression testing):

- `scripts/port3004_bind_loop.py`
- `scripts/capture_port3004_attribution.sh`
- `scripts/mitigate_port3004.sh`

These are allow‑listed by the CI guard.

## Architecture Reference

High-level system architecture (overall Cortex-OS, includes MCP integration points):

- Rendered diagram: `docs/architecture.png`
- Source (Mermaid): `docs/architecture.mmd`

Regenerate after edits:

```bash
pnpm mermaid:generate
```

## Metrics & Observability

The MCP Python service surfaces operational signals via logs (and can be
integrated into broader Cortex-OS tracing if configured). Current
baseline:

- Structured logs: written under `logs/` (e.g., `logs/tunnel-*.log`,
   future: `logs/mcp-server.log`).
- Health endpoint: `GET /health` (used by tunnel rotation & probes).
- Rotation success criteria: consecutive healthy probes (`ROTATE_MIN_SUCCESSES`).

Tail primary logs:

```bash
tail -f logs/mcp-server.log
tail -f logs/tunnel-cortex-mcp*.log
```

Sample health probe (non-200 indicates failure):

```bash
curl -i https://cortex-mcp.brainwav.io/health
```

Planned (not yet implemented):

- OpenTelemetry span emission on request handling.
- Emission of per-stream token counters (aggregate vs delta) as events.

## Cloudflare Tunnel Log Patterns

Healthy startup excerpt:

```text
2025-09-15T10:12:04Z INF Initial protocol h2mux
2025-09-15T10:12:05Z INF Route propagating tunnelID=1234abcd region=AMS
2025-09-15T10:12:06Z INF Connected to edge ip=198.41.x.y
2025-09-15T10:12:07Z INF Registered ingress rules count=2
2025-09-15T10:12:09Z INF Health probe succeeded status=200 path=/health consecutive=3
```

Failing (app unavailable) excerpt:

```text
2025-09-15T10:12:04Z INF Initial protocol h2mux
2025-09-15T10:12:05Z ERR Upstream connection failed error="dial tcp 127.0.0.1:3024: connect: connection refused" retry=1
2025-09-15T10:12:07Z ERR Upstream connection failed error="dial tcp 127.0.0.1:3024: connect: connection refused" retry=2
2025-09-15T10:12:12Z WRN Health probe failed status=502 path=/health consecutiveFails=3
```

Actionable signals:

- Repeated `connection refused`: MCP server not running.
- Repeated 5xx with server running: inspect server logs or dependency.
- No `Registered ingress rules`: config path or credentials issue.

## Streaming Event Contract (Example)

Extract from `contracts/streaming-events.schema.json` (simplified):

```json
// Token delta as content streams
{ "type": "delta", "delta": "Hello" }

// Completion of a full assistant message
{
   "type": "item",
   "item": {
      "Message": {
         "role": "assistant",
         "content": [ { "OutputText": { "text": "Hello world" } } ]
      }
   }
}

// End of stream marker
{ "type": "completed" }
```

Validation notes:

- Only one of: `delta`, `item`, or stream terminator `completed` per event.
- `delta` events are order-sensitive; consumers should append in arrival order.
- `completed` guarantees no further events for the stream ID (if envelope used).
- Future extensions (e.g., `error`, `metrics`) must remain backward compatible.

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| Tunnel health check failing during rotation | New tunnel not yet fully established or ingress misconfigured | Check logs `tail -f logs/tunnel-<new>.log`; verify hostname in rotate config; ensure DNS (Cloudflare) entry exists |
| Rotation script exits with timeout | Health never reached required successes | Increase `ROTATE_MAX_ATTEMPTS` or lower `ROTATE_MIN_SUCCESSES`; manually probe health script to isolate app vs tunnel |
| CI guard fails on forbidden port | Accidental reintroduction of `3004` in runtime code | Replace with `3024`; run `pnpm ci:guard:ports` locally before commit |
| Startup script aborts (port conflict) | Another process already bound to `3024` | Identify with `lsof -i :3024`; stop process or adjust local dev by proxy (do NOT change server port) |
| Tunnel connects but 404 on health | App not running or wrong service URL in `tunnel.config.yml` | Ensure MCP server listening on `3024`; confirm ingress service URL `http://localhost:3024` |
| Rotation rollback needed (new tunnel unhealthy) | New tunnel never stabilized | Re-run rotation script swapping old/new names or delete faulty tunnel and retain old |
| High memory during tests | Missing constrained test invocation | Use `./scripts/run-mcp-tests.sh all` and memory manager `./scripts/memory-manager-mcp.sh --gentle` |

Rollback (manual) example:

```bash
# If new (green) failed; revert to old (blue) as primary
cloudflared tunnel run cortex-mcp &
# Optionally delete failed green tunnel after validation
cloudflared tunnel delete cortex-mcp-green
```

If issues persist capture environment details and attach logs from `logs/tunnel-*.log` plus output of:

```bash
cloudflared tunnel list
scripts/cloudflare/mcp-tunnel-health.sh cortex-mcp.brainwav.io /health
```
