---
title: Deployment
sidebar_label: Deployment
---

# Deployment

## Docker
A sample `Dockerfile` is provided:
```bash
docker build -t cortex-mcp packages/mcp
```
Run with environment variables for database and Redis endpoints.

## Systemd
Create a service pointing to `mcp-server serve` and enable restart policies.
