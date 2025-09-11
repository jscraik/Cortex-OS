<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

Alloy Integration for Cortex-OS (Grafana Cloud)

Overview
- Scrapes the Cortex-OS gateway Prometheus endpoint (`/metrics`) and forwards to Grafana Cloud Metrics.
- Keeps Alloy self-metrics for health. Optional Loki logs are outlined but not enabled by default.

Do not commit secrets. Use environment variables when rendering the config.

Env vars
- GCLOUD_HOSTED_METRICS_URL (e.g., https://prometheus-prod-XX.grafana.net/api/prom/push)
- GCLOUD_HOSTED_METRICS_ID (Grafana Cloud metrics username, numeric ID)
- GCLOUD_RW_API_KEY (Grafana Cloud API key with metrics push permissions)
- SCRAPE_INTERVAL (default 15s)
- GATEWAY_ADDR (default localhost:3333)

Quick start (macOS Homebrew)
1) Install Alloy
   brew install grafana/grafana/alloy

2) Export credentials (never commit these):
   export GCLOUD_HOSTED_METRICS_URL="https://prometheus-prod-36-prod-us-west-0.grafana.net/api/prom/push"
   export GCLOUD_HOSTED_METRICS_ID="2649479"
   export GCLOUD_RW_API_KEY="<redacted>"
   export SCRAPE_INTERVAL="15s"
   export GATEWAY_ADDR="localhost:3333"

3) Render config
   node ops/observability/alloy/render-config.mjs

4) Install config and start Alloy
   CONFIG_PATH=$(brew --prefix)/etc/alloy/config.alloy
   sudo mkdir -p "$(dirname "$CONFIG_PATH")"
   sudo cp ops/observability/alloy/config.alloy "$CONFIG_PATH"
   brew services restart alloy

Notes
- Verify ingestion in Grafana Cloud (Metrics Explorer). Look for metrics:
  - http_request_duration_ms
  - http_request_errors_total
  - process metrics from Alloy itself
- The template keeps a narrow allowlist of metrics to reduce cardinality.
- To enable additional exporters (node_exporter, Loki), extend the template as needed.
