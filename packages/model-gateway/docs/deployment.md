# Deployment

## Local

```bash
pnpm --filter @cortex-os/model-gateway start
```

## Docker

A `Dockerfile` is provided:

```bash
docker build -t model-gateway packages/model-gateway
docker run -p 8081:8081 model-gateway
```

Set environment variables as needed before container startup.
