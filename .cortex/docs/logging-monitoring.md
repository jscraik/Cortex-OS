# Logging & Monitoring

- Logs use pino and are stored under `logs/`.
- Metrics are exported via OpenTelemetry to configured backends.
- Configure `OTEL_EXPORTER_OTLP_ENDPOINT` for remote collectors.
