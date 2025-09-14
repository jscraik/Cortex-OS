---
title: Deployment
sidebar_label: Deployment
---

# Deployment

1. Build the service:
   ```bash
   pnpm build
```
2. Containerize using your preferred runtime. A minimal Dockerfile example:
   ```Dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY . .
   RUN pnpm install --prod && pnpm build
   CMD ["node", "dist/server.js"]
   ```
3. Provide required environment variables at runtime.
