# MCP Diagnostics Remediation TDD Plan

## Objective

Restore Cortex-OS MCP installation health on macOS by fixing guard and health scripts,
ensuring smoke and verification tooling exists, and validating the Cloudflare tunnel plus
endpoint configuration.

## Constraints & Assumptions

- Must comply with brAInwav governance (no default exports, async/await usage, 40-line limit per function).
- Scripts must remain POSIX-compatible and support macOS utilities availability.
- No changes to system architecture or LaunchAgent definitions without explicit approval.
- Existing MCP server expected to run on port 3024 with Cloudflare tunnel optional.

## Requirements Trace

1. Guard script missing (exit 127) → provide deterministic port protection.
2. Guard `--force` must coordinate with LaunchAgent `com.cortexos.mcp.server` so the port stays free.
3. Health probe fails on macOS (`date -Is`) and duplicate logic → normalize timestamp and JSON output.
4. Smoke/test scripts referenced but absent → ensure pnpm commands resolve.
5. Validator lacks endpoint environment and JSON-RPC payload → document, automate configuration, and emit compliant ping.
6. Tunnel validation should bootstrap or gracefully skip Cloudflare when unavailable instead of failing diagnostics.

## Test-First Checklist

1. **Guard Script Restoration**
   - Write failing shell unit via bats or simulate by invoking guard helper (optional manual due to time).
   - Acceptance: `pnpm mcp:diagnose --human --force-guard` reports `ok` with log line noting LaunchAgent bootout when it owned the port.
2. **LaunchAgent Coordination**
   - Manual verification: `launchctl print gui/$UID/com.cortexos.mcp.server` transitions to
     unloaded before guard kills PIDs, then restart when requested.
   - Acceptance: guard `--restart` flag reloads LaunchAgent when previously active and logs
     `[brAInwav guard] launchctl restart restored`.
3. **Health Probe Compatibility**
   - Create regression script run that now prints JSON (no `date` errors) when server absent.
   - Acceptance: `bash scripts/mcp/health_probe.sh --json` exits 0 and returns structured payload with `healthy:false` when server offline.
4. **Smoke/Test Harness Availability**
   - Provide stub or actual script to run TypeScript Vitest selection ensuring non-zero exit
     when failure.
   - Acceptance: `pnpm mcp:smoke` and `pnpm mcp:test` exit 0. If offline, commands should
     emit actionable warning and exit 0 when diagnostics intentionally skipped.
5. **Status Validator Configuration**
   - Document requirement to set `LOCAL_MEMORY_BASE_URL=http://127.0.0.1:3024` (or equivalent).
   - Acceptance: after exporting endpoint, `pnpm ci:mcp:status` reaches server or fails due to
     connectivity while server logs JSON-RPC `ping` request.
6. **Tunnel Resilience**
   - Simulate missing `cloudflared` and confirm validator marks status `skipped` without
     non-zero exit.
   - Acceptance: when `cloudflared` exists but process missing, validator starts quick tunnel
     (or instructs operator) and logs `brAInwav tunnel status: operational` before returning
     success.
7. **Final Verification**
   - `pnpm mcp:diagnose` (JSON) returns `overallExitCode:0` or skip statuses with descriptive rationale.
   - `pnpm mcp:smoke`, `pnpm mcp:test`, `pnpm ci:mcp:status` either succeed or provide actionable message without missing-file errors.

## Implementation Steps

1. Add `scripts/mcp/guard_port_3024.sh` derived from guard template used elsewhere (port check plus optional force kill).
2. Extend guard script to boot out `com.cortexos.mcp.server` LaunchAgent before force-kill, and optionally restart it via `launchctl bootstrap`.
3. Refactor `scripts/mcp/health_probe.sh`:
   - separate logging from time handling,
   - support macOS `date -u +"%Y-%m-%dT%H:%M:%S%z"`,
   - remove the duplicate script chunk, and
   - preserve JSON plus human modes.
4. Introduce `packages/mcp/scripts/smoke/mcp-smoke.mjs` and
   `packages/mcp/scripts/test-mcp.sh` (or adjust package.json commands)
   so they execute minimal Vitest or Node diagnostics.
5. Update `tools/validators/mcp-status.mjs` to emit JSON-RPC compliant payloads and shared helper for invoking tools.
6. Harden `scripts/mcp/validate_cloudflare_tunnel.sh` to optionally start a quick tunnel,
   emit JSON, and fall back to `skipped` while keeping exit code zero when dependencies
   absent.
7. Update documentation deliverables under `tasks/mcp-diagnostics-*` formats capturing schemas, tests, and instructions.
8. Re-run diagnostics, capture outputs for `CHECKS.json`.

## Rollback Plan

- Scripts added are isolated; remove newly created files and revert modifications if regressions occur.
- Keep backups by relying on git revert.

## Open Questions

- Should tunnel validation be optional when Cloudflare CLI absent? Plan: detect missing
   binary and mark status `skipped` instead of failure. I have installed
- For `ci:mcp:status`, should we set fallback endpoint automatically?
   Possibly derive from `MCP_PORT` as `http://127.0.0.1:${port}/mcp` if none provided.
