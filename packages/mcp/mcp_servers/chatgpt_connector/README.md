# Cortex-OS ChatGPT Connector MCP Server

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](coverage)

## Overview

The ChatGPT Connector MCP Server is a Model Context Protocol implementation that enables ChatGPT to connect to Cortex-OS as a second brain and centralized hub for frontier models. This server provides search and fetch capabilities that work with ChatGPT's connectors in chat and deep research.

## Features

- **Search Tool**: Returns relevant search results from your Cortex-OS knowledge base
- **Fetch Tool**: Retrieves complete document content for detailed analysis
- **Cortex-OS Integration**: Seamlessly integrates with the existing MCP infrastructure
- **Memory Management**: Optimized for Cortex-OS memory constraints
- **Test Coverage**: Maintains 90%+ test coverage

## Installation

The ChatGPT Connector is part of the Cortex-OS MCP package. To install:

```bash
cd /Users/jamiecraik/.Cortex-OS/packages/mcp
pip install -e .
```

## Configuration

Set environment variables:

```bash
export OPENAI_API_KEY="your-openai-api-key"
# Qdrant connection (local default shown)
export QDRANT_HOST=localhost
export QDRANT_PORT=6333
# Or, for Qdrant Cloud:
# export QDRANT_URL="https://YOUR-CLUSTER-region.aws.cloud.qdrant.io"
# export QDRANT_API_KEY="your-api-key"
```

## Usage

Start the server:

```bash
python -m mcp.mcp_servers.chatgpt_connector.server
```

Or using the CLI:

```bash
mcp-chatgpt-connector
```

The server will start on `http://localhost:8007`.

### MCP SSE (for ChatGPT Connector UI)

To expose an MCP-compatible SSE endpoint that you can paste into the ChatGPT “New Connector” dialog:

```bash
python -m mcp.mcp_servers.chatgpt_connector.mcp_sse_server
# or
mcp-chatgpt-connector-sse
```

This starts an SSE endpoint at:

- `GET http://localhost:8007/mcp/sse`  (use this as “MCP Server URL”)
- `POST http://localhost:8007/mcp/message`  (ChatGPT will POST JSON-RPC here)

Optional auth: set `MCP_API_KEY=yourtoken`, then configure ChatGPT with Authorization header `Bearer yourtoken`.

## MCP Tools

### Search Tool

Search for documents in your knowledge base.

**Arguments:**

- `query`: Search query string

**Returns:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"results\":[{\"id\":\"doc-1\",\"title\":\"Document Title\",\"url\":\"https://example.com/doc-1\"}]}"
    }
  ]
}
```

### Fetch Tool

Retrieve complete document content.

**Arguments:**

- `id`: Document ID

**Returns:**

```json
{
  "content": [
    {
      "type": "text", 
      "text": "{\"id\":\"doc-1\",\"title\":\"Document Title\",\"text\":\"Full document content\",\"url\":\"https://example.com/doc-1\",\"metadata\":{}}"
    }
  ]
}
```

## Integration with Cortex-OS

This server integrates with the existing Cortex-OS MCP infrastructure:

- Uses the same protocol definitions as other MCP servers
- Compatible with MCP Registry at <http://localhost:3002>
- Works with MCP Bridge at <http://localhost:3003>
- Integrates with MCP Core at <http://localhost:3010>

## Memory Management

The server is optimized for Cortex-OS memory constraints:

- Uses the same memory management configuration as other MCP services
- Respects Docker memory limits (512m-2048m)
- Compatible with `scripts/memory-manager-mcp.sh`

## Testing

Run tests with:

```bash
cd /Users/jamiecraik/.Cortex-OS/packages/mcp
./scripts/run-mcp-tests.sh mcp-servers/chatgpt-connector
```

## License

Apache 2.0
