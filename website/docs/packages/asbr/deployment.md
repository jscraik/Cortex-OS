---
title: Deployment
sidebar_label: Deployment
---

# Deployment

ASBR is designed for local or containerized use.

## Local Service
1. Install dependencies: `pnpm install`
2. Build: `pnpm --filter @cortex-os/asbr build`
3. Start via CLI or `node dist/index.js`

## Docker Example
```Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm --filter @cortex-os/asbr build
CMD ["npx","cortex-asbr"]
```
Expose port `7439` and mount the XDG directories for persistence.

```