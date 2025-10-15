# MCP Package

Core Model Context Protocol (MCP) implementation for Cortex OS.

## Overview

This package provides the main MCP server implementation and related functionality for the Cortex OS ecosystem. It includes server components, connectors, capabilities, and tool management.

## Structure

- `src/` - Core implementation
  - `server.ts` - Main MCP server implementation
  - `connectors/` - Connector management and proxy functionality
  - `capabilities/` - Tools, resources, and prompts capabilities
  - `auth/` - Authentication and authorization
  - `registry/` - Tool registry and versioning
  - `handlers/` - Request handlers
  - `notifications/` - Notification system
- `dist/` - Compiled JavaScript output (generated)

## Key Components

### Server

The main MCP server that handles protocol communication and routes requests.

### Connectors

Manages external service connections and provides proxy functionality for remote tools.

### Capabilities

Implements MCP capabilities:

- **Tools**: Dynamic tool registration and execution
- **Resources**: Resource management and access
- **Prompts**: Prompt template handling

### Authentication

JWT-based authentication and authorization middleware.

## Usage

```typescript
import { Server } from '@cortex-os/mcp';
import { ConnectorProxyManager } from '@cortex-os/mcp/connectors';

// Create and configure server
const server = new Server({
  name: 'cortex-mcp-server',
  version: '1.0.0'
});

// Start server
await server.start();
```

## Development

```bash
# Build
pnpm build

# Type checking
pnpm typecheck

# Test
pnpm test

# Watch mode for tests (disabled for memory safety)
pnpm test:watch
```

## Dependencies

### Runtime Dependencies

- `@cortex-os/mcp-core` - Core MCP types and utilities
- `@cortex-os/mcp-bridge` - Bridge for remote MCP connections
- `@cortex-os/orchestration` - Policy routing and orchestration
- `@cortex-os/protocol` - Protocol definitions and schemas
- `@cortex-os/utils` - Shared utilities
- `jsonwebtoken` - JWT token handling
- `lodash-es` - Utility functions
- `semver` - Semantic versioning
- `zod` - Schema validation

### Development Dependencies

- TypeScript and related type definitions
- Vitest for testing
- Coverage reporting tools

## Notes

This package was automatically configured to resolve TypeScript installation issues. The package includes:

1. **package.json** - Complete dependency configuration
2. **tsconfig.json** - TypeScript compilation settings
3. **src/index.ts** - Main entry point with exports

The TypeScript server path issue has been resolved by ensuring proper package structure and dependencies.

