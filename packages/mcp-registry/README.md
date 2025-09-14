# @cortex-os/mcp-registry

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](coverage)

File-system backed registry for managing MCP server configurations.

## Features

- **Atomic writes** with file locking for consistency
- **Schema validation** for server entries
- **Cross-platform** file system support

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

## Usage

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

## Test Coverage

This package maintains 90%+ test coverage. Run tests with:

```bash
./scripts/run-mcp-tests.sh mcp-registry true
```

## License

Apache 2.0
