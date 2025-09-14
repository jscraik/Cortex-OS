---
title: Deployment
sidebar_label: Deployment
---

# Deployment

For containerized services, mount the SPIRE socket and provide environment variables:

```Dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN pnpm install --prod
CMD ["node", "dist/index.js"]
```

```bash
docker run -v /tmp/spire-agent/public/api.sock:/tmp/spire-agent/public/api.sock \
  -e SPIRE_SOCKET=/tmp/spire-agent/public/api.sock \
  -e TRUST_DOMAIN=cortex-os.local myservice

```