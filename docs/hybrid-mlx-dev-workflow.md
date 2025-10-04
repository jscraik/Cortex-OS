# Cortex-OS Hybrid MLX Development Workflow

This document explains the hybrid development model where the MLX embedding / model service runs **natively on macOS (Apple Silicon)** while the rest of Cortex-OS services run inside **OrbStack-managed containers**.

## Rationale

| Aspect | Host (MLX) | Container (Other Services) |
|--------|------------|-----------------------------|
| Performance | Native Metal acceleration | N/A |
| Portability | macOS arm64 only | Cross-platform via Docker |
| Startup Iteration | Fast, keep warm | Recreate as needed |
| Access Pattern | `http://localhost:8081` | `http://host.docker.internal:8081` |

MLX currently depends on Apple Silicon + Metal optimizations. Running it in a Linux container on arm64 would degrade performance and complicate driver passthrough.

## Key Scripts

- `scripts/start-mlx-host.sh` – Manages the MLX server (start/stop/restart/status/logs/install) with new flags.
- `scripts/cortex-dev.sh` – Orchestrates end‑to‑end dev stack (MLX + containers) with selective service startup.
- `scripts/verify-hybrid-env.sh` – Verifies host + OrbStack environment (platform, ports, tools) before running stack.

## Quick Start

```bash
# One-time environment prep
./scripts/cortex-dev.sh setup

# Start full stack (MLX + all containers)
./scripts/cortex-dev.sh start

# (Optional) Attach to logs automatically
./scripts/cortex-dev.sh start --follow

# Tail logs for a specific service
./scripts/cortex-dev.sh logs model-gateway

# Health check
./scripts/cortex-dev.sh health

# Stop everything
./scripts/cortex-dev.sh stop

# Clean (remove volumes, networks)
./scripts/cortex-dev.sh clean

# Verify environment (pre-flight)
./scripts/verify-hybrid-env.sh
```

## MLX Script Usage

```bash
./scripts/start-mlx-host.sh start                 # Default daemon start
./scripts/start-mlx-host.sh --foreground start    # Run in foreground
./scripts/start-mlx-host.sh --no-install start    # Skip dependency install
./scripts/start-mlx-host.sh --timeout 60 start    # Increase health wait timeout
./scripts/start-mlx-host.sh status --json         # Machine-readable status
./scripts/start-mlx-host.sh logs -f               # Follow logs
```

### Flags (MLX)
- `--foreground` / `-f` – Run attached (Ctrl+C stops)
- `--no-install` – Skip dependency installation
- `--no-wait` – Do not block on health endpoint
- `--timeout <sec>` – Health wait timeout
- `--venv <path>` – Custom virtual environment path
- `--json` – JSON output for `status`

Environment variables: `MLX_HOST`, `MLX_PORT`, `EMBEDDINGS_MODEL`, `EMBEDDINGS_DIM`, `MLX_VENV_PATH`, `MLX_WAIT_TIMEOUT`.

## Orchestrator Script Usage (cortex-dev)

```bash
./scripts/cortex-dev.sh start --services nats,model-gateway   # Partial stack
./scripts/cortex-dev.sh start --fast                          # Assume MLX already running
./scripts/cortex-dev.sh status --json                         # JSON status
./scripts/cortex-dev.sh logs mlx                              # MLX logs
./scripts/cortex-dev.sh mlx restart --no-install              # Forward to MLX script
./scripts/cortex-dev.sh start --watch                         # Start with MLX auto-restart on source changes
./scripts/cortex-dev.sh status --json | jq .                  # Pretty print structured status
```

### Global Flags
- `--fast` – Skip MLX install/start if already running (verifies status)
- `--no-install` – Propagated to MLX script
- `--services a,b,c` – Start only specific services
- `--follow` – After `start`, follow container logs
- `--json` – JSON format for `status`
- `--mlx-venv <path>` – Pass venv path to MLX script
- `--mlx-timeout <s>` – Extend MLX health timeout
- `--mlx-flag <flag>` – Pass raw flag straight to MLX script (repeatable)
- `clean` command – Tears down containers + volumes + stops MLX
- `--watch` – Auto-restart MLX server on source changes (requires `fswatch`)

## Default Service Groups
- Core: `nats`, `grafana`, `loki`, `tempo`
- App: `model-gateway`, `mcp-registry`

## Networking Reference

| Container → Host MLX | Use | URL |
|----------------------|-----|-----|
| From any container   | Embeddings / model RPC | `http://host.docker.internal:8081` |

Ensure any service expecting MLX sets (example):
```
MLX_HOST_URL=http://host.docker.internal:8081
```
Applied either via compose environment or `.env.dev`.

## Port Map & Conflicts

| Purpose | Default Port | Notes |
|---------|--------------|-------|
| API | 8080 | Host + container published |
| MLX / Model Gateway | 8081 | Gateway shares MLX port currently |
| Web UI | 3000 | Frontend |

If a port is already bound locally the scripts emit a non-fatal warning; consider `lsof -i :PORT` to investigate. Override ports via environment variables (future enhancement) if collisions persist.
Override defaults via environment variables:

| Variable | Affects | Default |
|----------|---------|---------|
| `CORTEX_API_PORT` | API service host port | `8080` |
| `CORTEX_MLX_PORT` | MLX host + model-gateway port | `8081` |
| `CORTEX_WEBUI_PORT` | Web UI port | `3000` |

## Health Endpoints

| Service | Endpoint |
|---------|----------|
| MLX Host | `/health` |
| Gateway  | (TBD or `/health`) |
| API      | `/health` (assuming standard) |
| Model Gateway | `/health` (shares port with MLX for now) |

Validate quickly:
```bash
curl -s localhost:8081/health | jq .
```

## Typical Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| MLX start hangs | Large model warmup | Increase `--timeout`, check logs |
| Containers can't reach MLX | Wrong hostname | Use `host.docker.internal` from containers |
| MLX missing `mlx` module | Install failed | Rerun with no `--no-install`; view logs |
| NATS dependent services fail | NATS slow start | Wait or increase retry logic |
| Health check fails sporadically | Early probe | Use `--no-wait` temporarily |
| Port already in use warnings | Another dev process running | Stop other process or change port |
| `clean` removed volumes unexpectedly | Data persistence not configured | Use backups before running `clean` |

## Edge Cases Considered
- Stale PID file cleanup handled.
- JSON output for automation.
- Foreground mode for iterative debugging.
- Custom virtual environment reuse across restarts.
- Graceful health wait with timeout override.
- Follow logs live (`--follow`) after start/restart.
- Readiness waits for `nats`, `api`, and `model-gateway` basic HTTP health.
- Environment pre-flight verification script.
- Configurable port overrides via env vars.
- Structured JSON status (ports + connectivity + containers).
- Watch mode with graceful MLX restart on code change.

## Structured JSON Status Shape

Example (`./scripts/cortex-dev.sh status --json | jq .`):

```json
{
  "ports": { "api": 8080, "mlx": 8081, "webui": 3000 },
  "mlx": { "running": true, "pid": 12345, "url": "http://127.0.0.1:8081", "responding": true, "log": ".../logs/mlx-server.log" },
  "containers": [ { "Name": "nats", "State": "running", "Service": "nats" } ],
  "connectivity": { "mlx": true, "api": true, "modelGateway": true, "webui": true }
}
```

Fields may vary by Docker version / compose implementation. Treat absent fields as optional.

## Embedding Round-Trip Test

Run after stack is up:

```bash
./scripts/test-embedding-roundtrip.sh
```

Optional environment overrides used by test:

| Variable | Purpose |
|----------|---------|
| `CORTEX_MLX_PORT` | MLX health + embed endpoint |
| `CORTEX_API_PORT` | Potential future API embedding relay |
| `CORTEX_MODEL_GATEWAY_PORT` | If model gateway separated later |

Test validates:
1. MLX `/health` reachable
2. POST `/embed` returns embeddings array length >= 2
3. Dimension check (best-effort) vs reported `dimensions`

## Suggested Next Enhancements (Future)
- Add container health probes with retries before declaring healthy stack.
- Introduce a `watch` mode for file changes (nodemon / uvicorn reload).
- Extend status JSON to include per-service ports.
- Add integration test script to verify embeddings path end-to-end.

---
Maintainers: Keep this doc updated when adding/removing services or changing MLX interface.
