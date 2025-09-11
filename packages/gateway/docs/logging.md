# Logging & Monitoring

- The gateway uses Fastify's logger; set `DEBUG=*` or `LOG_LEVEL=info` for runtime logs.
- Prometheus metrics are available at `/metrics` when `ENABLE_METRICS=true`.
- Integrate with Grafana or other observability tools for dashboards and alerts.
