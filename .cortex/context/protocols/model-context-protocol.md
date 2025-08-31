# Model Context Protocol (MCP) Documentation

## Introduction

The Model Context Protocol (MCP) is an open standard that enables AI applications to securely connect to data sources and tools. Think of MCP as a universal adapter for AI—similar to how USB-C provides a standardized connection for devices, MCP provides a standardized way to connect AI models to different data sources and capabilities.

### Key Benefits

- **Pre-built integrations** that AI applications can immediately use
- **Standardized protocol** for building custom connections
- **Open source ecosystem** free for everyone to implement
- **Portability** to move context between different applications

### Getting Started

Choose your path based on your goals:

- **Learn concepts**: Understand MCP architecture and core principles
- **Use existing servers**: Connect to available MCP servers immediately
- **Build servers**: Create servers to expose your data and tools
- **Build clients**: Develop applications that use MCP servers

## SDKs

Official SDKs are available for multiple programming languages, each providing full protocol support and following language-specific best practices:

**Available Languages**: TypeScript, Python, Go, Kotlin, Swift, Java, C#, Ruby, Rust

All SDKs support:

- Creating MCP servers with tools, resources, and prompts
- Building MCP clients for any server
- Local and remote transport protocols
- Type-safe protocol compliance

## Architecture

### Core Participants

**MCP Host**: The AI application (like Claude Desktop) that manages connections
**MCP Client**: Component that connects to a specific MCP server
**MCP Server**: Program that provides context and capabilities to clients

Each client maintains a dedicated one-to-one connection with its server, allowing hosts to connect to multiple servers simultaneously.

### Protocol Layers

**Data Layer**: JSON-RPC 2.0 protocol defining message structure and semantics

- Lifecycle management for connections
- Core primitives (tools, resources, prompts)
- Client capabilities (sampling, logging)
- Real-time notifications

**Transport Layer**: Communication mechanisms between clients and servers

- **Stdio**: Direct process communication for local servers
- **HTTP**: Remote server communication with authentication support

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

MCP clients can expose additional capabilities that servers leverage. One example is sampling: servers may request model completions via the client, enabling intelligent behaviors while keeping credentials in the host.

## Concepts of MCP

### Roots

Define filesystem boundaries for server operations, helping servers understand their allowed working directories.

### Elicitation

Enables servers to request specific information from users during interactions, creating dynamic workflows.

## Versioning

MCP uses date-based versioning (YYYY-MM-DD) indicating the last backwards-incompatible change. The current version is 2025-06-18. Version negotiation occurs during initialization, with graceful fallback when versions are incompatible.

## Frequently Asked Questions

### What is MCP?

MCP is a standard protocol that allows AI applications to connect to your data sources and tools, making AI assistants more helpful by giving them access to your specific information and capabilities.

### Why does MCP matter?

For users: More personalized AI assistance with access to your actual data
For developers: Reusable connections instead of building custom integrations.

### How does it work?

1. MCP servers connect to data sources/tools
2. AI applications use MCP clients to connect to servers
3. With user permission, AI models access these connections
4. Results flow back through the protocol layers

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

Once an open source MCP server is created for a data source, it can be used by any MCP-compatible AI application, creating a growing ecosystem of connections. See example servers at <https://github.com/modelcontextprotocol/servers>.
