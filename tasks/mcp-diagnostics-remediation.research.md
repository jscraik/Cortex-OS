# MCP Diagnostics Remediation — Research Log (Phase 2)

**Context Window:** 2025-10-06
**Brand:** brAInwav

## Observations

- Port **3024** remains occupied by a LaunchAgent-managed Node.js process labeled
  `com.cortexos.mcp.server`, even when `scripts/mcp/guard_port_3024.sh --force`
  succeeds in issuing `kill` to the reported PID. The LaunchAgent auto-restarts
  the server when `KeepAlive` is enabled, so the port closes only momentarily
  before being reclaimed.
- `scripts/mcp/start-mcp-server.sh` confirms the FastMCP server launches via
  Node.js with HTTP Stream transport listening on port **3024** and endpoint
  `/mcp`. The script logs Cloudflare tunnel requirements but does not
  coordinate with the guard script.
- `pnpm ci:mcp:status` still posts an HTTP payload `{ name: "ping" }` to the
  `/mcp` endpoint. The FastMCP HTTP Stream expects JSON-RPC 2.0 framing,
  leading to the observed **HTTP 400** responses instead of a ping
  acknowledgement.
- Cloudflare tunnel validation (`scripts/mcp/validate_cloudflare_tunnel.sh`)
  requires a live `cloudflared` process bound to port 3024; no automation
  currently ensures the tunnel is launched prior to diagnostics.

## Research Conclusions

1. **Port Guard Enhancement:** `--force` mode must either disable or unload the
   LaunchAgent (`launchctl bootout`) _before_ attempting to kill the active
   PID; otherwise the agent respawns immediately. After remediation, the guard
   should optionally restart the LaunchAgent when it originally managed the
   port.
2. **JSON-RPC Alignment:** The MCP status validator has to transmit a JSON-RPC
   2.0 message, e.g. `{ "jsonrpc": "2.0", "method": "ping", "id":
   "diagnostic-ping" }`, or the FastMCP server must accept the legacy
   `{ name: "ping" }` payload. Adjusting the validator preserves protocol
   fidelity and avoids server changes.
3. **Tunnel Workflow:** Diagnostics must detect when the Cloudflare tunnel is
   absent and guide the operator to run the existing tunnel script, while still
   reporting a branded status (likely `skipped` with remediation steps).

## Remediation Outcomes

- `scripts/mcp/guard_port_3024.sh --force --restart` now boots out
  `com.cortexos.mcp.server`, terminates blockers, and optionally restarts the
  LaunchAgent with branded logs or JSON summaries.
- `scripts/mcp/validate_cloudflare_tunnel.sh` automatically launches a quick
  Cloudflare tunnel when `cloudflared` is present, produces JSON output, and
  marks the step `skipped` instead of failing when dependencies are missing.
- `tools/validators/mcp-status.mjs` issues JSON-RPC `ping`, `tools/list`, and
  `tools/call` requests so `pnpm ci:mcp:status` no longer triggers HTTP 400
  responses from the FastMCP endpoint.
- `scripts/mcp/mcp_diagnose.sh` records the tunnel validator payload and treats
  `skipped` tunnel states as success, allowing `overallExitCode` to remain `0`
  when Cloudflare is intentionally offline.

## Open Questions / Follow-ups

- Should the guard automatically relaunch the LaunchAgent after diagnostics
  when `--restart` is not provided, or should reactivation remain opt-in =NO
- Can we integrate tunnel startup into `pnpm mcp:diagnose --fix` or provide an
  explicit helper script under `scripts/mcp/` to reduce manual steps?
- Does any external consumer rely on the legacy ping payload? Verify before
  removing compatibility entirely.

**Next Actions:** Update the TDD plan checklist, enhance guard behavior, align
the validator’s payload, and document Cloudflare tunnel workflow improvements.
