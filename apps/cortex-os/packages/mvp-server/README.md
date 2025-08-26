@cortex-os/mvp-server

Minimal Fastify server exposing health, readiness, liveness, version, and metrics (stub) endpoints. Depends on @cortex-os/mvp-core for env/config/logging/errors.

Endpoints
- GET /health: aggregate health checks
- GET /ready: readiness probe
- GET /live: liveness probe
- GET /version: name/version/env
- GET /metrics: placeholder until OTEL metrics enabled

Scripts
- dev: tsx watch src/index.ts
- build: tsup ESM build with types
- test: vitest run

Notes
- Transport concerns live here (HTTP, CORS, rate limit, security headers).
- Keep mvp-core transport-agnostic; CLI/workers depend on core only.

