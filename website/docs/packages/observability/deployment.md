---
title: Deployment
sidebar_label: Deployment
---

# Deployment Guide

1. Build the package:
   ```bash
   pnpm --filter @cortex-os/observability build
```
2. Configure exporter environment variables.
3. Deploy your service; the SDK handles graceful shutdown on SIGINT and SIGTERM.

Container deployments should expose OTLP ports and provide access to collector endpoints.

```