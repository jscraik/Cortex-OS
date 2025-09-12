# Deployment Guide

## Docker
```Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install --prod
CMD ["npx","mvp-server","start"]
```

## Environment
Set production variables:
```bash
export NODE_ENV=production
export MVP_SERVER_PORT=80
```
