---
title: Deployment
sidebar_label: Deployment
---

# Deployment Guide

## Docker
A sample Dockerfile is provided at repository root. Build and run:
```bash
docker build -t cortex-gateway -f Dockerfile.optimized .
docker run -p 3333:3333 --env-file packages/gateway/.env cortex-gateway
```

## Node Process Manager
Use a process manager such as `pm2` or `systemd` for long-running instances.
