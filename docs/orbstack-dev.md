# OrbStack Development Guide (macOS)

This repo uses OrbStack for a Docker‑compatible VM on macOS. MLX (Metal) runs host‑native, and containers access it via `http://host.docker.internal`.

## Prerequisites

- Install OrbStack: https://orbstack.dev/
- Ensure Docker CLI points to OrbStack (OrbStack installs a compatible Docker daemon).

## Services vs Libraries

- Containerize services only (APIs, UIs, workers): `apps/cortex-os`, `apps/api`, `apps/cortex-web`, `packages/model-gateway`, `packages/mcp-registry`, infra (NATS/Postgres/Qdrant/Ollama).
- Keep packages as libraries inside images: `packages/mcp`, `packages/orchestration`, `packages/memories`, etc.
- MLX (apps/cortex-py) remains host‑native for Apple Silicon performance.

## Running Dev Stack

```bash
# From repo root
docker compose -f infra/compose/docker-compose.dev.yml --profile dev-min up --build -d
```

- MLX endpoint: `http://host.docker.internal:8081`
- Model Gateway: `http://localhost:8080`
- MCP Registry (dev-full): `http://localhost:8090`
- NATS: `nats://localhost:4222`

## Notes

- Use `host.docker.internal` for containers → host networking on OrbStack.
- Add mTLS/origin allowlist only where required; defaults are permissive for dev.
- For strict Linux parity or kernel isolation testing, consider a dedicated VM; otherwise OrbStack is sufficient.

### Profiles

- `dev-min`: nats + model-gateway + cortex-os (most common for MCP dev)
- `dev-full`: includes mcp-registry
- `observability`: includes an OTEL collector (point services at `http://otel-collector:4318`)

## Memory Tuning

OrbStack can run the same services with less memory. You have two levers:

- OrbStack VM: set a lower memory limit via Preferences → Resources, or via CLI:
  - `orb config --help` to see available keys
  - Example: `orb config set memory 4G` then `orb restart`
- Per‑service limits: the dev compose sets conservative limits and Node heap caps:
  - `infra/compose/docker-compose.dev.yml` uses `mem_limit` for each service
  - `NODE_OPTIONS=--max-old-space-size=384` keeps Node heap bounded
  - Adjust upward if you see OOMs; start low for better density
