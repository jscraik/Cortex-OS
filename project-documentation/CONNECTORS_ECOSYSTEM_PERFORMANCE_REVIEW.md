# brAInwav Cortex-OS Connectors Ecosystem Performance Review

## Scope & Objectives
- Assess current performance characteristics for the Connectors Python runtime, manifest pipeline, Apps widget serving, and MCP integrations.
- Identify bottlenecks affecting cold start, steady-state latency, throughput, and observability.
- Recommend actionable improvements aligned with the 250 ms p95 latency and 800 ms cold-start budgets defined in `packages/connectors/AGENTS.md`.

## Current Architecture Snapshot
- **Server lifecycle**: `create_app` wires logging/tracing, loads the manifest via `ConnectorRegistry.refresh`, and serves FastAPI routes for `/health`, `/v1/connectors/service-map`, `/v1/connectors/stream`, and optional Prometheus metrics.【F:packages/connectors/src/cortex_connectors/server.py†L17-L92】
- **Registry**: `ConnectorRegistry` lazily loads manifests, caches Prometheus gauge state, and materializes service-map payloads with embedded brand metadata and connector counts.【F:packages/connectors/src/cortex_connectors/registry.py†L23-L83】
- **SSE loop**: `connector_status_stream` polls `registry.service_map()` at a fixed interval (default 15 s), yielding full payloads for each event regardless of change frequency.【F:packages/connectors/src/cortex_connectors/sse.py†L9-L27】
- **Manifest utilities**: Manifest loading walks multiple candidate paths synchronously, validates via Pydantic, and signs payloads with deterministic JSON serialization for downstream verification.【F:packages/connectors/src/cortex_connectors/manifest.py†L34-L95】
- **Service-map assembly**: Connectors are sorted by ID, metadata is brand-padded, TTLs are normalized to the tightest bound, and authentication headers are merged to produce the payload returned over HTTP/SSE.【F:packages/connectors/src/cortex_connectors/models.py†L147-L214】

## Observed Performance Characteristics
1. **Cold start path is blocking and sequential**
   - `create_app` calls `_refresh_registry_best_effort`, which synchronously parses the manifest, performs schema validation, and updates gauges before the server finishes booting.【F:packages/connectors/src/cortex_connectors/server.py†L29-L47】【F:packages/connectors/src/cortex_connectors/registry.py†L39-L65】
   - The manifest loader reads candidate files serially and repeats JSON parsing and validation even when the manifest is unchanged between restarts.【F:packages/connectors/src/cortex_connectors/manifest.py†L55-L95】
   - Impact: cold start creeps toward the 800 ms budget as manifest size grows or when IO is remote (e.g., network-mounted config).

2. **Steady-state service-map requests duplicate expensive work**
   - Each `/v1/connectors/service-map` request rebuilds the payload and signature, regardless of prior calls, and re-computes metadata counts on every invocation.【F:packages/connectors/src/cortex_connectors/registry.py†L71-L83】
   - Signing requires JSON serialization with sorted keys for HMAC; repeated per-request signing adds CPU overhead, especially under SSE fan-out.

3. **SSE streaming is tight-looped on `asyncio.sleep` without change detection**
   - The stream reuses the same `registry.service_map()` call, re-signing and materializing full payloads every interval even when no manifest data changed.【F:packages/connectors/src/cortex_connectors/sse.py†L9-L27】
   - Clients receive identical payloads, creating unnecessary network/CPU usage and limiting the ability to shorten the interval for fresher updates.

4. **Metrics exposure depends on synchronous manifest validation**
   - `/metrics` requires the manifest to be readable and valid on every scrape; if validation is slow or the manifest is large, Prometheus scrapes can contend with API requests.【F:packages/connectors/src/cortex_connectors/server.py†L64-L90】
   - Gauge updates happen only when `refresh` executes; there is no background reconciliation to reset stale gauges if the manifest is modified externally without hitting an API endpoint.

5. **Manifest refresh lacks inotify-style reloading and mutation isolation**
   - Registry refresh is only triggered at startup and when endpoints call `service_map`. No FS watcher or TTL-based refresh exists, so operators rely on manual restarts, hindering timely rollout and causing potential thundering herds upon restart.

6. **Apps widget static serving has no caching headers or compression toggles**
   - Static assets are mounted via `StaticFiles` without explicit caching headers or gzip/brotli support, causing repeated full downloads of dashboard bundles under cross-tab usage.【F:packages/connectors/src/cortex_connectors/server.py†L92-L107】

## Recommendations & Prioritization

### Immediate (Sprint-level)
1. **Introduce manifest caching with TTL + ETag**
   - Cache the parsed manifest and service-map payload/signature, invalidating when the manifest file mtime or content hash changes.
   - Serve `/v1/connectors/service-map` responses from cache, recomputing only when invalidated. Share the cached payload with SSE to avoid duplicate work.

2. **Asynchronous manifest refresh**
   - Move `_refresh_registry_best_effort` to a background task executed after the app mounts, returning a temporary 503 with cached error details if the manifest is not yet ready. This keeps cold-start within budget even for large manifests.

3. **SSE diffing and heartbeat framing**
   - Track the last-sent signature and skip emitting full payloads when unchanged; send lightweight heartbeats to maintain connections. Optionally provide a delta mode for large manifests.

4. **Static asset caching directives**
   - Configure `StaticFiles` with immutable caching headers (e.g., `Cache-Control: public, max-age=86400`) and ensure build output is fingerprinted. Add gzip/brotli middleware when available.

### Near-term (Quarterly OKR)
1. **File-watch based manifest refresh**
   - Use `watchfiles`/`watchdog` to detect manifest edits and refresh the registry asynchronously, updating gauges and cached payloads without manual intervention.

2. **Parallel manifest validation**
   - For manifests with many connectors, chunk validation (headers, quotas) via asyncio tasks or threadpool, retaining deterministic ordering before serialization.

3. **Metrics snapshot decoupling**
   - Snapshot gauge state when the manifest cache updates so `/metrics` serves precomputed text, minimizing work during Prometheus scrapes.

4. **Expose performance telemetry**
   - Emit spans for manifest parse duration, signing time, and SSE broadcast latency to track regressions and verify improvements with OTEL exporters.【F:packages/connectors/src/cortex_connectors/telemetry.py†L1-L120】

### Longer-term
1. **Connector health aggregation service**
   - Move manifest parsing/signing into a dedicated background worker that publishes signed payloads to Redis or an event bus, letting HTTP/SSE consumers fetch pre-signed blobs.

2. **Incremental connector updates**
   - Store connectors in a lightweight store (SQLite/Badger) with versioned entries, enabling delta-based SSE updates and targeted cache invalidation.

3. **Horizontal scaling playbook**
   - Document load balancing strategy for SSE fan-out and provide sticky-session guidance or leverage shared pub/sub for streaming connectors status across replicas.

## Testing & Instrumentation Gaps
- Add targeted benchmarks (pytest markers) for manifest load times and service-map serialization to guard budgets.
- Extend existing tests to cover caching correctness, SSE diffing behavior, and manifest watcher fallout scenarios.
- Integrate structured logging assertions ensuring new telemetry spans carry `brand:"brAInwav"` and request IDs.

## Next Steps
1. Draft a TDD plan capturing cache layer design, SSE diffing strategy, and watcher integration checkpoints.
2. Align with Observability team on new OTEL span naming and exporters before implementation.
3. Coordinate with Security to review caching of signed payloads and ensure secrets (e.g., auth headers) remain scoped.
4. Track work under a follow-up epic and update the connectors runbooks with revised operational procedures once improvements land.
