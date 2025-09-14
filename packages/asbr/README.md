# @cortex-os/asbr

Agentic Second-Brain Runtime (ASBR).

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

* `X-RateLimit-Limit`
* `X-RateLimit-Remaining`
* `Retry-After` (only on 429)

Integration tests assert 429 behavior when capacity is exceeded.
