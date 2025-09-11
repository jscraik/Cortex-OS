# CLI Reference

The package exposes PNPM scripts for local development:

| Command | Description |
|---------|-------------|
| `pnpm --filter @cortex-os/gateway dev` | Start the development server with live reload |
| `pnpm --filter @cortex-os/gateway build` | Compile TypeScript to JavaScript |
| `pnpm --filter @cortex-os/gateway test` | Run unit tests and regenerate `openapi.json` |

### Options
Pass environment variables inline to configure behavior:
```bash
PORT=8080 ENABLE_METRICS=true pnpm --filter @cortex-os/gateway dev
```
