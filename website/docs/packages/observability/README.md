---
title: Monitoring & Observability
sidebar_label: Monitoring & Observability
---

# Observability Package Documentation

[](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[](https://opensource.org/licenses/Apache-2.0)
[](https://www.typescriptlang.org/)

Central reference for `@cortex-os/observability`, the OpenTelemetry helper layer for Cortex-OS services.

## Features

### Current
- Unified tracing, metrics, and structured logging
- ULID correlation across spans and logs
- Console exporters for local development
- OTLP and Jaeger exporters
- CPU flamegraph generation via `0x`

### Planned
- Additional exporter integrations
- Automatic instrumentation presets
- Built-in dashboards

## Usage

```ts
import { initializeObservability, withSpan } from '@cortex-os/observability';

initializeObservability('demo-service');
await withSpan('task', async () =&gt; { /* ... */ });
```

## Documentation Index

- [Introduction](./introduction.md)
- [Getting Started](./getting-started.md)
- [Configuration](./configuration.md)
- [Architecture](./architecture.md)
- [CLI Reference](./cli-reference.md)
- [API Reference](./api-reference.md)
- [User Guide](./user-guide.md)
- [Best Practices](./best-practices.md)
- [Providers Setup](./providers-setup.md)
- [Security](./security.md)
- [Policy & Terms](./policy-terms.md)
- [FAQ](./faq.md)
- [Roadmap](./roadmap.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Changelog](./changelog.md)
- [Migration Guide](./migration.md)
- [Testing & QA](./testing-qa.md)
- [Deployment Guide](./deployment.md)
- [Examples & Tutorials](./examples.md)
- [Performance & Benchmarking](./performance.md)
- [Logging & Monitoring](./logging-monitoring.md)
- [Glossary](./glossary.md)
- [Contributor Setup](./contributor-setup.md)
- [Accessibility Guidelines](./accessibility.md)
