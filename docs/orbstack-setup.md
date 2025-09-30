# OrbStack Workflow Retired# OrbStack Development Environment Setup

OrbStack-based development flows are no longer supported. Use the Docker-first workflow documented in [`docs/docker-setup.md`](./docker-setup.md) and [`docs/dev-tools-reference.md`](./dev-tools-reference.md) for current brAInwav Cortex-OS guidance.This guide covers setting up and using the OrbStack-optimized containerized development environment for Cortex-OS.

## Prerequisites

### 1. Install OrbStack
```bash
# Install via Homebrew (recommended)
brew install orbstack

# Or download from https://orbstack.dev
```

### 2. Verify Installation
```bash
# Check OrbStack is running
docker --version
docker info

# Should show OrbStack as the provider
```

### 3. Configure OrbStack for Cortex-OS
```bash
# Copy OrbStack configuration
mkdir -p ~/.orbstack/
cp .orbstack/config.yaml ~/.orbstack/cortex-os.yaml
```

## Quick Start

### Start Development Environment
```bash
# Start minimal development stack (recommended for local development)
./scripts/orbstack-dev.sh start dev-min

# Start full development stack with all services
./scripts/orbstack-dev.sh start dev-full

# Start with observability (monitoring)
./scripts/orbstack-dev.sh start dev-full,observability
```

### Check Service Status
```bash
./scripts/orbstack-dev.sh status
```

### View Logs
```bash
# All services
./scripts/orbstack-dev.sh logs

# Specific service
./scripts/orbstack-dev.sh logs cortex-os
```

### Stop Services
```bash
./scripts/orbstack-dev.sh stop
```

### Validate OrbStack Environment

Run the brAInwav hybrid environment verification script whenever you refresh your toolchain to confirm Docker, OrbStack, and required ports are healthy.

```bash
./scripts/verify-hybrid-env.sh --json
```

Sample output from the latest verification (2025-09-27):

```text
[INFO] Checking platform (macOS arm64) ...
[OK] macOS detected
[OK] arm64 architecture
[INFO] Checking required commands ...
[OK] docker present
[OK] lsof present
[OK] curl present
[INFO] Checking optional commands ...
[OK] pnpm present
[OK] uv present
[OK] python3 present
[OK] jq present
[INFO] Checking Docker OrbStack context ...
[OK] OrbStack context active
[OK] Docker daemon reachable
[INFO] Checking host port availability ...
[OK] Port 8080 (API) free
[OK] Port 8081 (MLX) free
[OK] Port 3000 (WEBUI) free
[INFO] Checking Python version ...
[OK] Python available (version 3.13.7)
[WARN] mlx module not importable globally (will rely on venv)

Environment verification passed ✅
```

> **Note:** The `mlx` warning is informational. The MLX runtime loads from the managed virtual environment inside OrbStack, so no manual action is required unless you plan to run MLX workloads on the host.

## Available Service Profiles

### Core Profiles

#### `dev-min` (Minimal Development)
- **Services**: NATS, Model Gateway, Cortex-OS Runtime
- **Use Case**: Local development with minimal resource usage
- **Endpoints**:
  - Cortex-OS: http://localhost:3000
  - Model Gateway: http://localhost:8081
  - NATS Management: http://localhost:8222

#### `dev-full` (Full Development)
- **Services**: All core services + workers + tools
- **Use Case**: Complete development environment
- **Additional Services**: MCP Registry, Agents Workers, All tools

### Specialized Profiles

#### `web` (Frontend Services)
- **Services**: Web UI, Static assets
- **Endpoints**:
  - Web UI: http://localhost:3001

#### `api` (Backend APIs)
- **Services**: All API endpoints and gateways
- **Endpoints**:
  - Python ML API: http://localhost:8005

#### `workers` (Background Services)
- **Services**: Agent workers, background processors
- **Use Case**: Testing agent workflows and async processing

#### `observability` (Monitoring Stack)
- **Services**: Grafana, Loki, Tempo, OpenTelemetry Collector
- **Endpoints**:
  - Grafana: http://localhost:3001 (admin/admin)
  - Loki: http://localhost:3100
  - Tempo: http://localhost:3200

#### `tools` (Development Tools)
- **Services**: Cortex Code CLI, TUI, MCP tools
- **Use Case**: Code analysis and generation tools

#### `ml` (Machine Learning)
- **Services**: Python ML services with model caching
- **Use Case**: AI/ML development and testing

#### `mcp` (Model Context Protocol)
- **Services**: MCP servers and tools
- **Use Case**: MCP integration development

## Service Architecture

### Multi-Language Support

#### TypeScript/Node.js Services
- **Optimizations**: pnpm caching, V8 heap optimization, fast bind mounts
- **Services**: cortex-os, model-gateway, mcp-registry, web UI
- **Base Image**: `node:20-slim` with pnpm

#### Rust Services
- **Optimizations**: Cargo caching, native ARM64 execution, release build caching
- **Services**: cortex-code-cli, cortex-code-mcp-server, cortex-code-tui
- **Base Image**: `rust:1.80-alpine` → `alpine:3.19`

#### Python Services
- **Optimizations**: uv package manager, model caching, transformers optimization
- **Services**: cortex-py-ml, AI services
- **Base Image**: `python:3.12-slim` with uv

### OrbStack-Specific Optimizations

#### Performance Features
- **Native ARM64 execution** for all supported services
- **Rosetta 2 emulation** selectively disabled for Rust binaries
- **Fast bind mounts** for source code changes
- **Optimized caching** for package managers (pnpm, cargo, pip)

#### Resource Management
- **Memory limits** appropriate for each service type
- **Automatic cleanup** when memory usage exceeds 80%
- **CPU optimization** with parallelized builds

#### Development Experience
- **File watching** for hot reload
- **Network optimization** for internal communication
- **Volume optimization** with fast SSD caching for dependencies

## Development Workflows

### Local Development Workflow

1. **Start minimal environment**:
   ```bash
   ./scripts/orbstack-dev.sh start dev-min
   ```

2. **Make code changes** in your preferred editor

3. **Services automatically reload** via bind mounts and file watching

4. **Test changes** via exposed endpoints

5. **View logs** for debugging:
   ```bash
   ./scripts/orbstack-dev.sh logs cortex-os
   ```

### Full Stack Development

1. **Start full environment with monitoring**:
   ```bash
   ./scripts/orbstack-dev.sh start dev-full,observability
   ```

2. **Access Grafana** for metrics: http://localhost:3001

3. **Monitor service health** via built-in health checks

4. **Scale specific services** as needed

### Tool Integration

#### Using Cortex Code CLI in Container
```bash
# Run codex command in container
./scripts/orbstack-dev.sh exec cortex-code-cli codex --help

# Interactive TUI mode
./scripts/orbstack-dev.sh exec cortex-code-tui codex-tui
```

#### MCP Development
```bash
# Start MCP services
./scripts/orbstack-dev.sh start mcp

# Test MCP endpoints
curl http://localhost:8004/health
```

#### Python ML Development
```bash
# Start ML services with model caching
./scripts/orbstack-dev.sh start ml

# Execute Python commands in container
./scripts/orbstack-dev.sh exec cortex-py-ml python -c "import torch; print(torch.__version__)"
```

## Troubleshooting

### Common Issues

#### OrbStack Not Detected
```bash
# Verify OrbStack is running
docker info | grep -i orbstack

# If not found, restart OrbStack
orbstack restart
```

#### Service Won't Start
```bash
# Check service logs
./scripts/orbstack-dev.sh logs <service-name>

# Restart specific service
docker compose restart <service-name>
```

#### Memory Issues
```bash
# Clean up unused resources
./scripts/orbstack-dev.sh cleanup

# Deep cleanup (removes all data)
./scripts/orbstack-dev.sh cleanup deep
```

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :3000

# Modify port in infra/compose/.env.dev
```

### Performance Optimization

#### For M1/M2 Macs
- Rust services automatically use native ARM64 (no Rosetta)
- Python services leverage ARM64 when possible
- Node.js services optimized for Apple Silicon

#### Memory Management
```bash
# Monitor memory usage
docker stats

# Adjust memory limits in docker-compose files
# See mem_limit settings for each service
```

#### Storage Optimization
```bash
# Clean up build cache
docker builder prune

# Clean up unused volumes
docker volume prune
```

## Integration with Existing Commands

### pnpm Scripts Integration

The existing pnpm scripts now include OrbStack commands:

```bash
# Use existing scripts for containerized development
pnpm dev:orbstack           # Start dev-full profile
pnpm dev:orbstack:min       # Start dev-min profile  
pnpm dev:orbstack:web       # Start web profile
pnpm dev:orbstack:obs       # Start observability profile
pnpm dev:orbstack:down      # Stop all services
pnpm dev:orbstack:logs      # View all logs
```

### Traditional vs Container Development

| Task | Traditional | OrbStack Container |
|------|-------------|-------------------|
| Start dev server | `pnpm dev` | `pnpm dev:orbstack` |
| Run tests | `pnpm test` | `./scripts/orbstack-dev.sh exec cortex-os pnpm test` |
| Build project | `pnpm build` | `./scripts/orbstack-dev.sh exec cortex-os pnpm build` |
| View logs | Terminal output | `./scripts/orbstack-dev.sh logs` |
| Debug service | Local debugging | Container exec + debugger |

## Advanced Usage

### Custom Profiles
Create custom service combinations by editing `infra/compose/docker-compose.dev.yml` and adding new profiles.

### Environment Variables
Customize behavior via `infra/compose/.env.dev`:

```bash
# Custom ports
MODEL_GATEWAY_PORT=8090
WEB_PORT=3005

# Resource limits  
NODE_MAX_MEMORY=512
PYTHON_MAX_MEMORY=1024

# Debug settings
LOG_LEVEL=debug
RUST_LOG=trace
```

### Volume Management
```bash
# List all volumes
docker volume ls | grep cortex

# Backup important volumes
docker run --rm -v cortex_data:/data -v $(pwd):/backup alpine tar czf /backup/cortex_data_backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v cortex_data:/data -v $(pwd):/backup alpine tar xzf /backup/cortex_data_backup.tar.gz -C /data
```

## Next Steps

1. **Try the quick start** with `dev-min` profile
2. **Explore service endpoints** listed in status output  
3. **Add observability** with `observability` profile
4. **Develop with hot reload** via bind mounts
5. **Scale services** using additional profiles

For more advanced configuration, see:
- `.orbstack/config.yaml` - OrbStack-specific optimizations
- `infra/compose/` - Docker Compose configurations  
- `scripts/orbstack-dev.sh` - Development automation script
