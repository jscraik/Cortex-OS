---
title: Configuration
sidebar_label: Configuration
---

# Configuration

Set environment variables or provide a configuration object with the following options:

| Option | Description |
| ------ | ----------- |
| `REGISTRIES` | JSON map of registry names to URLs |
| `CACHE_DIR` | Directory for registry cache files |
| `CACHE_TTL` | Cache time-to-live in seconds |
| `PORT` | HTTP port (default `3000`) |
| `HOST` | Bind address (default `0.0.0.0`) |
| `LOGGER` | Enable request logging (`true` by default) |

Example:

```bash
export REGISTRIES&#61;'{"official":"https://registry.cortex-os.dev"}'
export CACHE_DIR&#61;~/.cache/cortex-marketplace
export CACHE_TTL&#61;3600
pnpm --filter @cortex-os/marketplace-api start
```
