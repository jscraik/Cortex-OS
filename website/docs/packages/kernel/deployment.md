---
title: Deployment
sidebar_label: Deployment
---

# Deployment Guide

1. Build the package:

```bash
pnpm build
```

2. Publish (workspace root):

```bash
pnpm publish -F @cortex-os/kernel
```

3. Use semantic-release for automated versioning.
