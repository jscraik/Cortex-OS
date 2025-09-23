# Docker Setup Guide

## Quick Start

### Development Environment (OrbStack)

```bash
# Start development environment
./scripts/orbstack-dev.sh start dev-min

# View logs
./scripts/orbstack-dev.sh logs

# Stop services
./scripts/orbstack-dev.sh stop
```

### Production Deployment

```bash
# Deploy to production
./scripts/docker-production-deploy.sh deploy

# Validate configuration
./scripts/docker-production-deploy.sh validate

# View service status
./scripts/docker-production-deploy.sh status
```

## Service Overview

### Core Infrastructure Services

| Service | Port | Description | Health Check |
|---------|------|-------------|---------------|
| Qdrant | 6333 | Vector Database | `/health` |
| Neo4j | 7474/7687 | Graph Database | HTTP `/` |
| Jaeger | 16686 | Distributed Tracing | `/` |
| Prometheus | 9090 | Metrics Collection | `/-/healthy` |
| Grafana | 3001 | Dashboards | `/api/health` |
| Ollama | 11434 | Local AI | `/api/version` |

### Additional Services

| Service | Port | Description |
|---------|------|-------------|
| scaphandre-bridge | 8080 | Energy Metrics | `/metrics` |
| gpl-tools | 8765 | GPL Visualization Tools | `/health` |

## Configuration Files

- `docker/docker-compose.yml` - Base configuration
- `docker/docker-compose.prod.yml` - Production overlay
- `docker/docker-compose.orbstack.yml` - OrbStack development optimizations
- `infra/prometheus/prometheus.yml` - Prometheus configuration
- `infra/grafana/` - Grafana provisioning

## Common Issues

### Port Conflicts
If you encounter port conflicts, check:
```bash
# Check what's using ports
lsof -i :3000
lsof -i :8000
```

### Service Health Issues
```bash
# Check service health
docker compose ps

# View specific service logs
docker compose logs -f [service-name]

# Restart unhealthy service
docker compose restart [service-name]
```

### Resource Limits
OrbStack provides better resource management. Monitor usage:
```bash
# View container resource usage
docker stats
```

## Development Workflow

1. Make changes to services
2. Rebuild and restart:
   ```bash
   docker compose up -d --build [service-name]
   ```
3. Run tests:
   ```bash
   ./tests/docker/compose-validation.test.sh
   ```
4. Validate deployment locally before pushing

## Security Notes

- Default credentials are for development only
- Production deployments should use proper secrets management
- All services run as non-root users where possible
- Health checks are configured for all critical services