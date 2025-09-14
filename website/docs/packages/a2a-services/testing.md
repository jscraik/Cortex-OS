---
title: Testing
sidebar_label: Testing
---

# Testing & QA
Run unit tests for each package:
```bash
pnpm --filter @cortex-os/a2a-common test
pnpm --filter @cortex-os/a2a-schema-registry test
```
Tests use [Vitest](https://vitest.dev). Aim for meaningful coverage and follow TDD principles.
