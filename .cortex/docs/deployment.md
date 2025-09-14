# Deployment Guides

## Docker
```bash
docker build -f Dockerfile.optimized -t cortex-os .
docker run -p 3000:3000 cortex-os
```

## Production
- Configure env vars in `infra/` manifests.
- Use `pnpm build` before containerizing.
