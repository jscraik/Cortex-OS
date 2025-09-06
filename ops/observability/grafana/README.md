<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

Local Grafana Provisioning (Dev)

This bundle launches a local Grafana with a pre-provisioned Prometheus datasource and Cortex-OS dashboards.

Prereqs

- Docker/Docker Desktop
- A Prometheus datasource to query:
  - Option A: Local Prometheus at http://localhost:9090 scraping the gateway /metrics
  - Option B: Grafana Cloud Prometheus read API (set basic auth via env)

Start Grafana

- Option A (local Prometheus):
  PROM_URL=http://localhost:9090 docker compose -f ops/observability/grafana/docker-compose.yml up

- Option B (Grafana Cloud read API):
  PROM_URL=https://prometheus-prod-36-prod-us-west-0.grafana.net/api/prom \
  PROM_BASIC_AUTH=true \
  PROM_BASIC_AUTH_USER=2649479 \
  PROM_BASIC_AUTH_PASS=glc_xxxxx \
  docker compose -f ops/observability/grafana/docker-compose.yml up

Dashboards

- Cortex-OS Gateway: ops/observability/grafana/dashboards/gateway.json
- Cortex-OS Gateway (Per Route): ops/observability/grafana/dashboards/gateway-per-route.json

Notes

- Ensure the gateway exposes /metrics (already enabled) and traffic is flowing (k6 quick works well).
- For Grafana Cloud, you must use an API key with metrics read permissions as basic auth password.
