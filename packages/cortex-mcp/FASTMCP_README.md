# Cortex-OS FastMCP Server v2.0

## Overview

This is the FastMCP 2.0 implementation of the Cortex-OS MCP server, compatible with ChatGPT and other MCP clients. It replaces the legacy FastAPI implementation with a modern, standards-compliant FastMCP server.

## Features

- **FastMCP 2.0 Compatible**: Uses the latest FastMCP framework for optimal performance and compatibility
- **HTTP Transport**: Supports both HTTP and SSE transports for ChatGPT integration
- **MCP Protocol Compliant**: Full implementation of the Model Context Protocol specification
- **Tools Available**:
  - `search`: Search the Cortex-OS knowledge base
  - `fetch`: Retrieve specific resources by ID
  - `ping`: Health check endpoint
  - `list_capabilities`: List all available server capabilities

## Quick Start

### Option 1: Using the Startup Script (Recommended)

```bash
# Start the server with default settings (port 3024)
./scripts/start-mcp-server.sh

# Or with custom port
PORT=8000 ./scripts/start-mcp-server.sh
```

### Option 2: Direct Python Execution

```bash
# Make sure you're in the project root directory
cd /path/to/Cortex-OS

# Using the virtual environment (recommended)
PORT=3024 ./.venv/bin/python packages/cortex-mcp/cortex_fastmcp_server_v2.py

# Or using system Python
PORT=3024 python3 packages/cortex-mcp/cortex_fastmcp_server_v2.py
```

### Option 3: Using the Legacy Run Script

```bash
./scripts/mcp/run-mcp.sh
```

## Server Endpoints

- **Local HTTP**: `http://localhost:3024/mcp`
- **Cloudflare Tunnel**: `https://cortex-mcp.brainwav.io/mcp` (if tunnel is active)

## ChatGPT Integration

To connect ChatGPT to this MCP server:

1. Ensure the server is running (you should see the FastMCP banner)
2. In ChatGPT, use the MCP connection URL: `https://cortex-mcp.brainwav.io/mcp`
3. The server supports SSE (Server-Sent Events) transport required by ChatGPT

## Testing the Server

```bash
# Test if server is responding (should return JSON-RPC response)
curl -H "Accept: text/event-stream" "http://localhost:3024/mcp"

# Test via Cloudflare tunnel
curl -H "Accept: text/event-stream" "https://cortex-mcp.brainwav.io/mcp"

# Both should return something like:
# {"jsonrpc":"2.0","id":"server-error","error":{"code":-32600,"message":"Bad Request: Missing session ID"}}
```

The "Missing session ID" error is expected for direct HTTP calls - it means the MCP protocol is working correctly.

## Dependencies

- Python 3.11+
- FastMCP 2.12.3+
- MCP SDK 1.14.0+

## Architecture

- **Framework**: FastMCP 2.0 (official MCP implementation)
- **Transport**: HTTP with SSE support
- **Protocol**: JSON-RPC 2.0 over MCP
- **Deployment**: Cloudflare Tunnel for external access

## Migration from Legacy Server

This server replaces:

- ❌ `run_server.py` (old FastAPI implementation)
- ❌ `cortex_fastmcp_server.py` (OAuth implementation)
- ❌ `cortex_fastmcp_server_clean.py` (intermediate version)
- ❌ `mcp_local/servers/chatgpt_connector/mcp_sse_server.py` (legacy SSE server)

All legacy implementations have been removed.

## Troubleshooting

### Server Won't Start

- Check Python version: `python --version` (need 3.11+)
- Verify FastMCP installation: `python -m pip list | grep fastmcp`
- Run from project root directory to avoid import issues

### Import Errors

- Make sure you're running from the Cortex-OS project root
- Use the virtual environment: `./.venv/bin/python`
- Check that no local `mcp` directory conflicts with the installed package

### ChatGPT Can't Connect

- Verify server is running: check for FastMCP banner in console
- Test endpoint manually: `curl -H "Accept: text/event-stream" "https://cortex-mcp.brainwav.io/mcp"`
- Ensure Cloudflare tunnel is active and proxying to port 3024

## Development

To modify the server:

1. Edit `packages/cortex-mcp/cortex_fastmcp_server_v2.py`
2. Add new tools using the `@mcp.tool` decorator
3. Follow FastMCP 2.0 patterns from <https://gofastmcp.com>

## Support

For issues:

- Check the FastMCP documentation: <https://gofastmcp.com>
- Verify MCP protocol compliance
- Test with direct HTTP calls before trying ChatGPT integration
