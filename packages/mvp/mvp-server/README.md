# @cortex-os/mvp-server

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

Minimal Fastify server exposing health, readiness, liveness, version, and metrics endpoints. Depends on `@cortex-os/mvp-core` for configuration, logging, and error handling.

## Endpoints

- `GET /health` – aggregate health checks
- `GET /ready` – readiness probe
- `GET /live` – liveness probe
- `GET /version` – service name/version/env
- `GET /metrics` – placeholder until metrics are enabled

## Development

```bash
pnpm --filter @cortex-os/mvp-server build
pnpm --filter @cortex-os/mvp-server test
pnpm --filter @cortex-os/mvp-server dev
```

## Authentication

Set `CORTEX_MCP_TOKEN` in the environment before starting the server. All requests must include `Authorization: Bearer <CORTEX_MCP_TOKEN>`.
