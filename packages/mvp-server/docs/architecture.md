# Architecture

MVP Server centers on a Fastify core wrapped by a plugin manager.

```mermaid
graph TD
  A[Config Loader] --> B[Fastify Instance]
  B --> C[Plugin Manager]
  C --> D[Routes]
  B --> E[Metrics]
```

- **Config Loader** reads JSON and environment variables.
- **Plugin Manager** registers routes and hooks.
- **Metrics Module** exposes Prometheus counters.
