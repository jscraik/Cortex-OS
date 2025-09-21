# Prometheus + Grafana Setup (Local & CI)

This guide shows how to expose and visualize RAG metrics using Prometheus and Grafana.

## Prerequisites

- Node.js 20+
- `pnpm` installed
- RAG service emitting Prometheus metrics (via `@cortex-os/observability` Prometheus exporter)

## Option A: macOS (Homebrew)

1. Install services:

```bash
brew install prometheus grafana
```

1. Configure Prometheus to scrape the RAG exporter endpoint (default: `http://localhost:9464/metrics`):

Create `prometheus.yml` (or edit `/opt/homebrew/etc/prometheus.yml`):

```yaml
scrape_configs:
  - job_name: cortex-rag
    static_configs:
      - targets: ["localhost:9464"]
```

1. Start services:

```bash
brew services start prometheus
brew services start grafana
```

1. Grafana UI: http://localhost:3000
   - Default creds: `admin` / `admin` (change on first login)
   - Add Prometheus data source: URL `http://localhost:9090`
   - Import dashboard: `docs/observability/rag-dashboard.json`

## Option B: Docker Compose (Observability profile)

If you use the repo's compose files:

```bash
pnpm dev:orbstack:obs
```

This starts Prometheus + Grafana (and other observability services if configured). Then:
- Grafana at http://localhost:3001 (see compose env for creds)
- Prometheus at http://localhost:9090
- Add or verify data source pointing to Prometheus
- Import `docs/observability/rag-dashboard.json`

## CI Dashboard Artifacts

Export the RAG Grafana dashboard JSON to CI artifacts:

```bash
pnpm ci:dashboards
# Output: reports/grafana/dashboards/rag-dashboard.json
```

Use your CI system to upload `reports/grafana/dashboards/` as an artifact for each run.

## Metric Names (reference)

- `cortex_latency_ms_bucket` (histogram)
  - `operation`: e.g., `rag.retrieve.embed_ms`, `rag.retrieve.query_ms`, `rag.retrieve.total_ms`, `rag.reranker.total_ms`, `rag.ingest.*`
  - `component`: `rag`
- `cortex_operations_total` (counter)
  - `operation`: e.g., `rag.retrieve`, `rag.reranker`, `rag.retrieve_and_rerank`, `rag.ingest`
  - `status`: `success|failure`
  - `component`: `rag`

These align with `docs/observability/rag-dashboard.json` panels.

## Troubleshooting

- No metrics visible:
  - Ensure the RAG process started with Prometheus exporter enabled and the endpoint is reachable
  - Check Prometheus targets page (http://localhost:9090/targets) for scrape status
- Dashboard panels empty:
  - Verify metric names and labels match your environment
  - Confirm Grafana data source is Prometheus and queries return data in Explore
- Port conflicts:
  - Adjust exporter port via env var and update `prometheus.yml` accordingly
