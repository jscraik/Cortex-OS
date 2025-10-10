# MCP HTTP & Telemetry Hardening — Review Notes (2025-10-10)

**Owner**: Cortex-OS MCP Team  
**Related TDD Plan**: [`docs/reviews/2025-10-10-mcp-auth-hardening.tdd.md`](./2025-10-10-mcp-auth-hardening.tdd.md)

## Summary

- Enforced **startup guard for HTTP transport** — `MCP_API_KEY` must be present when `resolveTransport()` selects HTTP. Startup now aborts early with `http_auth_missing` logging guidance to set the key or run with `MCP_TRANSPORT=stdio`.
- Replaced placeholder resource responses with the **resource provider pipeline**. `packages/mcp` now validates `resources/read` params via Zod, supports static payloads, and surfaces branded errors when providers fail. Repository reads return actual file contents from the workspace allowlist.
- **Unified logging and telemetry** across base server, notification handler, and refresh tool using Pino + `@cortex-os/mcp-bridge` metrics. Logs include correlation IDs and queue diagnostics.
- Hardened notification flow with **back-pressure warnings** (`notification_backpressure` at queue size ≥3) and durable error logging (`notification_processing_failed`).
- Added regression tests for HTTP auth guard, resource retrieval, notification resilience, and feature toggles (`MCP_PROMPTS_ENABLED`, `MCP_RESOURCES_ENABLED`).

## Operator Runbook

1. **HTTP transport boot failure**
   - Symptom: startup exits with `[brAInwav] MCP_API_KEY is required for HTTP transport...`
   - Action: provision `MCP_API_KEY`, restart service. For local debug, set `MCP_TRANSPORT=stdio` explicitly.
2. **Fallback / rollback**
   - Toggle transport to STDIO via `export MCP_TRANSPORT=stdio` to restore previous behaviour.
   - Prompts/resources can be disabled via `MCP_PROMPTS_ENABLED=false` or `MCP_RESOURCES_ENABLED=false` to reduce surface during incident response.
3. **Telemetry checkpoints**
   - Auth metrics exposed at `/metrics` contain `brainwav_mcp_http_auth_attempt_total{outcome=...}`.
   - New logs: `notification_backpressure`, `notification_processing_failed`, `resource_read_{started,completed,failed}`.
4. **Resource provider diagnostics**
   - `resource_read_failed` includes correlation IDs for tracing provider errors.
   - 501 errors indicate missing content handlers; register providers or disable feature via `MCP_RESOURCES_ENABLED=false`.

## Tests Executed

```bash
pnpm vitest run packages/mcp-server/src/__tests__/transport-http-auth.guard.test.ts
pnpm vitest run packages/mcp-server
pnpm vitest run packages/mcp/src/__tests__/server.resources.test.ts
pnpm vitest run packages/mcp/src/__tests__/notificationHandlers.test.ts
```

_Notes_: Workspace-wide suites (`pnpm vitest run packages/mcp`) intentionally fail due to legacy RED tests (unchanged); targeted suites above cover the new functionality.

## Follow-Up

- Update deployment playbooks to reference the new auth check and telemetry events.
- Monitor production logs for `notification_backpressure` to validate queue thresholds under load.
- Evaluate raising coverage thresholds on notification handlers now that structured logger is in place.
