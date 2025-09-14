---
title: Contributing
sidebar_label: Contributing
---

# Contributor Setup

Follow the repository-level `CONTRIBUTING.md`. Package-specific steps:

```bash
pnpm install
pnpm --filter @cortex-os/model-gateway test
```

Include tests with code changes and run `pnpm lint` before committing.
