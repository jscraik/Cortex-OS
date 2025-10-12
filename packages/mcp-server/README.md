# mcp-server
Minimal FastMCP v3 server exposing HTTP/SSE; loads the MCP registry; no business logic.

## Quickstart
```bash
pnpm -w --filter packages/mcp-server build
NO_AUTH=false MCP_API_KEY=[YOUR_KEY] pnpm -w --filter packages/mcp-server dev
```

### Health & Metrics
- `GET /health` → `200 OK`
- `GET /metrics` → Prometheus text

### MCP Endpoints
- `POST /mcp` (protocol)
- `GET  /sse`  (server-sent events)

## Cloudflare Tunnel
- Public URL → local `http://localhost:[PORT]`
- Lock to Host allowlist and `Authorization: Bearer [YOUR_KEY]` (or `x-api-key`), per server config.

## Security
- Default **requires API key**. Set `NO_AUTH=true` only in local dev.
- Validate headers timing-safely; never log secrets.

## Definition of Done
- `/mcp`, `/sse`, `/health`, `/metrics` green; API-key auth enforced; registry loads tools/resources/prompts; Cloudflare probe OK.

## Test Plan
```bash
# Health
curl -i $URL/health
# Auth (expect 401/403 without key)
curl -i $URL/mcp
# Auth (expect 200)
curl -i -H "Authorization: Bearer $MCP_API_KEY" $URL/health
```

## Observability
- Pino-style logs; OTEL exporter; counters for request totals and per-tool invocations.

---

### Legacy Snapshot: brAInwav Cortex MCP Server

**Status: ✅ Production Ready with Pieces LTM Integration**

## Overview

The brAInwav Cortex MCP Server is a unified Model Context Protocol hub that provides comprehensive memory management and AI agent tooling capabilities. Built on FastMCP v3 (TypeScript), it exposes both **local memory-core tools** and **remote Pieces LTM tools** through a single MCP endpoint.

## 🏗️ Architecture

### Unified MCP Hub Pattern

```markdown
┌─────────────────────────────────────────────────────────┐
│                    MCP Clients                          │
├──────────┬──────────┬──────────┬────────────────────────┤
│ Claude   │ ChatGPT  │ VS Code  │ Other IDEs/Tools       │
│ Desktop  │          │          │                        │
└─────┬────┴─────┬────┴─────┬────┴────────────────────────┘
      │          │          │
      └──────────┼──────────┘
                 │
    ┌────────────▼────────────┐
    │   brAInwav MCP Hub      │
    │   (FastMCP v3)          │
    │                         │
    │  ┌───────────────────┐  │
    │  │ Local Tools (9)   │  │
    │  ├───────────────────┤  │
    │  │ • memory.store    │  │
    │  │ • memory.search   │  │
    │  │ • memory.analysis │  │
    │  │ • memory.         │  │
    │  │   relationships   │  │
    │  │ • memory.stats    │  │
    │  │ • memory.         │  │
    │  │   hybrid_search   │  │
    │  │ • search (ChatGPT)│  │
    │  │ • fetch (ChatGPT) │  │
    │  └───────────────────┘  │
    │                         │
    │  ┌───────────────────┐  │
    │  │ Remote Tools      │  │
    │  │ (Pieces Proxy)    │  │
    │  ├───────────────────┤  │
    │  │ • pieces.         │  │
    │  │   ask_pieces_ltm  │  │
    │  │ • pieces.create_  │  │
    │  │   pieces_memory   │  │
    │  │ • pieces.*        │  │
    │  │   (auto-discover) │  │
    │  └───────────────────┘  │
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────┐
    │  PiecesMCPProxy     │
    │  (SSE Client)       │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────────────────┐
    │  Pieces OS (localhost:39300)    │
    │  /model_context_protocol/       │
    │  2024-11-05/sse                 │
    └─────────────────────────────────┘
```

### Memory Architecture

```
┌─────────────────────────────────────────┐
│        brAInwav MCP Hub                 │
│        (port 3024)                      │
│  Cloudflare: cortex-mcp.brainwav.io    │
└───────────┬─────────────────────────────┘
            │
    ┌───────┴─────────┐
    │                 │
    ▼                 ▼
┌─────────────┐  ┌──────────────────┐
│ Local       │  │ Remote (Pieces)  │
│ Memory      │  │ LTM Engine       │
│             │  │                  │
│ SQLite DB   │  │ localhost:39300  │
│ (canonical) │  │ (host process)   │
│             │  │                  │
│ Qdrant      │  │ • Context        │
│ (vectors)   │  │ • Code history   │
│ (optional)  │  │ • Snippets       │
└─────────────┘  └──────────────────┘
```

## 🚀 Features

### Local Memory Tools (memory-core)

1. **memory.store** - Store memories with metadata and embeddings
2. **memory.search** - Semantic and keyword search across memories
3. **memory.analysis** - Analyze memory patterns and trends
4. **memory.relationships** - Discover connections between memories
5. **memory.stats** - Retrieve memory statistics and health metrics
6. **memory.hybrid_search** - Query both local and remote memory sources

### Remote Pieces Tools (via proxy)

7. **pieces.ask_pieces_ltm** - Query Pieces Long-Term Memory engine
8. **pieces.create_pieces_memory** - Store memories in Pieces LTM
9. **pieces.*** - All Pieces tools auto-discovered at runtime

### ChatGPT-Compatible Tools

10. **search** - Deep research and content discovery (ChatGPT MCP spec)
11. **fetch** - Detailed content retrieval by ID (ChatGPT MCP spec)

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3024                          # MCP server port
MCP_HOST=127.0.0.1                 # Bind address
MCP_HTTP_ENDPOINT=/mcp             # MCP endpoint path
MCP_LOG_LEVEL=info                 # Logging level

# Local Memory Configuration
LOCAL_MEMORY_BASE_URL=http://localhost:3028/api/v1
MEMORY_DB_PATH=/path/to/unified-memories.db
MEMORIES_SHORT_STORE=local
MEMORY_STORE=local
MEMORY_LOG_LEVEL=info

# Pieces MCP Integration
PIECES_MCP_ENDPOINT=http://localhost:39300/model_context_protocol/2024-11-05/sse
PIECES_MCP_ENABLED=true            # Set to 'false' to disable

# Authentication (optional)
MCP_API_KEY=your-api-key-here
AUTH_MODE=oauth2
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-mcp-resource
MCP_RESOURCE_URL=https://your-mcp-resource
REQUIRED_SCOPES=search.read docs.write memory.read memory.write memory.delete
REQUIRED_SCOPES_ENFORCE=true
```

> When enabling OAuth2, configure matching scopes in the Auth0 API, enable RBAC + “Add Permissions in Access Token”, and restart the server so `/.well-known/oauth-protected-resource` advertises the same `REQUIRED_SCOPES`.

### LaunchAgent Configuration (macOS)

Location: `~/Library/LaunchAgents/com.cortexos.mcp.server.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cortexos.mcp.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/.Cortex-OS/scripts/start-mcp-server-typescript.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/.Cortex-OS/packages/mcp-server</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>3024</string>
        <key>PIECES_MCP_ENDPOINT</key>
        <string>http://localhost:39300/model_context_protocol/2024-11-05/sse</string>
        <key>PIECES_MCP_ENABLED</key>
        <string>true</string>
        <!-- Additional environment variables -->
    </dict>
</dict>
</plist>
```

## 🔌 Pieces MCP Integration

### Architecture Pattern

The Pieces integration uses a **proxy pattern** to avoid code duplication:

1. **SSE Client Connection**: Uses `@modelcontextprotocol/sdk` SSEClientTransport
2. **Dynamic Tool Discovery**: Remote tools auto-registered at startup
3. **Graceful Degradation**: Hub continues with local tools if Pieces offline
4. **Auto-Reconnect**: 5-second delay between reconnection attempts
5. **Zero Duplication**: Pieces functionality accessed via proxy only

### Implementation

**Proxy Client**: `/Users/jamiecraik/.Cortex-OS/packages/mcp-server/src/pieces-proxy.ts`

```typescript
const piecesProxy = new PiecesMCPProxy({
  endpoint: PIECES_MCP_ENDPOINT,
  enabled: PIECES_MCP_ENABLED,
  logger,
});

// Connect at startup
await piecesProxy.connect();

// Register remote tools dynamically
for (const tool of piecesProxy.getTools()) {
  server.addTool({
    name: `pieces.${tool.name}`,
    description: `[Remote Pieces] ${tool.description}`,
    async execute(args) {
      return await piecesProxy.callTool(tool.name, args);
    },
  });
}
```

### Hybrid Search

The `memory.hybrid_search` tool aggregates results from both sources:

```typescript
server.addTool({
  name: 'memory.hybrid_search',
  async execute({ query, include_pieces, limit }) {
    // Query local memory-core
    const localResults = await memoryProvider.search({ query, limit });
    
    // Query remote Pieces if enabled
    let piecesResults = [];
    if (include_pieces && piecesProxy.isConnected()) {
      piecesResults = await piecesProxy.callTool('ask_pieces_ltm', {
        question: query,
      });
    }
    
    // Return merged results with source attribution
    return {
      local: localResults.map(r => ({ ...r, source: 'cortex-local' })),
      remote: piecesResults.map(r => ({ ...r, source: 'pieces-ltm' })),
      combined: mergeAndRerank(localResults, piecesResults),
    };
  },
});
```

## 🐳 Docker Deployment

### Docker Compose Configuration

```yaml
services:
  cortex-mcp:
    build: .
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

**Note**: Pieces OS runs on the host, accessed via `host.docker.internal`.

## 📡 Transport Modes

### Transport precedence

1. `MCP_TRANSPORT=stdio` → use STDIO transport exclusively.
2. `MCP_TRANSPORT=http|sse|all` or unset → start HTTP/SSE transport (default).
3. Any other value → log a warning and fall back to HTTP/SSE.

Setting `MCP_TRANSPORT=all` keeps HTTP/SSE as the active transport and logs guidance to run a second STDIO process if needed.

### STDIO (Local Clients)

For Claude Desktop, local IDEs:

```bash
# Start in STDIO mode
node dist/index.js --transport stdio
```

### HTTP/SSE (Remote Clients)

For ChatGPT, remote IDEs:

```bash
# Start in HTTP mode (default)
PORT=3024 node dist/index.js
```

### ChatGPT Desktop Configuration

**Important:** ChatGPT Desktop uses **remote SSE servers**, not local STDIO like Claude.

#### Setup Instructions:

1. Open **ChatGPT Desktop** → **Settings** → **Connectors**
2. Click **"+ Add Connector"** or **"Import MCP Server"**
3. Enter the following details:

```
Server URL: https://cortex-mcp.brainwav.io/sse
Server Name: brAInwav Cortex Memory
```

**Note:** The `/sse` endpoint is automatically available when running in `httpStream` mode. Your server is accessible via Cloudflare Tunnel at `cortex-mcp.brainwav.io`.

See [CHATGPT_CONNECTION_GUIDE.md](./CHATGPT_CONNECTION_GUIDE.md) for detailed setup and troubleshooting.

## 🧪 Development

### Build

```bash
pnpm build
```

### Run Locally

```bash
# Start with environment variables
PORT=3024 \
PIECES_MCP_ENABLED=true \
node dist/index.js
```

### Testing

```bash
# Run tests
pnpm test

# Test MCP endpoint
curl -X POST http://localhost:3024/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## 📊 Monitoring

### Health Checks

- **Local Endpoint**: `http://localhost:3024/health`
- **Cloudflare Tunnel**: `https://cortex-mcp.brainwav.io/health`
- **Returns**: Server status and memory-core health
- **Pieces Status**: Included in health response

### Logging

Structured JSON logging with pino:

```typescript
logger.info({
  branding: 'brAInwav',
  event: 'pieces-connected',
  toolCount: 5,
}, 'Successfully connected to Pieces MCP server');
```

## 🔒 Security

- **API Key Authentication**: Optional via `MCP_API_KEY`
- **CORS Enabled**: For remote HTTP/SSE clients
- **No Secrets in Code**: All config via environment variables
- **Graceful Errors**: No stack traces in production logs

## 📚 Documentation

- **[OPERATIONAL_STATUS.md](./OPERATIONAL_STATUS.md)** - Full operational details
- **[FASTMCP_V3_FEATURES.md](./FASTMCP_V3_FEATURES.md)** - FastMCP v3 capabilities
- **[docs/chatgpt-mcp-doc.md](./docs/chatgpt-mcp-doc.md)** - ChatGPT integration guide

## 🎯 Production Checklist

- [x] FastMCP v3 implementation complete
- [x] Local memory tools functional
- [x] Pieces MCP proxy integration complete
- [x] Hybrid search aggregator implemented
- [x] Graceful degradation when Pieces offline
- [x] Auto-reconnect on connection failures
- [x] LaunchAgent configuration
- [x] Docker Compose support
- [x] Health checks operational
- [x] Structured logging with brAInwav branding
- [ ] Pieces OS running on localhost:39300
- [ ] End-to-end testing with both memory sources

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

See [LICENSE](../../LICENSE) for licensing information.

---

**Maintained by: brAInwav Development Team**