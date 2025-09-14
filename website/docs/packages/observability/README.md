---
title: Monitoring & Observability
sidebar_label: Monitoring & Observability
---

# Observability Package Documentation

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)

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
await withSpan('task', async () &#61;&gt; { /* ... */ });
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
