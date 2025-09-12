# Deployment

Build the package before deploying:

```bash
pnpm -C packages/prp-runner build
```

Publish to npm or include it in a container image. When running the MCP server in production, use a process manager such as `pm2` or Docker.
