---
title: Testing Qa
sidebar_label: Testing Qa
---

# Testing & QA

Run package tests and lints:

```bash
pnpm --filter @cortex-os/observability lint
pnpm --filter @cortex-os/observability test
```

Tests should validate span creation, exporter selection, and ULID propagation.
