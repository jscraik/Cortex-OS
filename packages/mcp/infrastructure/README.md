# Cortex MCP Server Infrastructure

This directory contains the infrastructure and scripts needed to run the Cortex MCP (Model Context Protocol) server with Cloudflare tunnel support.

## Overview

- **MCP Server**: Runs on `http://localhost:3000`
- **Public URL**: `https://mcp.brainwav.io` (via Cloudflare tunnel)
- **Tunnel Name**: `mcp-brainwav`

## Files

```text
infrastructure/
├── cloudflare/
│   └── tunnel.config.yml       # Cloudflare tunnel configuration
└── scripts/
    ├── setup-tunnel.sh         # Set up Cloudflare tunnel (one-time)
    ├── start-mcp-server.sh     # Start MCP server locally
    └── start-mcp-with-tunnel.sh # Start server with tunnel exposure
```

## Quick Start

### 1. First-time Setup

```bash
# Install cloudflared
brew install cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Set up the tunnel (one-time)
cd packages/mcp
./scripts/setup-tunnel.sh
```

### 2. Start MCP Server

```bash
# Option A: Local only
./scripts/start-mcp-server.sh

# Option B: With public tunnel
./scripts/start-mcp-with-tunnel.sh
```

### 3. Test Connection

```bash
# Local
curl http://localhost:3000/health

# Public (after tunnel is running)
curl https://mcp.brainwav.io/health
```

## Usage from Package Root

The main package.json includes a convenience script:

```bash
# From repository root
pnpm mcp:start-with-tunnel
```

## Configuration

### Environment Variables

- `CORTEX_MCP_TUNNEL_STRICT=1`: Fail fast if tunnel can't start
- `CORTEX_MCP_PORT=3000`: Override default port

### Tunnel Configuration

The tunnel configuration in `infrastructure/cloudflare/tunnel.config.yml` includes:

- Health check endpoint: `/health`
- MCP protocol endpoints: `/mcp/*`
- API endpoints: `/api/*`
- WebSocket support: `/ws`
- Metrics endpoint on `localhost:8081`

## Troubleshooting

### Tunnel Issues

```bash
# Check tunnel status
cloudflared tunnel list
cloudflared tunnel info mcp-brainwav

# View tunnel logs
cloudflared tunnel run mcp-brainwav --loglevel debug
```

### Port Conflicts

```bash
# Check what's using port 3000
lsof -i :3000

# Kill process using port 3000
lsof -ti :3000 | xargs kill -9
```

### DNS Issues

```bash
# Check DNS resolution
dig +short mcp.brainwav.io
nslookup mcp.brainwav.io
```

## Integration with Cortex

The MCP server integrates with the broader Cortex ecosystem:

- **A2A Events**: Emits `mcp.tunnel.failed` on tunnel failures
- **ASBR Runtime**: Auto-starts via runtime configuration
- **Monitoring**: Metrics available on port 8081

## Security

- TLS termination at Cloudflare edge
- Local connections use HTTP (localhost only)
- Tunnel credentials stored in `~/.cloudflared/`
- No sensitive data in configuration files
