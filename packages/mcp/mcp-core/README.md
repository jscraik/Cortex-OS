# @cortex-os/mcp-core

Minimal client utilities and contracts for building Model Context Protocol integrations within Cortex-OS.

## Features
- Typed `ServerInfo` contracts
- Enhanced client with rate limiting and secret redaction
- Shared security utilities via `redactSensitiveData`

## Usage
```ts
import { createEnhancedClient } from '@cortex-os/mcp-core';

const client = await createEnhancedClient({
  name: 'demo',
  transport: 'stdio',
  command: 'echo',
});
```

## Development
- `pnpm exec tsc -p packages/mcp/mcp-core/tsconfig.json --noEmit`
- `pnpm exec eslint packages/mcp/mcp-core/src`
- `node ../../../node_modules/vitest/vitest.mjs run --coverage`
