# Logging & Monitoring

PRP Runner uses the `debug` package for verbose logs. Enable it via:

```bash
DEBUG=prp-runner:* pnpm -C packages/prp-runner demo:semsearch ...
```

Integrate with external observability platforms by forwarding console output or attaching custom log handlers in your application.

## Metrics

The service exposes Prometheus-compatible metrics at the `GET /metrics` endpoint, protected by an
API key in the `X-API-Key` header. Set `METRICS_KEY` in the environment to enable access.

Key series include:

- `http_requests_total{path,status}` – count of HTTP requests by route and status
- `http_request_duration_seconds_count|_sum{path,status}` – total count and summed seconds
- `ai_operations_total{tool}` – count of AI tool invocations
- `ai_operation_duration_seconds_count|_sum{tool}` – duration histogram aggregates
- `breaker_state_total{target,state}` – circuit breaker transitions for downstreams
  - `target`: `ollama` | `mlx`
  - `state`: `closed` | `open` | `half-open`
- `breaker_events_total{target,event}` – breaker-related events (e.g., failures)

Example scrape:

```bash
curl -H "X-API-Key: $METRICS_KEY" http://localhost:3000/metrics
```

See also: configuration of circuit breaker thresholds/timeouts under the AI section in
`docs/configuration.md` (search for "breakers" and env flags).

## Rate Limiting (Redis optional)

PRP Runner applies sliding-window rate limiting for key endpoints. By default, an in-memory store
is used. To enable distributed rate limiting in clustered deployments, configure Redis via:

- `PRP_REDIS_URL` (preferred) or `REDIS_URL`

When set, the limiter uses a Redis Sorted Set per bucket (keyed by scope + API key/IP) and enforces
the same limits across instances. On Redis errors, the limiter fails open to avoid outages.

Admin users (role `admin`) bypass rate limiting. Supply role via an API key with `admin` role or by
setting the `X-Role: admin` header in trusted environments.

## Admin Endpoints (API Key Management)

The service exposes minimal admin endpoints for API key lifecycle management:

- `GET /admin/keys` – List existing keys (requires admin)
- `POST /admin/keys` – Create a new key `{ role: 'admin' | 'user', label?: string }` (requires admin)
- `DELETE /admin/keys/:key` – Revoke a key (requires admin)

Authentication: Protected by the standard auth middleware. Provide an admin API key or the header
`X-Role: admin` for local testing. Keys are stored in JSON at `data/api-keys.json` by default and
can be overridden via `PRP_API_KEYS_FILE`.
