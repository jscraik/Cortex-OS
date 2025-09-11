# Architecture

The package is split into loosely coupled components:

- **Core** – orchestrates requests, authentication and routing.
- **Plugins** – loaded from the `plugins` directory to provide tools or model adapters.
- **Task Queue** – uses Celery with Redis for background work.
- **Web UI** – optional FastAPI front end for management.
- **Observability** – Prometheus metrics and OpenTelemetry tracing.

```text
CLI -> Core -> Plugins
          \-> Task Queue
```

Understanding these pieces helps contributors reason about feature boundaries and data flow.
