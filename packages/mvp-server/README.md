<<<<<<< EXISTING (cortex-os-clean)
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
=======
# Cortex MCP Server

A minimal Model Context Protocol server implementation using the official SDK.

## Features

- SSE transport for compatibility with Claude Desktop and Cursor
- Health check endpoint (`/health`)
- Simple ping tool for testing

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the server:

   ```bash
   npm run build
   ```

3. Start the server:

   ```bash
   npm start
   ```

   Or for development with auto-reload:

   ```bash
   npm run dev
   ```

## Endpoints

- `GET /health` - Health check endpoint
- `GET /sse` - SSE endpoint for MCP connections
- `POST /sse` - Endpoint for MCP messages

## Testing

You can test the server locally:

1. Health check:

   ```bash
   curl -I http://localhost:3000/health
   ```

2. SSE stream (disconnect with Ctrl+C):
   ```bash
   curl -N http://localhost:3000/sse
   ```

## Connecting Clients

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "cortex-mcp": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3000/sse"]
    }
  }
}
```

### Cursor

Add to your Cursor configuration (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "cortex-mcp": {
      "transport": "remote",
      "url": "http://localhost:3000/sse"
    }
  }
}
```

## Deployment

To expose the server publicly via Cloudflare Tunnel:

1. Ensure you have a Cloudflare Tunnel configured with:
   - Tunnel UUID: `af4eed03-2d4e-4683-8cb7-6d4b8e47b564`
   - Hostname: `mcp.brainwav.io`
   - Service: `http://localhost:3000`

2. Restart your tunnel LaunchAgent:

   ```bash
   launchctl kickstart -k gui/$(id -u)/com.cloudflare.cloudflared
   ```

3. Verify the deployment:

   ```bash
   curl -I https://mcp.brainwav.io/health
   curl -N https://mcp.brainwav.io/sse
   ```

4. Point Claude/Cursor to `https://mcp.brainwav.io/sse` and test the **ping** tool.
>>>>>>> MIGRATING (cortex-os)
