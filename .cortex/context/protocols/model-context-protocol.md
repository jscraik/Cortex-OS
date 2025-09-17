# Model Context Protocol (MCP) Documentation

## Introduction

The Model Context Protocol (MCP) is comprehensively implemented across Cortex-OS as a central hub architecture
that enables secure, scalable AI tool integration. Our implementation follows a **centralized hub pattern**
with **A2A event bridge integration** for internal communication and **secure external access** via Cloudflare tunnels.

### Cortex-OS MCP Architecture

- **Central Hub**: All MCP communication routes through a centralized server (port 3024)
- **A2A Integration**: Internal communication flows through Application-to-Application events
- **Multi-Language Support**: TypeScript, Python, and Rust implementations
- **Secure External Access**: Cloudflare tunnel at `https://cortex-mcp.brainwav.io`
- **Zero-Downtime Operations**: Automated tunnel rotation and health monitoring

### Implementation Status

✅ **58+ MCP Tool Files** across all packages and applications
✅ **Central MCP Server** with FastMCP Python implementation
✅ **Transport Bridge** with circuit breaker and rate limiting
✅ **Registry System** with validation and discovery
✅ **A2A Event Bridge** for internal agent communication
✅ **Cloudflare Tunnel** with zero-downtime rotation

### Quick Start

- **Use MCP Tools**: Connect via central hub at `https://cortex-mcp.brainwav.io`
- **Internal Integration**: Use A2A events for agent-to-agent MCP calls
- **Develop Tools**: Follow package-specific MCP tool patterns
- **Deploy Services**: Leverage existing infrastructure and patterns

## SDKs

Official SDKs are available for multiple programming languages, each providing full protocol support and following language-specific best practices:

**Available Languages**: TypeScript, Python, Go, Kotlin, Swift, Java, C#, Ruby, Rust

All SDKs support:

- Creating MCP servers with tools, resources, and prompts
- Building MCP clients for any server
- Local and remote transport protocols
- Type-safe protocol compliance

## Architecture

### Implementation Overview

**Central MCP Hub**: Centralized server handling all external MCP communication
**A2A Event Bridge**: Internal communication layer using CloudEvents for agent coordination
**MCP Registry**: Discovery and validation service for available tools and servers
**Transport Bridge**: Protocol translation between stdio, HTTP, and WebSocket transports

### Core Components

**packages/mcp-core**: Enhanced MCP client with multi-transport support
**packages/mcp-registry**: File-based registry with schema validation
**packages/mcp-bridge**: Transport bridging with circuit breaker patterns
**packages/cortex-mcp**: Python FastMCP server implementation

### Communication Patterns

**Internal Communication (A2A Events)**:

```typescript
await bridge.sendEvent({
  source: 'urn:cortex:agents',
  type: 'cortex.mcp.tool.requested',
  data: { tool: 'search', serverName: 'cortex', args: {...} }
});
```

**External Communication (Central Hub)**:

```typescript
const client = createEnhancedClient({
  transport: 'http',
  endpoint: 'https://cortex-mcp.brainwav.io'
});
```

### Protocol Layers

**Application Layer**: A2A CloudEvents for internal agent communication
**MCP Layer**: Standard JSON-RPC 2.0 for external tool integration
**Transport Layer**: HTTP/WebSocket/Stdio with automatic bridge translation
**Security Layer**: Cloudflare tunnel with certificate-based authentication

### Core Primitives

#### Tools - AI Actions

Executable functions that AI models can invoke to perform actions.

**Example**: Search flights, send emails, create calendar events

**Protocol Methods**:

- `tools/list`: Discover available tools
- `tools/call`: Execute a specific tool

#### Resources - Context Data

Structured data sources that provide information to AI models.

**Example**: Documents, calendars, database records

**Protocol Methods**:

- `resources/list`: List available resources
- `resources/read`: Retrieve resource content
- `resources/subscribe`: Monitor changes

#### Prompts - Interaction Templates

Reusable templates for structuring AI interactions.

**Example**: "Plan vacation", "Summarize meetings", "Draft email"

**Protocol Methods**:

- `prompts/list`: Discover available prompts
- `prompts/get`: Retrieve a specific prompt template

### Tool Implementation

Tools use JSON Schema for validation and require user approval for execution:

```json
{
  "name": "searchFlights",
  "description": "Search for available flights",
  "inputSchema": {
    "type": "object",
    "properties": {
      "origin": { "type": "string" },
      "destination": { "type": "string" },
      "date": { "type": "string", "format": "date" }
    },
    "required": ["origin", "destination", "date"]
  }
}
```

### Resource Management

Resources support both direct access and templated patterns:

- Direct Resource: `file:///documents/report.pdf`
- Resource Template: `weather://forecast/{city}/{date}`

Templates enable dynamic queries with parameter completion for better UX.

## Client Concepts

MCP clients can expose additional capabilities that servers leverage. One example is sampling: servers may request
model completions via the client, enabling intelligent behaviors while keeping credentials in the host.

## Concepts of MCP

### Roots

Define filesystem boundaries for server operations, helping servers understand their allowed working directories.

### Elicitation

Enables servers to request specific information from users during interactions, creating dynamic workflows.

## Versioning

MCP uses date-based versioning (YYYY-MM-DD) indicating the last backwards-incompatible change.
The current version is 2025-06-18. Version negotiation occurs during initialization, with graceful fallback
when versions are incompatible.

## Implementation Coverage

### Language Support

**TypeScript (58+ tool files)**:

- `apps/cortex-webui/backend/src/mcp/tools.ts` - WebUI operations
- `packages/model-gateway/src/adapters/mcp-adapter.ts` - Model routing
- `packages/memories/src/mcp/tools.ts` - Memory management
- `packages/rag/src/mcp/tools.ts` - RAG operations
- `packages/agents/src/tools/MCPCallToolTool.ts` - Agent tool execution

**Python**:

- `packages/cortex-mcp/cortex_fastmcp_server_v2.py` - Main MCP server
- `apps/cortex-py/src/cortex_py/mcp/` - Embedding and health tools
- FastMCP 2.0 compatible implementation

**Rust**:

- `apps/cortex-code/codex-rs/mcp-client/src/mcp_client.rs` - Async MCP client
- `apps/cortex-code/codex-rs/mcp-types/src/lib.rs` - Generated type system
- Full protocol compliance with typed interfaces

### Infrastructure

**Central Server**:

- Script: `scripts/start-mcp-server.sh`
- Port: 3024 (enforced, legacy port 3004 deprecated)
- Health checks and process management

**Cloudflare Tunnel**:

- Config: `config/cloudflared/mcp-tunnel.yml`
- Rotation: `scripts/cloudflare/mcp-tunnel-rotate.sh`
- External endpoint: `https://cortex-mcp.brainwav.io`

**A2A Bridge**:

- Implementation: `packages/agents/src/utils/a2aBridge.ts`
- CloudEvent-compliant internal communication
- Agent registry and capability discovery

## Frequently Asked Questions

### How is MCP implemented in Cortex-OS?

Cortex-OS uses a **central hub architecture** where all MCP communication flows through a centralized server.
Internal communication between agents uses A2A events, while external tool access goes through the central MCP hub
with Cloudflare tunnel security.

### What tools are available?

We have **58+ MCP tool implementations** covering:

- Memory management and vector search
- Model gateway and routing
- RAG pipeline operations  
- Web UI interactions
- Security and compliance tools
- Agent orchestration and coordination

### How do I add new MCP tools?

1. Create tool in appropriate package's `src/mcp/tools.ts`
2. Follow existing patterns for parameter validation
3. Register with central MCP registry
4. Add A2A event handlers if needed for internal communication

### How does security work?

- All external MCP communication secured via Cloudflare tunnels
- Certificate-based authentication
- Rate limiting and circuit breaker patterns
- Zero-downtime tunnel rotation for maintenance

### Who maintains MCP servers?

- Anthropic developers for common tools
- Open source community contributors
- Enterprise teams for internal systems
- Software providers making their apps AI-ready

The ecosystem grows as each new server becomes available to all MCP-compatible applications.

- Developers at Anthropic who build servers for common tools and data sources
- Open source contributors who create servers for tools they use
- Enterprise development teams building servers for their internal systems
- Software providers making their applications AI-ready

Once an open source MCP server is created for a data source, it can be used by any MCP-compatible AI application,
creating a growing ecosystem of connections. See example servers at <https://github.com/modelcontextprotocol/servers>.
