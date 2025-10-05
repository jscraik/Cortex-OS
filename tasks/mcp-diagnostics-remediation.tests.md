# MCP Diagnostics Remediation — Test Evidence

**Date:** 2025-10-05

| Command | Status | Notes |
| --- | --- | --- |
| `pnpm mcp:smoke` | ✅ Pass | Confirmed new smoke script detects guard & health scripts. Fallback to JSON stringify logged with brAInwav branding; exit code 0. |
| `pnpm mcp:test` | ✅ Pass | New harness runs `vitest` via package config (no specs yet but exits 0). Output prefixed with `[brAInwav][mcp:test]`. |
| `pnpm mcp:diagnose` | ⚠️ Actionable failure | Guard reports port 3024 blocked by LaunchAgent-managed Node process; health probe retries and reports recovery failure (LaunchAgent available). Tunnel validator now executable but `cloudflared` not running locally, so exit 126 pre chmod -> retested after chmod: pending follow-up once tunnel configured. Overall exit code 1 by design. |
| `LOCAL_MEMORY_BASE_URL=http://127.0.0.1:3024 pnpm ci:mcp:status` | ⚠️ Actionable failure | Validator reaches endpoint but receives HTTP 400; indicates server rejects `ping` payload. Requires contract alignment with MCP server. |

## Observations

- Guard script now surfaces blocking PID with `[brAInwav guard]` branding and supports `--force` (tested manually).
- Health probe writes `/Users/jamiecraik/.Cortex-OS/logs/mcp-health-probe.log` entries using ISO timestamps.
- LaunchAgent restart attempt triggers automatically when the initial ping fails.
- Smoke/test automation now exist so higher-level workflows no longer crash with missing file errors.
- MCP status validator needs updated payload once HTTP contract documented.
