# MCP Server Setup Status - Updated

## Port Configuration Fixed ✅
All configurations have been reverted to use port **3024** as specified in `config/ports.env`:
- ✅ apps/cortex-os/src/runtime.ts - Updated to default port 3024
- ✅ config/cloudflared/mcp-tunnel.yml - Updated to point to localhost:3024
- ✅ packages/cortex-mcp/infrastructure/cloudflare/tunnel.config.yml - Updated to point to localhost:3024

## Current Issue
The port 3024 is currently occupied by a **Cortex Memory Server** that's still running. The Cloudflare tunnel is actively forwarding requests to this service instead of the MCP server.

## Resolution Required
To properly setup the MCP server for ChatGPT access:

1. **Stop the conflicting service**:
   ```bash
   # Find and stop the service on port 3024
   lsof -i :3024
   # Kill the process if needed
   sudo kill -9 <PID>
   ```

2. **Restart the Cloudflare tunnel** (requires sudo):
   ```bash
   # Kill existing tunnel
   sudo pkill -f "cloudflared.*cortex-mcp"

   # Restart with updated config
   sudo cloudflared tunnel --config packages/cortex-mcp/infrastructure/cloudflare/tunnel.config.yml run cortex-mcp
   ```

3. **Start the MCP server**:
   ```bash
   # Option 1: Test server
   node test-mcp-server.js

   # Option 2: Full Cortex-OS runtime
   cd apps/cortex-os && node dist/index.js
   ```

## Quick Start Script
Use the provided restart script (requires sudo):
```bash
./scripts/restart-mcp-tunnel.sh
```

## Verification
Once the server is running correctly:
```bash
# Health check
curl https://cortex-mcp.brainwav.io/health

# List tools
curl https://cortex-mcp.brainwav.io/tools

# Test tool call
curl -X POST https://cortex-mcp.brainwav.io/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "system.status", "arguments": {}}'
```

## ChatGPT Integration
The server is configured to accept requests from ChatGPT with:
- CORS enabled for `https://chat.openai.com`
- Proper rate limiting (50 req/10s per tool)
- Structured responses with metadata and correlation IDs

## Architecture
```
ChatGPT → https://cortex-mcp.brainwav.io → Cloudflare Tunnel → localhost:3024 → MCP Server
```

The setup is ready - only requires stopping the conflicting service and restarting the tunnel.