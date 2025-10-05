# MCP Diagnostics Remediation — Operator Notes

**Brand:** brAInwav
**Last Updated:** 2025-10-05

## Port Guard Usage

- Primary command: `./scripts/mcp/guard_port_3024.sh`
- Options:
  - `--force` terminates blocking processes (used when LaunchAgent safe to
    restart).
  - `--restart` reloads the LaunchAgent if it owned the port at the start of the
    force operation.
  - `--json` outputs structured summary for automation with `launchAgent`
    metadata (label, domain, bootout/restart status).
  - `--label`, `--domain`, and `--plist` override LaunchAgent discovery when it
    deviates from defaults.
- Expected messages include `[brAInwav guard] port 3024 is free` when unoccupied
  or `blocked by PIDs` when conflict detected. With JSON, the response includes
  a `status` of `ok`, `blocked`, or `cleared` plus LaunchAgent lifecycle notes.
- Use `pnpm mcp:diagnose --force-guard` if the guard should clear the port before running health checks.

## Health Probe Expectations

- Script path: `scripts/mcp/health_probe.sh`.
- Writes detailed logs to `/Users/jamiecraik/.Cortex-OS/logs/mcp-health-probe.log` with ISO timestamps.
- Requires `curl`; if not installed, probe logs a `status=skipped` entry and exits successfully for automation.
- LaunchAgent label assumed: `com.cortexos.mcp.server`.
- Adjust `MCP_PORT`, `MCP_HOST`, or `MCP_TRANSPORT_PATH` via environment variables when the server listens elsewhere.

## Smoke/Test Harness

- `pnpm mcp:smoke` now verifies guard and health scripts exist and are executable.
- Failures surface under `[brAInwav] MCP smoke check detected issues.`
- `pnpm mcp:test` wraps Vitest with `--passWithNoTests`. Forward extra Vitest args using `pnpm mcp:test -- --runInBand` if needed.

## Status Validator Configuration

- Provide HTTP endpoint via one of the following env vars (order of precedence):
  - `MCP_ENDPOINT`
  - `LOCAL_MEMORY_MCP_ENDPOINT`
  - `LOCAL_MEMORY_BASE_URL` (auto-appends `/mcp`)
- Example for local HTTP endpoint: `LOCAL_MEMORY_BASE_URL=http://127.0.0.1:3024 pnpm ci:mcp:status`.
- For strict tool validation, set `MCP_STATUS_EXPECT_TOOLS="tool.name,another.tool"` and optionally `MCP_STATUS_VALIDATE_TOOL`.
- Non-200 responses raise actionable warnings; HTTP 400 indicates the MCP server rejected the JSON-RPC payload.

## Tunnel Validation Preparation

- Ensure `scripts/mcp/validate_cloudflare_tunnel.sh` is executable (`chmod +x`).
- The validator expects Cloudflare tunnel config at `config/cloudflared/mcp-tunnel.yml`
  referencing service `http://localhost:3024`; mismatches emit warnings but do
  not block quick tunnel fallback.
- When `cloudflared` is available, the validator auto-starts a quick tunnel if
  none is running. Status values: `operational`, `skipped`, or `error` with
  reason codes. JSON mode returns structured details consumed by
  `pnpm mcp:diagnose`.
- Metrics check runs against `http://127.0.0.1:46889/metrics` when available.
- Without a running `cloudflared` binary, the validator reports
  `status=skipped` and exits `0`, enabling diagnostics to continue while
  documenting remediation steps.
