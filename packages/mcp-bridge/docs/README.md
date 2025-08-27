# MCP (Model Context Protocol) Documentation

Welcome to the Cortex OS MCP ecosystem! This documentation will help you understand, develop, and deploy MCP plugins and tools.

## Quick Start

- 🚀 [Getting Started](./getting-started.md) - Set up your first MCP plugin
- 📚 [Plugin Development Guide](./plugin-development.md) - Create custom MCP tools
- 🏪 [Marketplace Guide](./marketplace.md) - Discover and manage plugins
- 🔧 [API Reference](./api-reference.md) - Complete API documentation

## What is MCP?

The Model Context Protocol (MCP) enables secure, standardized connections between AI systems and external tools. Our implementation provides:

- **Plugin Marketplace** - Discover and install verified MCP tools
- **Security Sandbox** - Isolated execution environment for plugins
- **Type Safety** - Full TypeScript support with Zod validation
- **JSON-RPC 2.0** - Standards-compliant communication protocol

## Architecture Overview

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │◄──►│  Plugin Registry │◄──►│   Marketplace   │
│                 │    │                 │    │                 │
│ • Tool Calling  │    │ • Installation  │    │ • Discovery     │
│ • JSON-RPC 2.0  │    │ • Validation    │    │ • Categories    │
│ • WebSocket     │    │ • Security      │    │ • Ratings       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   MCP Sandbox   │
                       │                 │
                       │ • Isolation     │
                       │ • Resource Mgmt │
                       │ • Security      │
                       └─────────────────┘
```

## Key Features

### 🔒 Security First

- Sandboxed plugin execution
- Resource limits and monitoring
- Security policy enforcement
- Allowlist-based tool access

### 🚀 Developer Experience

- TypeScript-first development
- Hot reload during development
- Comprehensive error handling
- Rich debugging tools

### 🏪 Plugin Marketplace

- Verified plugin repository
- Category-based discovery
- User ratings and reviews
- Automatic dependency management

### 🔧 Tool Integration

- JSON-RPC 2.0 compliant
- WebSocket real-time communication
- Bidirectional streaming
- Error recovery and retries

## Examples

### Basic Plugin Structure

```typescript
import { McpPlugin } from '@cortex-os/mcp-bridge/auth';

export const configValidator: McpPlugin = {
  name: 'config-validator',
  version: '1.0.0',
  description: 'Validates Cortex OS configurations',
  tools: [
    {
      name: 'validate-config',
      description: 'Validate a configuration file',
      inputSchema: {
        type: 'object',
        properties: {
          config: { type: 'object' },
          strict: { type: 'boolean', default: false },
        },
        required: ['config'],
      },
      handler: async (args) => {
        // Tool implementation
        return { valid: true, errors: [] };
      },
    },
  ],
};
```

### Client Usage

```typescript
import { createMcpClient } from '@cortex-os/mcp-bridge/client';

const client = createMcpClient('ws://localhost:8080');
await client.connect();
await client.initialize();

const result = await client.callTool('validate-config', {
  config: { mode: 'production' },
  strict: true,
});
```

## Documentation Structure

- **[Getting Started](./getting-started.md)** - Installation and first steps
- **[Plugin Development](./plugin-development.md)** - Building MCP plugins
- **[Client API](./client-api.md)** - Using the MCP client
- **[Marketplace](./marketplace.md)** - Publishing and discovering plugins
- **[Security](./security.md)** - Security model and best practices
- **[Examples](./examples/)** - Real-world plugin examples
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## Contributing

We welcome contributions to the MCP ecosystem! Please see our [contribution guidelines](./contributing.md) for more information.

## Support

- 📖 [Documentation](./README.md)
- 🐛 [Issues](https://github.com/jamiescottcraik/cortex-os/issues)
- 💬 [Discussions](https://github.com/jamiescottcraik/cortex-os/discussions)
- 📧 [Contact](mailto:jamie@cortexos.ai)
