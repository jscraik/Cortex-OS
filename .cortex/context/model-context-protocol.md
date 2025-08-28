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
|-----------|---------|---------|----------|
| **Tools** | Actions | Model-controlled | API calls, file operations |- `prompts/list`: Discover available prompts
| **Resources** | Context | Application-controlled | Documents, data feeds |
| **Prompts** | Templates | User-controlled | Workflow templates |
Concepts

### Tool Implementation

rpose | Control | Examples |P servers
Tools use JSON Schema for validation and require user approval for execution:

```jsone="Explore Examples" icon="code" href="https://github.com/modelcontextprotocol/servers">
{    Browse pre-built servers for inspiration
  "name": "searchFlights",
  "description": "Search for available flights",
  "inputSchema": {
    "type": "object",    Dive deeper into how MCP works
    "properties": {
      "origin": {"type": "string"},</CardGroup>
      "destination": {"type": "string"},
      "date": {"type": "string", "format": "date"}# Architecture Overview
    },
    "required": ["origin", "destination", "date"]This overview of the Model Context Protocol (MCP) discusses its [scope](#scope) and [core concepts](#concepts-of-mcp), and provides an [example](#example) demonstrating each core concept.
  }
}Because MCP SDKs abstract away many concerns, most developers will likely find the [data layer protocol](#data-layer-protocol) section to be the most useful. It discusses how MCP servers can provide context to an AI application.
```

uage-specific SDK](/docs/sdk).

### Resource Management

Resources support both direct access and templated patterns:
del Context Protocol includes the following projects:
**Direct Resource**: `file:///documents/report.pdf`
**Resource Template**: `weather://forecast/{city}/{date}`ation/latest): A specification of MCP that outlines the implementation requirements for clients and servers.
SDKs](/docs/sdk): SDKs for different programming languages that implement MCP.
Templates enable dynamic queries with parameter completion for better user experience.- **MCP Development Tools**: Tools for developing MCP servers and clients, including the [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
erver Implementations](<https://github.com/modelcontextprotocol/servers>): Reference implementations of MCP servers.

## Client Concepts

MCP clients provide additional capabilities that servers can leverage: MCP focuses solely on the protocol for context exchange—it does not dictate

### Sampling</Note>

Allows servers to request AI model completions through the client, enabling intelligent behaviors while maintaining security.

## Concepts of MCP

### Roots

Define filesystem boundaries for server operations, helping servers understand their allowed working directories.

### ElicitationMCP follows a client-server architecture where an MCP host — an AI application like [Claude Code](https://www.anthropic.com/claude-code) or [Claude Desktop](https://www.claude.ai/download) — establishes connections to one or more MCP servers. The MCP host accomplishes this by creating one MCP client for each MCP server. Each MCP client maintains a dedicated one-to-one connection with its corresponding MCP server

Enables servers to request specific information from users during interactions, creating dynamic workflows.

## Versioning

- **MCP Host**: The AI application that coordinates and manages one or multiple MCP clients
  MCP uses date-based versioning (`YYYY-MM-DD`) indicating the last backwards-incompatible change. The current version is **2025-06-18**.ient**: A component that maintains a connection to an MCP server and obtains context from an MCP server for the MCP host to use
  Server**: A program that provides context to MCP clients
  Version negotiation occurs during initialization, with graceful fallback if versions are incompatible.
  Code acts as an MCP host. When Visual Studio Code establishes a connection to an MCP server, such as the [Sentry MCP server](https://docs.sentry.io/product/sentry-mcp/), the Visual Studio Code runtime instantiates an MCP client object that maintains the connection to the Sentry MCP server.

## Frequently Asked Questionsently connects to another MCP server, such as the [local filesystem server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem), the Visual Studio Code runtime instantiates an additional MCP client object to maintain this connection, hence maintaining a one-to-one

MCP servers.

### What is MCP?

MCP is a standard protocol that allows AI applications to connect to your data sources and tools, making AI assistants more helpful by giving them access to your specific information and capabilities.```mermaid

### Why does MCP matter?

For users: More personalized AI assistance with access to your actual data
For developers: Reusable connections instead of building custom integrations Client2["MCP Client 2"]

### How does it work?

1. MCP servers connect to data sources/tools
2. AI applications use MCP clients to connect to servers Server1["MCP Server 1<br/>(e.g., Sentry)"]
3. With user permission, AI models access these connections(e.g., Filesystem)"]
4. Results flow back through the protocol layers(e.g., Database)"]

### Who maintains MCP servers?/>connection"| Server1

- Anthropic developers for common tools/>connection"| Server2
- Open source community contributors/>connection"| Server3
- Enterprise teams for internal systems
- Software providers making their apps AI-ready style Client1 fill:#e1f5fe

The ecosystem grows as each new server becomes available to all MCP-compatible applications.

- Developers at Anthropic who build servers for common tools and data sources
- Open source contributors who create servers for tools they use
- Enterprise development teams building servers for their internal systems
- Software providers making their applications AI-ready

Once an open source MCP server is created for a data source, it can be used by any MCP-compatible AI application, creating a growing ecosystem of connections. See our [list of example servers](/examples), or [get started building your own server](/quickstart/server).
