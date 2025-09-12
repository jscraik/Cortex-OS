# Configuration

Environment variables control exporters:

- `TRACE_EXPORTER`: `otlp` (default), `jaeger`, `console`
- `METRIC_EXPORTER`: `otlp` (default), `console`

Example `.env`:
```env
TRACE_EXPORTER=jaeger
METRIC_EXPORTER=otlp
```
