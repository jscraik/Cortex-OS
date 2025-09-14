---
title: Autonomous Agents
sidebar_label: Autonomous Agents
---

# Agents Package Documentation

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)

Central reference for `@cortex-os/agents`, the multi-framework agent execution system.

## Features

### Current
- Multi-framework support (LangGraph, CrewAI, AutoGen)
- Asynchronous task execution with A2A events
- Dynamic capability discovery
- Real-time health monitoring
- Governed memory with PII redaction
- Structured logging and telemetry
- OWASP-compliant security
- Seeded deterministic behaviour

### Planned
- Dedicated CLI utilities
- Additional provider integrations
- Expanded debugging and profiling tools

## Usage

```typescript
import { Agent } from '@cortex-os/agents';

const example: Agent &#61; {
  id: 'demo',
  name: 'Demo Agent',
  capabilities: ['echo'],
  async execute(task) {
    return { success: true, result: task.input };
  },
};
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
