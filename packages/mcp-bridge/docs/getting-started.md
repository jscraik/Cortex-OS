# Getting Started with MCP

This guide will walk you through installing, configuring, and using the Cortex OS MCP (Model Context Protocol) system.

## Prerequisites

- Node.js 18+ and pnpm
- TypeScript knowledge (recommended)
- Basic understanding of AI/LLM tools

## Installation

### 1. Install the MCP Package

```bash
# In your Cortex OS workspace
pnpm add @cortex-os/mcp-bridge

# Or if starting a new project
pnpm create cortex-plugin my-mcp-plugin
cd my-mcp-plugin
pnpm install
```

### 2. Verify Installation

```bash
# Run the included tests
pnpm test

# Check available MCP tools
pnpm mcp:list
```

## Quick Start: Your First MCP Tool

### 1. Create a Simple Plugin

Create `src/hello-world.plugin.ts`:

```typescript
import { McpPlugin } from '@cortex-os/mcp-bridge/auth';

export const helloWorldPlugin: McpPlugin = {
  name: 'hello-world',
  version: '1.0.0',
  description: 'A simple greeting tool',

  tools: [
    {
      name: 'greet',
      description: 'Generate a personalized greeting',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the person to greet',
          },
          language: {
            type: 'string',
            enum: ['en', 'es', 'fr'],
            default: 'en',
            description: 'Language for the greeting',
          },
        },
        required: ['name'],
      },

      handler: async (args) => {
        const { name, language = 'en' } = args;

        const greetings = {
          en: `Hello, ${name}! Welcome to MCP.`,
          es: `¡Hola, ${name}! Bienvenido a MCP.`,
          fr: `Bonjour, ${name}! Bienvenue dans MCP.`,
        };

        return {
          content: [
            {
              type: 'text',
              text: greetings[language as keyof typeof greetings],
            },
          ],
        };
      },
    },
  ],
};
```

### 2. Register Your Plugin

Create `src/index.ts`:

```typescript
import { PluginRegistry } from '@cortex-os/mcp-bridge';
import { helloWorldPlugin } from './hello-world.plugin.js';

// Initialize the plugin registry
const registry = new PluginRegistry();

// Register your plugin
await registry.installPlugin({
  name: 'hello-world',
  version: '1.0.0',
  source: 'local',
  path: './hello-world.plugin.js',
});

export { helloWorldPlugin };
```

### 3. Test Your Plugin

Create `src/test-plugin.ts`:

```typescript
import { createMcpClient } from '@cortex-os/mcp-bridge/client';

async function testPlugin() {
  // Create a client (assumes MCP server is running)
  const client = createMcpClient('ws://localhost:8080');

  try {
    // Connect to the server
    await client.connect();
    await client.initialize();

    // Call your tool
    const result = await client.callTool('greet', {
      name: 'Alice',
      language: 'en',
    });

    console.log('Tool result:', result);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.disconnect();
  }
}

// Run the test
testPlugin();
```

### 4. Run Your Plugin

```bash
# Start the MCP server (if not already running)
pnpm mcp:start

# In another terminal, test your plugin
pnpm tsx src/test-plugin.ts
```

## Understanding the MCP Architecture

### Plugin Structure

Every MCP plugin consists of:

- **Metadata**: Name, version, description
- **Tools**: Individual functions the plugin provides
- **Input Schema**: Zod/JSON Schema validation for tool parameters
- **Handler**: Async function that implements the tool logic

### Tool Input/Output

Tools follow a standardized format:

```typescript
// Input: JSON object matching your schema
const input = {
  name: 'Alice',
  language: 'en',
};

// Output: Structured response with content array
const output = {
  content: [
    {
      type: 'text', // or 'image', 'file', etc.
      text: 'Hello, Alice! Welcome to MCP.',
    },
  ],
  metadata: {
    // Optional metadata about the operation
    processingTime: 150,
    confidence: 0.95,
  },
};
```

### Security Model

MCP plugins run in a sandboxed environment:

- **Resource Limits**: CPU, memory, and execution time constraints
- **Network Access**: Controlled via allowlists
- **File System**: Limited to designated directories
- **API Access**: Only approved external services

## Development Workflow

### 1. Plugin Development

```bash
# Create new plugin
pnpm create cortex-plugin my-plugin

# Development with hot reload
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### 2. Local Testing

```bash
# Install plugin locally
pnpm mcp:install ./dist/my-plugin.js

# Test specific tools
pnpm mcp:test my-plugin greet --args '{"name":"Test"}'

# Debug with logs
DEBUG=mcp:* pnpm mcp:test my-plugin greet
```

### 3. Publishing

```bash
# Package for distribution
pnpm pack

# Publish to marketplace (requires verification)
pnpm mcp:publish
```

## Common Patterns

### Error Handling

```typescript
handler: async (args) => {
  try {
    const result = await someAsyncOperation(args);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    // Return structured error
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
      error: {
        code: 'OPERATION_FAILED',
        message: error.message,
        details: { args },
      },
    };
  }
};
```

### Async Operations

```typescript
handler: async (args) => {
  // For long-running operations, provide progress
  const onProgress = (progress: number) => {
    // Report progress back to client
    this.emit('progress', { toolName: 'my-tool', progress });
  };

  const result = await longRunningTask(args, onProgress);
  return { content: [{ type: 'text', text: result }] };
};
```

### Complex Responses

```typescript
handler: async (args) => {
  return {
    content: [
      { type: 'text', text: 'Analysis complete!' },
      {
        type: 'image',
        data: base64ImageData,
        mimeType: 'image/png',
      },
      {
        type: 'file',
        name: 'report.json',
        data: JSON.stringify(analysisData),
        mimeType: 'application/json',
      },
    ],
    metadata: {
      itemsProcessed: 1500,
      duration: 2340,
      cacheHit: false,
    },
  };
};
```

## Next Steps

- 📚 [Plugin Development Guide](./plugin-development.md) - Advanced plugin creation
- 🏪 [Marketplace Guide](./marketplace.md) - Discover existing plugins
- 🔧 [API Reference](./api-reference.md) - Complete API documentation
- 🛡️ [Security Guide](./security.md) - Security best practices
- 📖 [Examples](./examples/) - Real-world plugin examples

## Troubleshooting

### Common Issues

1. **Plugin not loading**: Check file paths and import statements
2. **Tool not found**: Verify plugin registration and tool names
3. **Schema validation errors**: Check input schemas match your data
4. **Connection issues**: Ensure MCP server is running and accessible

See the [Troubleshooting Guide](./troubleshooting.md) for more detailed solutions.

## Support

- 🐛 [Report Issues](https://github.com/jamiescottcraik/cortex-os/issues)
- 💬 [Community Discussions](https://github.com/jamiescottcraik/cortex-os/discussions)
- 📖 [Documentation](./README.md)
