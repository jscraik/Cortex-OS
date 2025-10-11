# Implementation Plan — Vibe Check MCP (brAInwav)

See code-change-planner output. Summary:
1) Client: src/mcp/clients/vibe-check-client.ts (HTTP call to /tools/call; constitution helpers).
2) Guard: src/operational/vibe-check-guard.ts; call before side-effects; emit brAInwav audit.
3) services.ts: wrap orchestration.run; env VIBE_CHECK_HTTP_URL (default http://127.0.0.1:2091).
4) Tests: unit + integration; mock HTTP.
5) Docs: AGENTS.md mandate; README section; ports.env comment var.
6) Rollout: warn-only → strict.
