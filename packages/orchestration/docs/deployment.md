# Deployment Guide

## Container
- Build with the repo's `Dockerfile.optimized` and include Python runtime.
- Expose port 3001 if using the outbox service.

## Environment
- Provide required environment variables from [Configuration](./configuration.md).
- Run `pnpm build` before starting in production.
