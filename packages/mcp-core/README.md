# @cortex-os/mcp-core

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](coverage)

Minimal building blocks for the Model Context Protocol.

## Features

- **Runtime validation** via Zod schemas
- **Enhanced client** with HTTP and stdio transports
- **Typed contracts** for server configuration

## Memory Management

To prevent memory issues during development:

1. Use the MCP-aware memory manager:

   ```bash
   ./scripts/memory-manager-mcp.sh --gentle
   ```

2. Run tests with memory constraints:

   ```bash
   ./scripts/run-mcp-tests.sh mcp-core
   ```

## Usage

```typescript
import { createEnhancedClient } from "@cortex-os/mcp-core";

const client = await createEnhancedClient({
  name: "example",
  transport: "streamableHttp",
  endpoint: "http://localhost:3000/tool"
});

const result = await client.callTool({ name: "ping" });
await client.close();
```

## Test Coverage

This package maintains 90%+ test coverage. Run tests with:

```bash
./scripts/run-mcp-tests.sh mcp-core true
```

## License

Apache 2.0
