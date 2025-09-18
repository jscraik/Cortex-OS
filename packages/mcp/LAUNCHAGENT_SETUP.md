# DEPRECATION NOTICE

This document lives under the legacy `packages/mcp` folder, which is deprecated.
Please use the MCP Python package and docs under `packages/cortex-mcp` going forward.

## macOS LaunchAgent Setup for Cortex-OS MCP Server

## Overview

The Cortex-OS MCP Server is now configured to run automatically on macOS using a LaunchAgent service.
This ensures the MCP server starts automatically when you log in and keeps running in the background.

## Service Configuration

**LaunchAgent File**: `~/Library/LaunchAgents/com.cortexos.mcp.server.plist`
**Service Name**: `com.cortexos.mcp.server`
**Port**: 3024 (fixed; required for Cloudflare tunnel + tooling alignment)
**Server URL**: `http://localhost:3024/mcp`

## Service Management Commands

### Start the service

```bash
launchctl load ~/Library/LaunchAgents/com.cortexos.mcp.server.plist
```

### Stop the service

```bash
launchctl unload ~/Library/LaunchAgents/com.cortexos.mcp.server.plist
```

### Check service status

```bash
launchctl list | grep cortexos
```

### View logs

```bash
# Output log
tail -f ~/Library/Logs/com.cortexos.mcp.server.out.log

# Error log
tail -f ~/Library/Logs/com.cortexos.mcp.server.err.log
```

## Server Verification

### Test MCP endpoint connectivity

```bash
# Should return a JSON-RPC error about missing Content-Type (this is expected)
curl http://localhost:3024/mcp
```

### Check if server is running

```bash
lsof -i :3024
```

## Automatic Operation

- ✅ **Starts at login**: The LaunchAgent is configured with `RunAtLoad: true`
- ✅ **Auto-restart**: The LaunchAgent is configured with `KeepAlive: true`
- ✅ **Persistent**: Service runs continuously in the background
- ✅ **Logging**: All output is logged to `~/Library/Logs/com.cortexos.mcp.server.*`

## Features Available

The MCP server provides these tools and capabilities:

- 🔍 **search_web**: Web search functionality
- 📄 **fetch_webpage**: Web content fetching
- ❤️ **health_check**: Server health monitoring
- 📊 **OpenTelemetry**: Distributed tracing and observability

## Troubleshooting

### Port conflicts

Port 3024 is canonical. If something else is bound to it:

1. Identify process:

```bash
lsof -nP -i :3024
```

1. If it's a stray previous MCP instance or dev server, terminate it:

```bash
kill -15 <PID>  # escalate with -9 only if needed
```

1. Retry load:

```bash
launchctl unload ~/Library/LaunchAgents/com.cortexos.mcp.server.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.cortexos.mcp.server.plist
```

1. Re-verify:

```bash
curl -s http://localhost:3024/mcp | head
```

Avoid changing the server port: Cloudflare tunnel + docs + clients assume 3024.
For temporary local experimentation you can run a manual instance on another port, but do not
edit the LaunchAgent plist for that.

### Automated Guard / Health / Tunnel Scripts

The repo provides helper scripts under `scripts/mcp/`:

| Script | Purpose | Typical Usage |
| ------ | ------- | ------------- |
| `guard_port_3024.sh` | Frees port 3024 from rogue listeners before startup | `./scripts/mcp/guard_port_3024.sh --force` |
| `health_probe.sh` | JSON-RPC ping (`ping` tool) with optional `--json` structured output; auto-restart via LaunchAgent if unhealthy | Periodic via health LaunchAgent plist / manual spot checks |
| `validate_cloudflare_tunnel.sh` | Ensures tunnel config maps to `http://localhost:3024` and origin reachable | Manual: before external exposure / CI |
| `mcp_diagnose.sh` | Unified diagnostics (guard, health, tunnel) + aggregate JSON summary | `./scripts/mcp/mcp_diagnose.sh --json` |

#### One-off guard before manual start

```bash
./scripts/mcp/guard_port_3024.sh --force
python packages/mcp/cortex_fastmcp_server_v2.py
```

#### Run health probe manually

```bash
# Human-readable
./scripts/mcp/health_probe.sh

# Structured JSON (machine ingestion / scripts)
./scripts/mcp/health_probe.sh --json
```

#### Validate Cloudflare tunnel

```bash
./scripts/mcp/validate_cloudflare_tunnel.sh
```

#### Unified end-to-end diagnostics

```bash
# Human readable multi-step report
./scripts/mcp/mcp_diagnose.sh

# JSON summary (machine friendly)
./scripts/mcp/mcp_diagnose.sh --json | jq .
```

Diagnostic script exit codes:

| Code | Meaning |
| ---- | ------- |
| 0 | All checks passed |
| 2 | Port guard intervention occurred but subsequent checks passed |
| 3 | Health probe failed |
| 4 | Cloudflare tunnel validation failed |
| 10 | Multiple failures (aggregate) |

JSON output fields (`--json`):

```jsonc
{
  "timestamp": "2025-01-01T12:34:56Z",
  "port_guard": { "status": "ok" | "freed" | "error", "details": "..." },
  "health": { "status": "ok" | "error", "latency_ms": 42, "details": "..." },
  "tunnel": { "status": "ok" | "error", "details": "..." },
  "summary": { "overall": "ok" | "degraded" | "failed" }
}
```

You can integrate this with other tooling, e.g.:

```bash
if ! ./scripts/mcp/mcp_diagnose.sh --json > /tmp/mcp_diag.json; then
 echo "Diagnostics failed:" >&2
 jq '.summary' /tmp/mcp_diag.json >&2
fi
```

### Periodic Health LaunchAgent

An optional plist `com.cortexos.mcp.server.health.plist` (placed in repo) can be installed to run the health probe every 2 minutes:

```bash
cp packages/mcp/com.cortexos.mcp.server.health.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.cortexos.mcp.server.health.plist
```

Check its logs:

```bash
tail -f ~/Library/Logs/com.cortexos.mcp.server.health.out.log
```

Unload if no longer desired:

```bash
launchctl unload ~/Library/LaunchAgents/com.cortexos.mcp.server.health.plist
```

### Removed Legacy Forensic Scripts

Obsolete port `3004` forensic/mitigation utilities were removed (`capture_port3004_attribution.sh`,
`mitigate_port3004.sh`, `port3004_bind_loop.py`) to reduce confusion. The CI guard remains to
prevent accidental reintroduction of forbidden port 3004 references.

### Service not starting

1. Check the error logs: `cat ~/Library/Logs/com.cortexos.mcp.server.err.log`
2. Verify Python environment: `/Users/jamiecraik/.Cortex-OS/.venv/bin/python --version`
3. Test manual start: `cd /Users/jamiecraik/.Cortex-OS && python packages/mcp/cortex_fastmcp_server_v2.py`

### Reloading configuration

If you modify the plist file:

```bash
launchctl unload ~/Library/LaunchAgents/com.cortexos.mcp.server.plist
launchctl load ~/Library/LaunchAgents/com.cortexos.mcp.server.plist
```

## Integration with MCP Clients

The server is now ready to be used with MCP-compatible clients. Configure your client to connect to:

- **Transport**: HTTP
- **URL**: `http://localhost:3024/mcp`
- **Method**: Server-Sent Events (SSE) / Event Stream

The server will automatically handle the MCP protocol negotiation and provide access to all configured tools.

## Diagnostics Schema & Metrics

Diagnostics JSON produced by `mcp_diagnose.sh --json` conforms to the Zod contract `diagnosticsResultSchema`
and the published JSON Schema at `schemas/diagnostics.schema.json`. Programmatic access / validation can be
performed via:

```ts
import { runDiagnostics, generatePrometheusMetrics } from '@cortex-os/agent-toolkit';
const result = await runDiagnostics();
console.log(result.summary.overall);
console.log(generatePrometheusMetrics(result));
```

Prometheus exposition lines map to overall + per-component states and latency histogram (if latency present).

## CI Integration

A lightweight GitHub Actions workflow (`.github/workflows/mcp-tunnel-validate.yml`) runs
`validate_cloudflare_tunnel.sh` in CI to prevent regressions in tunnel config. Locally you can
simulate the CI checks with:

```bash
pnpm ci:mcp:tunnel-validate
```

For a full local pre-flight before exposing the service externally:

```bash
pnpm mcp:diagnose      # invokes scripts/mcp/mcp_diagnose.sh
```

These commands surface clear non-zero exit codes to fail fast in automation pipelines.
