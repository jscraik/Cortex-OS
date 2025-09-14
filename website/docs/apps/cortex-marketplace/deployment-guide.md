---
title: Deployment Guide
sidebar_label: Deployment Guide
---

# Deployment Guide

1. Build the project: `pnpm --filter @cortex-os/marketplace-api build`
2. Set environment variables as in [Configuration](./configuration.md).
3. Launch with `pnpm --filter @cortex-os/marketplace-api start` or deploy the compiled `dist/` directory behind your preferred process manager or container runtime.
