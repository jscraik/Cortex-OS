---
title: Logging
sidebar_label: Logging
---

# Logging & Monitoring

- The gateway uses Fastify's logger; set `DEBUG&#61;*` or `LOG_LEVEL&#61;info` for runtime logs.
- Prometheus metrics are available at `/metrics` when `ENABLE_METRICS&#61;true`.
- Integrate with Grafana or other observability tools for dashboards and alerts.
