# ChatGPT Connectors Integration with Local Memory via brAInwav FASTMCP Server

## Quick Setup Guide

### 1. Install Python Dependencies (first run)

```bash
cd ~/.Cortex-OS
uv pip install --python .venv/bin/python -e ./packages/cortex-mcp
```

If `uv` is not available, install with pip instead:

```bash
cd ~/.Cortex-OS
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -e ./packages/cortex-mcp
```

### 2. Start Enhanced MCP Server

```bash
# Navigate to your Cortex-OS directory
cd ~/.Cortex-OS

# Start the enhanced server with Local Memory integration
./scripts/start-enhanced-mcp-server.sh
```

### 3. Configure ChatGPT Custom Connector

In ChatGPT:

1. Go to Settings → Connectors → Add source → Custom connector (MCP)
2. Enter server details:
   - **Server URL**: `https://cortex-mcp.brainwav.io/mcp`
   - **Authentication**: None (local development)
   - **Name**: "brAInwav Local Memory"

### 4. Test the Integration

In ChatGPT, try these commands:

- "Search Local Memory for debugging tips"
- "Store this conversation summary in Local Memory"
- "Fetch local-memory-item-123"

## Available Tools

The enhanced server provides these MCP tools for ChatGPT:

### Required ChatGPT Tools

- `search`: Search both Cortex-OS and Local Memory
- `fetch`: Retrieve documents from either source

### Local Memory Tools  

- `local_memory_store`: Store content with tags/metadata
- `local_memory_search`: Search Local Memory specifically
- `local_memory_get`: Retrieve a specific memory item
- `local_memory_delete`: Remove a memory item

### Health & Status

- `ping`: Server health check
- `health_check`: Comprehensive status including Local Memory

## Environment Variables

Set these in your environment:

```bash
export LOCAL_MEMORY_BASE_URL="http://localhost:3028/api/v1"
export LOCAL_MEMORY_NAMESPACE="cortex-chatgpt"
export LOCAL_MEMORY_API_KEY="your-api-key"  # if required
```

## Troubleshooting

1. **Server won't start**: Run the installation commands in step 1 or re-run the startup script to trigger the automated installer
2. **Local Memory not responding**: Verify Local Memory service is running
3. **ChatGPT can't connect**: Ensure Cloudflare tunnel is active

## Architecture

```text
ChatGPT Connectors → brAInwav FASTMCP Server → Local Memory (MCP + REST)
                                          ↘ Cortex-OS Knowledge Base
```

Developed by brAInwav Development Team.
