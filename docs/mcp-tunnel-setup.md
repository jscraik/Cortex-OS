# MCP Cloudflare Tunnel Setup Guide

## Overview
This document explains how the Cortex-OS MCP (Model Context Protocol) server is configured to work with Cloudflare tunnel for external access, particularly for ChatGPT integration.

## Architecture
```
ChatGPT/OpenAI → HTTPS → cortex-mcp.brainwav.io → Cloudflare Tunnel → Local MCP Server (localhost:3024)
```

## Configuration Files

### 1. Cloudflare Tunnel Configuration
- **Primary**: `/packages/cortex-mcp/infrastructure/cloudflare/tunnel.config.yml`
- **Backup**: `/config/cloudflared/mcp-tunnel.yml`

### 2. MCP Server Configuration
- **Server Implementation**: `apps/cortex-os/src/mcp/server.ts`
- **Gateway Logic**: `apps/cortex-os/src/mcp/gateway.ts`
- **Runtime Integration**: `apps/cortex-os/src/runtime.ts`

## Port Configuration
- **MCP Server Port**: 3024 (canonical)
- **Cloudflare Tunnel**: Routes `cortex-mcp.brainwav.io` → `localhost:3024`

## Endpoints

### Health Check
- **URL**: `/health`
- **Method**: GET
- **Response**: Service health status with available endpoints

### Tools List
- **URL**: `/tools`
- **Method**: GET
- **Response**: List of available MCP tools

### Tool Execution
- **URL**: `/tools/call`
- **Method**: POST
- **Body**: `{"name": "tool_name", "arguments": {...}}`

## Security Features

### CORS Configuration
- Allows requests from `https://chat.openai.com`
- Supports required headers: `Content-Type`, `Authorization`
- Credentials enabled for authenticated requests

### Rate Limiting
- 50 requests per 10 seconds per tool
- Token bucket implementation

### Security Headers
- Server identifies as "brAInwav MCP"
- Request tracking with correlation IDs
- Audit logging for all tool executions

## ChatGPT Integration

### Required Headers
ChatGPT sends requests with:
- `Origin: https://chat.openai.com`
- `Content-Type: application/json`
- Custom headers as needed

### Response Format
MCP tools respond with:
```json
{
  "tool": "tool_name",
  "content": [
    {
      "type": "text",
      "text": "Response text"
    }
  ],
  "metadata": {
    "brand": "brAInwav",
    "correlationId": "uuid",
    "sessionId": "session_id",
    "durationMs": 123
  }
}
```

## Operations

### Starting the MCP Server
```bash
# Option 1: Via Cortex-OS runtime
cd apps/cortex-os
node dist/index.js

# Option 2: Test server
node test-mcp-server.js
```

### Restarting Cloudflare Tunnel
```bash
# Use the restart script
./scripts/restart-mcp-tunnel.sh

# Or manually
sudo cloudflared tunnel --config packages/cortex-mcp/infrastructure/cloudflare/tunnel.config.yml run cortex-mcp
```

### Testing Connectivity
```bash
# Health check
curl https://cortex-mcp.brainwav.io/health

# List tools
curl https://cortex-mcp.brainwav.io/tools

# Execute tool
curl -X POST https://cortex-mcp.brainwav.io/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "system.status", "arguments": {}}'
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure no other process is using port 3024
   - Resolution: Identify conflicts with `lsof -i :3024` and stop them

2. **Tunnel Not Responding**
   - Check if tunnel process is running: `ps aux | grep cloudflared`
   - Restart tunnel with sudo privileges
   - Verify configuration files

3. **CORS Errors**
   - Ensure Origin header is from `https://chat.openai.com`
   - Check CORS configuration in server.ts

4. **404 Errors**
   - Verify MCP server is running on correct port
   - Check Cloudflare tunnel configuration
   - Ensure URL paths match

### Debug Commands
```bash
# Check what's listening on port
lsof -i :3024

# Test local connection
curl http://localhost:3024/health

# Test through tunnel
curl https://cortex-mcp.brainwav.io/health

# View tunnel logs
sudo cloudflared tunnel info cortex-mcp
```

## Security Considerations

1. **Authentication**: Consider adding API keys for production
2. **Rate Limiting**: Monitor and adjust based on usage
3. **Audit Logging**: All requests are logged with correlation IDs
4. **Input Validation**: Zod schemas validate all inputs
5. **Error Handling**: Sanitized error responses

## Future Enhancements

1. **JWT Authentication**: For secure tool access
2. **Request Signing**: Verify request integrity
3. **Dynamic Tool Registration**: Allow runtime tool addition
4. **Metrics Collection**: Prometheus metrics for monitoring
5. **WebSocket Support**: For streaming responses
