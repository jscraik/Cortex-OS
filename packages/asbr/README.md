# @cortex-os/asbr

⚠️ Deprecation Notice

This package is deprecated in favor of the ASBR‑lite runtime mounted under `apps/cortex-os`.

Migration guidance:

- Preferred runtime: `apps/cortex-os` (ASBR‑lite)
- API parity: The HTTP API and auth model are aligned in ASBR‑lite; new
  features land there first.
- Timeline: Deprecated as of 2025‑02. Package removal is planned after consumers
  migrate and CI is green. No breaking removals will occur without a prior
  deprecation window.
- What to do: Start new work against `apps/cortex-os`. For existing code,
  switch imports/usages to the ASBR‑lite surface and run the smart Nx gates
  (`pnpm build:smart && pnpm test:smart`).

Runtime startup will emit a one‑time deprecation warning with a pointer to
ASBR‑lite to help guide migration.

## Build

```bash
pnpm --filter @cortex-os/asbr build
```

Compiled JavaScript is emitted to the `dist/` directory and used by the package entry points and CLI.

## Configuration

Environment / programmatic options (partial list):

| Setting | Env Var | Default | Description |
|---------|---------|---------|-------------|
| Rate Limit Enabled | `ASBR_RATE_LIMIT_ENABLED` (planned) | true | Toggle token bucket limiter. Disabled automatically under test. |
| Rate Limit Capacity | `ASBR_RATE_LIMIT_CAPACITY` | 50 | Maximum tokens per identity (auth header or IP). |
| Rate Limit Refill (tokens/sec) | `ASBR_RATE_LIMIT_REFILL` | 0.416... | Refill rate (25 per minute). |
| Cache TTL (ms) | config file `cache_ttl_ms` | 30000 | Controls in-memory cleanup cadence. |

## Tracing

Requests accept an optional `traceparent` header (W3C Trace Context). If absent or malformed a new value is synthesized. The `traceparent` is:

1. Echoed back on task creation and retrieval.
2. Propagated into emitted task events (`Event.traceparent`).
3. Available to downstream consumers for cross-service correlation.

Traceparent format enforcement includes contract tests for valid/invalid values.

## Rate Limiting

Token bucket limiter (disabled in test) attaches the following headers when active:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `Retry-After` (only on 429)

Integration tests assert 429 behavior when capacity is exceeded.
