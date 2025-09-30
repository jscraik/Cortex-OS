# A2A Protocol Server - Docker Deployment

This directory contains everything needed to run the A2A Protocol Server in containers using the brAInwav Docker workflow.

## Quick Start

### Option 1: brAInwav Docker Dev Stack (Recommended)

```bash
# Start the development stack via the shared helper
pnpm dev:docker

# Check status
pnpm dev:docker:ps

# View logs
pnpm dev:docker:logs

# Stop everything
pnpm dev:docker:down
```

### Option 2: Docker Compose

```bash
# Start the server
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop the server
docker-compose down
```

### Option 3: Docker Build & Run

```bash
# Build the image
pnpm run docker:build

# Run manually
docker run -p 3000:3000 cortex-os/a2a-protocol:1.0.0
```

## Architecture

### Container Structure

```
Dockerfile (Multi-stage build)
├── Stage 1: Builder
│   ├── Node.js 22 Alpine
│   ├── Install pnpm & dependencies
│   ├── Build TypeScript code
│   └── Run tests
└── Stage 2: Runtime
    ├── Node.js 22 Alpine (minimal)
    ├── Non-root user (a2a:1001)
    ├── Production dependencies only
    ├── Built application
    ├── HTTP server with health checks
    └── Graceful shutdown handling
```

### Services Available

- **a2a-server** - Main A2A Protocol Server
- **a2a-dev** - Development server with hot reload
- **redis** - Optional distributed task storage
- **nginx** - Optional load balancer & SSL termination
- **prometheus** - Optional monitoring
- **grafana** - Optional dashboard

## Endpoints

- **POST /** - A2A JSON-RPC 2.0 endpoint
- **GET /health** - Health check endpoint
- **GET /metrics** - Prometheus metrics (optional)

## Configuration

### Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)

### Docker Compose Profiles

```bash
# Basic server only
docker-compose up

# With development tools
docker-compose --profile dev up

# With Redis support
docker-compose --profile redis up

# With monitoring stack
docker-compose --profile monitoring up

# Full stack
docker-compose --profile full up
```

## Security Features

- ✅ **Non-root user** - Runs as user `a2a` (UID 1001)
- ✅ **Minimal base image** - Alpine Linux for security
- ✅ **Multi-stage build** - No development dependencies in runtime
- ✅ **Health checks** - Built-in container health monitoring
- ✅ **Graceful shutdown** - Proper signal handling
- ✅ **Security headers** - via Nginx proxy
- ✅ **Rate limiting** - Built into Nginx configuration

## Monitoring & Observability

### Health Checks

The container includes comprehensive health checks:

```bash
# Container health check
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "service": "a2a-protocol-server",
  "version": "1.0.0",
  "timestamp": "2025-08-30T21:05:00.000Z"
}
```

### Logs

```bash
# View live logs
docker-compose logs -f a2a-server
```

### Metrics (Optional)

If Prometheus is enabled:

```bash
# Access Prometheus
open http://localhost:9090

# Access Grafana
open http://localhost:3001
# Login: admin/admin
```

## Testing

### Automated Testing

```bash
# Test before building
pnpm run docker:test

# Test running container
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tasks/send","params":{"message":{"role":"user","parts":[{"text":"Hello A2A!"}]}}}'
```

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 -T application/json \
  -p test-request.json \
  http://localhost:3000/

# test-request.json content:
{"jsonrpc":"2.0","id":"load-test","method":"tasks/send","params":{"message":{"role":"user","parts":[{"text":"Load test"}]}}}
```

## Production Deployment

### SSL/TLS Setup

1. Generate certificates:

```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem
```

2. Enable SSL in `nginx.conf` (uncomment SSL server block)

3. Deploy with SSL:

```bash
docker-compose --profile full up -d
```

### Scaling

```bash
# Scale the A2A service
docker-compose up -d --scale a2a-server=3

# Or use Docker Swarm for production
docker swarm init
docker stack deploy -c docker-compose.yml a2a-stack
```

## Troubleshooting

### Common Issues

1. **Port already in use**

   ```bash
   # Check what's using port 3000
   lsof -i :3000

   # Use different port
   PORT=3001 docker-compose up
   ```

2. **Container won't start**

   ```bash
   # Check logs
   docker-compose logs a2a-server

   # Check container status
   docker-compose ps
   ```

3. **Health check failing**

   ```bash
   # Test health endpoint manually
   curl -v http://localhost:3000/health

   # Check container resources
   docker stats
   ```

### Debug Mode

```bash
# Run with debug logging
NODE_ENV=development docker-compose up

# Access container shell
docker-compose exec a2a-server sh
```

## Scripts Reference

- `pnpm run docker:build` - Build container image
- `pnpm run docker:test` - Run tests only
- `pnpm dev:docker` - Start the shared brAInwav Docker development stack
- `pnpm dev:docker:logs` - Tail logs from the brAInwav Docker stack
- `pnpm dev:docker:down` - Stop the Docker development stack

## Performance

### Resource Usage

- **Memory**: ~50MB baseline
- **CPU**: <5% idle, scales with requests
- **Disk**: ~100MB container image
- **Network**: Supports 1000+ req/s

### Optimization

- Use `--memory=128m --cpus=0.5` for resource limits
- Enable connection pooling for high throughput
- Use Redis for distributed task storage
- Enable Nginx caching for static responses

## License

MIT License - Production ready for commercial use.
