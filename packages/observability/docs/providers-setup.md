# Providers Setup

Configure external collectors with environment variables:

- `OTEL_EXPORTER_OTLP_ENDPOINT` – OTLP collector URL
- `JAEGER_ENDPOINT` – Jaeger HTTP endpoint when `TRACE_EXPORTER=jaeger`

Ensure these variables are set in your deployment environment.
