# Logging & Monitoring

- Logs are written to `~/.mcp/logs` and can be tailed with `mcp-server logs`.
- Metrics are exposed on `/metrics` for Prometheus scraping.
- Enable tracing by setting `OTEL_EXPORTER_OTLP_ENDPOINT` and running with `--opentelemetry`.
