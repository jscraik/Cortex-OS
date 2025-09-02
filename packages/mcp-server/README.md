# Cortex MCP Server

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-85%25+-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security)
[![MCP Protocol](https://img.shields.io/badge/MCP-2.0-orange)](https://modelcontextprotocol.io/)
[![SSE](https://img.shields.io/badge/SSE-supported-purple)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
[![Claude Desktop](https://img.shields.io/badge/Claude-Desktop%20Ready-blue)](https://claude.ai/)

**Model Context Protocol Server Implementation**

*Minimal, secure MCP server with SSE transport for Claude Desktop and Cursor integration*

</div>

---

## 🎯 Features

- **📡 SSE Transport**: Server-Sent Events transport for compatibility with Claude Desktop and Cursor
- **🏥 Health Monitoring**: Comprehensive health check endpoint with status reporting
- **🔧 Dynamic Tools**: Runtime tool registration with secure execution sandbox
- **🔒 Security First**: Secure by default with token-based authentication (`CORTEX_MCP_TOKEN`)
- **⚡ High Performance**: Optimized for low-latency tool invocation
- **🛠️ Built-in Tools**: Essential tools for development and integration
- **📊 Monitoring**: Health checks and performance metrics
- **🌐 Cross-Platform**: Compatible with multiple MCP clients

## Available Tools

| Tool | Description | Security |
|------|-------------|----------|
| `ping` | Test connectivity with simple ping response | ✅ Safe |
| `http_get` | Fetch JSON/text by GET (2MB limit) | 🔒 Allowlisted hosts only |
| `repo_file` | Read repository files (read-only) | 🛡️ Secure path validation |

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Start production server
npm start

# Start development server with auto-reload
npm run dev
```

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
