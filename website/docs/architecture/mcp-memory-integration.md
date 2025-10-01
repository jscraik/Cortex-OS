# MCP Memory Integration Architecture

## Overview

The brAInwav Cortex-OS implements a **unified memory architecture** that combines local SQLite-backed storage with remote Pieces OS Long-Term Memory through a single MCP (Model Context Protocol) endpoint.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Clients                              │
├──────────┬──────────┬──────────┬──────────┬────────────────────┤
│ Claude   │ ChatGPT  │ VS Code  │ Cursor   │ Other IDEs/Tools   │
│ Desktop  │          │          │          │                    │
└─────┬────┴─────┬────┴─────┬────┴─────┬────┴─────┬──────────────┘
      │          │          │          │          │
      └──────────┼──────────┼──────────┼──────────┘
                 │          │          │
    ┌────────────▼──────────▼──────────▼────────────┐
    │       brAInwav MCP Hub (FastMCP v3)           │
    │       Port: 3024 (HTTP/SSE + STDIO)           │
    │                                               │
    │  ┌─────────────────────────────────────────┐  │
    │  │         Local Memory Tools (9)          │  │
    │  ├─────────────────────────────────────────┤  │
    │  │ • memory.store                          │  │
    │  │ • memory.search                         │  │
    │  │ • memory.analysis                       │  │
    │  │ • memory.relationships                  │  │
    │  │ • memory.stats                          │  │
    │  │ • memory.hybrid_search ← Aggregator     │  │
    │  │ • search (ChatGPT compat)               │  │
    │  │ • fetch (ChatGPT compat)                │  │
    │  └─────────────────────────────────────────┘  │
    │                                               │
    │  ┌─────────────────────────────────────────┐  │
    │  │    Remote Tools (via Pieces Proxy)      │  │
    │  ├─────────────────────────────────────────┤  │
    │  │ • pieces.ask_pieces_ltm                 │  │
    │  │ • pieces.create_pieces_memory           │  │
    │  │ • pieces.* (auto-discovered)            │  │
    │  └─────────────────────────────────────────┘  │
    └───────────────────┬───────────────────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    ▼                   ▼                   ▼
┌──────────────┐  ┌───────────────┐  ┌─────────────────────┐
│ memory-core  │  │ PiecesMCPProxy│  │ Pieces OS (Host)    │
│ (Local)      │  │ (SSE Client)  │  │ localhost:39300     │
│              │  │               │  │ /model_context_     │
│ SQLite DB    │  │ • Auto-       │  │  protocol/2024-     │
│ (canonical)  │  │   reconnect   │  │  11-05/sse          │
│              │  │ • Tool        │  │                     │
│ Qdrant       │  │   discovery   │  │ • Code history      │
│ (optional)   │  │ • Graceful    │  │ • Snippets          │
│              │  │   degradation │  │ • Context memory    │
└──────────────┘  └───────────────┘  └─────────────────────┘
```

## Key Components

### 1. brAInwav MCP Hub (`packages/mcp-server`)

The central MCP server built on FastMCP v3 that:

- Exposes a unified MCP endpoint on port 3024
- Supports both HTTP/SSE (for remote clients) and STDIO (for local clients)
- Dynamically registers local and remote tools
- Provides hybrid search aggregation across memory sources
- Implements graceful degradation when Pieces OS is offline

**Implementation**: `/packages/mcp-server/src/index.ts`

### 2. memory-core (`packages/memory-core`)

The local memory implementation providing:

- SQLite-backed canonical storage
- Optional Qdrant vector search for semantic queries
- Comprehensive memory operations (store, search, analysis, relationships, stats)
- REST API for external clients
- A2A event emission for observability

**Implementation**: `/packages/memory-core/src/`

### 3. PiecesMCPProxy (`packages/mcp-server/src/pieces-proxy.ts`)

SSE client that connects to remote Pieces OS:

- Establishes SSE connection to Pieces MCP endpoint
- Discovers available remote tools dynamically
- Proxies tool calls to Pieces OS
- Auto-reconnects on connection failures (5s delay)
- Returns empty tools list if Pieces unavailable

**Implementation**: 206-line TypeScript class using `@modelcontextprotocol/sdk`

### 4. Pieces OS

Third-party LTM engine running on the host:

- Provides long-term memory across all Pieces applications
- Maintains code history, snippets, and context
- Exposes MCP tools via SSE transport
- Runs independently on localhost:39300

**Configuration**: Must be running and accessible for integration to work

## Integration Patterns

### Hybrid Search

The `memory.hybrid_search` tool aggregates results from multiple sources:

```typescript
async function hybridSearch(args: {
  query: string;
  include_pieces?: boolean;
  limit?: number;
}) {
  // Query local memory-core
  const localResults = await memoryProvider.search({
    query: args.query,
    limit: args.limit || 10,
  });

  // Query remote Pieces if enabled and connected
  let piecesResults = [];
  if (args.include_pieces !== false && piecesProxy.isConnected()) {
    try {
      piecesResults = await piecesProxy.callTool('ask_pieces_ltm', {
        question: args.query,
      });
    } catch (error) {
      logger.warn({ error }, 'brAInwav: Failed to query Pieces LTM');
    }
  }

  // Return merged results with source attribution
  return {
    local: localResults.map(r => ({ ...r, source: 'cortex-local' })),
    remote: piecesResults.map(r => ({ ...r, source: 'pieces-ltm' })),
    combined: mergeAndRerank(localResults, piecesResults),
    metadata: {
      localCount: localResults.length,
      remoteCount: piecesResults.length,
      piecesConnected: piecesProxy.isConnected(),
    },
  };
}
```

### Dynamic Tool Registration

Remote Pieces tools are discovered and registered at startup:

```typescript
// Connect to Pieces MCP server
await piecesProxy.connect();

// Register all discovered remote tools with "pieces." prefix
for (const tool of piecesProxy.getTools()) {
  server.addTool({
    name: `pieces.${tool.name}`,
    description: `[Remote Pieces] ${tool.description}`,
    parameters: tool.inputSchema || { type: 'object', properties: {} },
    async execute(args: Record<string, unknown>) {
      return await piecesProxy.callTool(tool.name, args);
    },
  });
}
```

### Graceful Degradation

The hub continues functioning with local-only tools if Pieces is unavailable:

```typescript
try {
  await piecesProxy.connect();
  logger.info('brAInwav: Connected to Pieces MCP server');
} catch (error) {
  logger.warn({ error }, 'brAInwav: Pieces MCP unavailable, continuing with local tools only');
}
```

## Configuration

### Environment Variables

```bash
# MCP Hub Configuration
PORT=3024
MCP_HOST=127.0.0.1
MCP_HTTP_ENDPOINT=/mcp
MCP_LOG_LEVEL=info

# Local Memory
LOCAL_MEMORY_BASE_URL=http://localhost:3028/api/v1
MEMORY_DB_PATH=/path/to/unified-memories.db
MEMORIES_SHORT_STORE=local

# Pieces Integration
PIECES_MCP_ENDPOINT=http://localhost:39300/model_context_protocol/2024-11-05/sse
PIECES_MCP_ENABLED=true  # Set to 'false' to disable
```

### LaunchAgent (macOS)

The MCP server can run as a LaunchAgent for automatic startup:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cortexos.mcp.server</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>3024</string>
        <key>PIECES_MCP_ENDPOINT</key>
        <string>http://localhost:39300/model_context_protocol/2024-11-05/sse</string>
        <key>PIECES_MCP_ENABLED</key>
        <string>true</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

### Docker Compose

For containerized deployments, Pieces OS runs on the host:

```yaml
services:
  cortex-mcp:
    image: brainwav/cortex-mcp:latest
    environment:
      - PORT=3024
      - LOCAL_MEMORY_BASE_URL=http://local-memory:9400
      - PIECES_MCP_ENDPOINT=http://host.docker.internal:39300/model_context_protocol/2024-11-05/sse
      - PIECES_MCP_ENABLED=true
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "3024:3024"
    depends_on:
      local-memory:
        condition: service_healthy
```

## Transport Modes

### STDIO (Local Clients)

For Claude Desktop, VS Code, Cursor:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "/path/to/.Cortex-OS/scripts/start-mcp-server-stdio.sh",
      "env": {
        "PIECES_MCP_ENABLED": "true"
      }
    }
  }
}
```

### HTTP/SSE (Remote Clients)

For ChatGPT, web applications:

```bash
# Start HTTP/SSE server
PORT=3024 node dist/index.js
```

Connect via: `http://localhost:3024/mcp`

## Monitoring & Observability

### Health Checks

**Endpoint**: `http://localhost:3024/health`

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2025-09-30T12:00:00Z",
  "services": {
    "memory-core": "connected",
    "pieces-mcp": "connected"
  },
  "tools": {
    "local": 9,
    "remote": 5,
    "total": 14
  }
}
```

### Logging

Structured JSON logs with brAInwav branding:

```typescript
logger.info({
  branding: 'brAInwav',
  event: 'hybrid-search-complete',
  localResults: 5,
  remoteResults: 3,
  durationMs: 245,
}, 'Hybrid search completed successfully');
```

### A2A Events

All memory operations emit CloudEvents for observability:

```typescript
await a2aClient.emit({
  type: 'cortex.memory.searched',
  source: 'memory-core',
  data: {
    query,
    resultsCount,
    sources: ['local', 'pieces'],
  },
});
```

## Security Considerations

### Authentication

- **Optional API Key**: Set `MCP_API_KEY` environment variable
- **No Credentials in Code**: All config via environment variables
- **CORS Enabled**: Configured for remote HTTP/SSE clients

### Data Privacy

- **Local Storage**: SQLite database stores all canonical data locally
- **Pieces Integration**: Optional, can be disabled via `PIECES_MCP_ENABLED=false`
- **No Data Duplication**: Pieces acts as supplementary LTM, not primary store

### Error Handling

- **Graceful Degradation**: Local tools continue if Pieces unavailable
- **No Stack Traces**: Production logs sanitized
- **Connection Retry**: Automatic reconnection with backoff

## Development Workflow

### Local Development

```bash
# 1. Start local memory REST API
cd packages/memory-core
pnpm dev

# 2. Start Pieces OS (if using Pieces integration)
# Launch Pieces OS application

# 3. Start MCP server
cd packages/mcp-server
PORT=3024 PIECES_MCP_ENABLED=true pnpm dev
```

### Testing

```bash
# Unit tests
pnpm test

# Integration tests (requires Pieces OS)
PIECES_MCP_ENABLED=true pnpm test:integration

# Test MCP endpoint
curl -X POST http://localhost:3024/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Building

```bash
# Build TypeScript
pnpm build

# Build Docker image
docker build -t brainwav/cortex-mcp:latest .
```

## Troubleshooting

### Pieces Connection Issues

**Problem**: `brAInwav: Pieces MCP unavailable` warning

**Solutions**:

1. Ensure Pieces OS is running on localhost:39300
2. Verify `PIECES_MCP_ENDPOINT` is correct
3. Check Pieces OS MCP server is enabled in Pieces settings
4. Review Pieces OS logs for errors

### Memory Search Returning No Results

**Problem**: Hybrid search returns empty results

**Solutions**:

1. Check local memory database has data: `SELECT COUNT(*) FROM memories`
2. Verify Pieces connection: `curl http://localhost:39300/health`
3. Enable debug logging: `MCP_LOG_LEVEL=debug`
4. Test local search independently

### Docker Compose Networking

**Problem**: Container cannot reach Pieces on host

**Solutions**:

1. Ensure `extra_hosts` includes `host.docker.internal:host-gateway`
2. Verify Pieces OS listens on `0.0.0.0:39300`, not just `127.0.0.1`
3. Check firewall rules allow container-to-host traffic

## Future Enhancements

### Planned Features

1. **Multi-Provider Support**: Add support for additional remote memory providers (Mem0, Langbase, etc.)
2. **Smart Routing**: Automatically route queries to best memory source based on content type
3. **Result Deduplication**: Intelligent merging of results from multiple sources
4. **Caching Layer**: Cache frequent queries to reduce remote calls
5. **Metrics Dashboard**: Real-time visualization of memory usage and query performance

### Research Areas

1. **Federated Search**: Distributed memory across multiple Cortex-OS instances
2. **Cross-Instance Memory Sharing**: Secure memory sharing between teams
3. **ML-Based Ranking**: Use ML models to re-rank hybrid search results
4. **Memory Compression**: Efficient storage of large memory datasets

## References

- [FastMCP v3 Documentation](https://github.com/fastmcp/fastmcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Pieces OS Documentation](https://docs.pieces.app/)
- [brAInwav MCP Server README](/packages/mcp-server/README.md)
- [memory-core Documentation](/packages/memory-core/README.md)

---

**Last Updated**: 2025-09-30  
**Maintained by**: brAInwav Development Team
