---
title: Deployment
sidebar_label: Deployment
---

# Deployment Guides

## Docker

```bash
docker compose up -d
```

## Kubernetes

Apply manifests from the `k8s/` directory using `kubectl apply -f`.

## Production Build

Run `pnpm build` and serve the backend with `pnpm start`. Host the frontend statically from `frontend/dist`.
