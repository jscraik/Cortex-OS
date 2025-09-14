# Configuration

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port for the schema registry service | `3000` |
| `DATABASE_PATH` | Path to SQLite database file | `:memory:` |
| `SCHEMA_SVC_SMOOTHING` | Enable burst smoothing middleware | `true` |
| `SMOOTH_RATE_PER_SEC` | Tokens added per second (sustained throughput) | `10` |
| `SMOOTH_BURST` | Bucket capacity allowing initial burst | `20` |
| `RATE_LIMIT` | Simple IP rate limit (requests per window) | `50` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiter window duration | `60000` |
| `QUOTA_GLOBAL_LIMIT` | Global quota cap per window | `500` |
| `QUOTA_WINDOW_MS` | Global quota window | `60000` |
| `SCHEMA_SVC_GLOBAL_QUOTA` | Enable global quota middleware | `true` |
| `SCHEMA_SVC_PER_AGENT_QUOTA` | Enable per-agent quota middleware | `true` |
| `PER_AGENT_GLOBAL_LIMIT` | Shared global limit used with per-agent quota | inherits `QUOTA_GLOBAL_LIMIT` |
| `PER_AGENT_LIMIT` | Per-agent allowed requests per window | `100` |
| `PER_AGENT_WINDOW_MS` | Per-agent quota window | inherits `QUOTA_WINDOW_MS` |
| `SCHEMA_SVC_REDACT_PATHS` | Comma list of paths to redact in responses | `schema.secret,schema.credentials` |
| `ENABLE_PROM_METRICS` | Expose `/metrics/prom` in Prometheus text format | `false` |
| `REDIS_URL` | Enable Redis-backed quota store when set | _unset_ |
| `REDIS_QUOTA_PREFIX` | Key prefix for Redis quota entries | `quota` |
| `ENABLE_IDEMPOTENCY` | Enable bus idempotency layer (dedupe by id) | `true` |
| `IDEMPOTENCY_TTL_MS` | TTL for idempotency cache entries | `300000` |
| `AUTO_CORRELATION` | Auto-generate correlationId if missing | `true` |

### Middleware Ordering

The service applies middleware in this order for deterministic control and resource fairness:

1. Burst Smoothing (token bucket) – smooths spikes early, cheapest rejection.
2. Rate Limiter (IP) – coarse protection against abusive sources.
3. Global Quota – enforces macro-level consumption budget.
4. Per-Agent Quota – isolates tenants/agents.
5. ACL Gate – authorization (only reached after cost controls succeed).
6. Handlers – core logic.
7. Redaction – final response sanitation.

This sequence ensures expensive logic (ACL checks, handler work, JSON build) only executes after cheaper controls accept the request.

### Metrics Endpoint

`GET /metrics` returns JSON:

```jsonc
{
    "uptimeMs": 12345,
    "smoothing": { "accepted": 42, "rejected": 3, "buckets": 2 },
    "config": {
        "ratePerSec": 10,
        "burst": 20,
        "rlLimit": 50,
        "rlWindow": 60000,
### Prometheus Metrics (Optional)

When `ENABLE_PROM_METRICS=true`, the service exposes `/metrics/prom` with live counters:

```text
# HELP a2a_bus_events_total Total events published
# TYPE a2a_bus_events_total counter

# HELP a2a_bus_duplicates_dropped_total Total duplicate events dropped by idempotency
# TYPE a2a_bus_duplicates_dropped_total counter
Disable with `ENABLE_IDEMPOTENCY=false` and tune cache expiry via `IDEMPOTENCY_TTL_MS`.
# HELP a2a_quota_global_reject_total Total requests rejected due to global quota
# TYPE a2a_quota_global_reject_total counter
Details:
# HELP a2a_quota_agent_reject_total Total requests rejected due to per-agent quota
# TYPE a2a_quota_agent_reject_total counter

```

Details:

* Bus counters increment on publish (accepted) and duplicate drop.
* Quota counters increment only when a 429 is returned.
* Counters are process-local; for multi-instance aggregation integrate
    `prom-client` plus scraping or emit events for aggregation.
* No labels yet -> minimal cardinality risk; add bounded labels later
    (`service`, `env`).

### Idempotency & Correlation (Bus)

The internal bus supports idempotent processing (deduplicates by `id`). Disable with
`ENABLE_IDEMPOTENCY=false`; tune cache expiry via `IDEMPOTENCY_TTL_MS`.

If `AUTO_CORRELATION=true`, envelopes missing `correlationId` are assigned their own
`id` as the root correlation. Existing `correlationId` values are preserved.

### Redis Quota Backend

Set `REDIS_URL` to switch quota & per-agent quota middleware to a Redis-backed store for horizontal scaling.
Optional `REDIS_QUOTA_PREFIX` controls key namespace.
If connection fails it falls back to in-memory automatically.

## Rate Limiter Options

The rate limiter middleware accepts the following options:

* `limit` (requests per window, default `5`)
* `windowMs` (window size in milliseconds, default `60000`)

Customize by creating a new limiter:

```ts
import { createRateLimiter } from '@cortex-os/a2a-common';
app.use(createRateLimiter({ limit: 10, windowMs: 30_000 }));
```
