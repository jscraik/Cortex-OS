---
title: Architecture
sidebar_label: Architecture
---

# Architecture

MVP Server centers on a Fastify core wrapped by a plugin manager.

```mermaid
graph TD
  A[Config Loader] --&gt; B[Fastify Instance]
  B --&gt; C[Plugin Manager]
  C --&gt; D[Routes]
  B --&gt; E[Metrics]
```

- **Config Loader** reads JSON and environment variables.
- **Plugin Manager** registers routes and hooks.
- **Metrics Module** exposes Prometheus counters.

```