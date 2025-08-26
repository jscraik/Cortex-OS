# MCP Security Audit

## Scope
- Package: `packages/mcp`
- Focus: servers, clients, transports, tool safety

## Checks
| Area | Status | Notes |
|------|--------|-------|
| stdio/http/sse parity | ⚠️ partial | SSE and HTTPS placeholders lack messaging parity |
| capability discovery | ⚠️ partial | Zod schemas defined but dynamic discovery minimal |
| authentication | ✅ | API key warnings for non-stdio transports |
| sandboxing | ✅ default | Policy enables sandbox mode |
| redaction | ❌ missing | No evidence of output redaction |
| rate limits | ❌ missing | Only connection cap present |

## Evidence
- Centralized policy and logging in [`security-policy.ts`].
- Protocol, transport, and policy tests under `packages/mcp/tests`.

## Fix Plan
1. Implement full SSE/HTTPS clients to match stdio features.
2. Add capability discovery handshake for all transports.
3. Enforce sandboxing at runtime and add redaction utilities.
4. Introduce rate limiting (per-tool & global).
5. Expand tests once implementations land.

## Score
**65 / 100** — foundational controls present, but coverage gaps remain.
