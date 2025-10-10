# @cortex-os/mcp-registry

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)](coverage)

File-system backed registry for managing MCP server configurations with full Model Context Protocol integration.

## Features

- **Atomic writes** with file locking for consistency
- **Schema validation** for server entries
- **Cross-platform** file system support
- **Full MCP integration** with 5 tool endpoints for external AI agents
- **Type-safe interfaces** with Zod schema validation
- **Comprehensive error handling** and validation

## MCP Tools

This package exposes 5 MCP tools for external AI agents:

### 1. Registry List (`registry.list`)

List registered MCP servers with optional filtering.

**Aliases:** `mcp_registry_list`, `list_servers`

**Parameters:**

- `namePattern?: string` - Filter by name pattern (supports wildcards)
- `transport?: "stdio" | "sse" | "http" | "ws" | "streamableHttp"` - Filter by transport type
- `tags?: string[]` - Filter by tags (searches in name and command)
- `limit?: number` - Maximum servers to return (default: 50, max: 100)
- `includeInactive?: boolean` - Include inactive servers (default: false)

**Example:**

```typescript
import { registryListTool } from '@cortex-os/mcp-registry';

const response = await registryListTool.handler({
  namePattern: 'production-*',
  transport: 'stdio',
  limit: 10
});
```

### 2. Registry Register (`registry.register`)

Register a new MCP server in the registry.

**Aliases:** `mcp_registry_register`, `register_server`

**Parameters:**

- `server: ServerInfo` - Server configuration to register
  - `name: string` - Unique server name
  - `transport: TransportKind` - Transport type
  - `command?: string` - Command for stdio transport
  - `args?: string[]` - Command arguments
  - `env?: Record<string, string>` - Environment variables
  - `endpoint?: string` - Endpoint for HTTP/WS transports
  - `headers?: Record<string, string>` - HTTP headers
- `overwrite?: boolean` - Allow overwriting existing server (default: false)

**Example:**

```typescript
import { registryRegisterTool } from '@cortex-os/mcp-registry';

const response = await registryRegisterTool.handler({
  server: {
    name: 'my-mcp-server',
    transport: 'stdio',
    command: 'node',
    args: ['server.js'],
    env: { DEBUG: '1' }
  },
  overwrite: false
});
```

### 3. Registry Unregister (`registry.unregister`)

Remove a server from the registry.

**Aliases:** `mcp_registry_unregister`, `unregister_server`

**Parameters:**

- `name: string` - Name of server to unregister
- `force?: boolean` - Force removal even if active (default: false)

**Example:**

```typescript
import { registryUnregisterTool } from '@cortex-os/mcp-registry';

const response = await registryUnregisterTool.handler({
  name: 'my-mcp-server'
});
```

### 4. Registry Get (`registry.get`)

Get details of a specific registered server.

**Aliases:** `mcp_registry_get`, `get_server`

**Parameters:**

- `name: string` - Name of server to retrieve
- `includeStatus?: boolean` - Include status information (default: false)

**Example:**

```typescript
import { registryGetTool } from '@cortex-os/mcp-registry';

const response = await registryGetTool.handler({
  name: 'my-mcp-server',
  includeStatus: true
});
```

### 5. Registry Stats (`registry.stats`)

Get registry statistics and health information.

**Aliases:** `mcp_registry_stats`, `registry_statistics`

**Parameters:**

- `includeDetails?: boolean` - Include detailed statistics (default: false)

**Example:**

```typescript
import { registryStatsTool } from '@cortex-os/mcp-registry';

const response = await registryStatsTool.handler({
  includeDetails: true
});
```

## Memory Management

To prevent memory issues during development:

1. Use the MCP-aware memory manager:

   ```bash
   ./scripts/memory-manager-mcp.sh --gentle
   ```

2. Run tests with memory constraints:

   ```bash
   ./scripts/run-mcp-tests.sh mcp-registry
   ```

## Basic Usage

### Core Registry Functions

```typescript
import { upsert, readAll, remove } from '@cortex-os/mcp-registry';

// Register a new server
await upsert({
  name: 'example-server',
  transport: 'stdio',
  command: 'example-command'
});

// List all registered servers
const servers = await readAll();

// Remove a server
await remove('example-server');
```

### MCP Tool Integration

```typescript
import { 
  registryMcpTools,
  registryListTool,
  registryRegisterTool
} from '@cortex-os/mcp-registry';

// Use individual tools
const listResponse = await registryListTool.handler({
  transport: 'stdio'
});

// Register multiple servers
await registryRegisterTool.handler({
  server: {
    name: 'http-server',
    transport: 'http',
    endpoint: 'http://localhost:8080/mcp'
  }
});

// Export all tools for MCP server integration
export { registryMcpTools };
```

## Server Configuration Examples

### stdio Transport

```typescript
{
  name: 'stdio-server',
  transport: 'stdio',
  command: 'node',
  args: ['server.js', '--verbose'],
  env: { DEBUG: '1', NODE_ENV: 'production' }
}
```

### HTTP Transport

```typescript
{
  name: 'http-server',
  transport: 'http',
  endpoint: 'https://api.example.com/mcp',
  headers: { 
    'Authorization': 'Bearer token123',
    'Content-Type': 'application/json'
  }
}
```

### Server-Sent Events Transport

```typescript
{
  name: 'sse-server',
  transport: 'sse',
  endpoint: 'https://events.example.com/mcp'
}
```

### WebSocket Transport

```typescript
{
  name: 'ws-server',
  transport: 'ws',
  endpoint: 'wss://ws.example.com/mcp'
}
```

## Error Handling

All MCP tools return structured error responses with correlation IDs for tracking:

```typescript
const response = await registryGetTool.handler({ name: 'nonexistent' });

if (response.isError) {
  const error = JSON.parse(response.content[0].text);
  console.error(`Error: ${error.error} - ${error.message}`);
  console.error(`Correlation ID: ${response.metadata.correlationId}`);
}
```

## Validation

The package includes comprehensive schema validation:

- Server names must match pattern: `/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/`
- Maximum server name length: 128 characters
- Maximum servers returned by list: 100
- Required transport types: `stdio | sse | http | ws | streamableHttp`

## Test Coverage

This package maintains 95%+ test coverage with comprehensive unit and integration tests. Run tests with:

```bash
# Run all tests
pnpm test

# Run with coverage report
pnpm test:coverage

# Run MCP-specific tests
./scripts/run-mcp-tests.sh mcp-registry true
```

## Integration with MCP Ecosystem

The registry integrates seamlessly with the broader MCP ecosystem:

```typescript
import { ToolRegistry } from '@cortex-os/mcp-core';
import { registryMcpTools } from '@cortex-os/mcp-registry';

const toolRegistry = new ToolRegistry();

// Register all registry MCP tools
registryMcpTools.forEach(tool => {
  toolRegistry.register(tool);
});

// Execute tools programmatically
const result = await toolRegistry.execute('registry.list', { limit: 5 });
```

## License

Apache 2.0

## Definition of Done
- [ ] Declarative registry; lazy loading; hot-reload in dev.
- [ ] `list/register/read` APIs stable.

## Test Plan
- [ ] Discovery + invocation of one tool, one resource, one prompt.

> See `CHECKLIST.cortex-os.md` for the full CI gate reference.

