<!--
This README.md file follows WCAG 2.1 AA accessibility guidelines:
- Clear document structure with semantic headings
- Descriptive link text
- High contrast content organization
-->

# MCP Bridge

## Overview

The MCP Bridge connects external Model Context Protocol (MCP) servers to Cortex OS. It provides:

- **Plugin Registry** – discover, install, and manage MCP plugins.
- **Plugin Validator** – enforce manifest and capability checks.
- **Universal CLI Handler** – normalize commands from Cortex CLI, Claude Desktop, VS Code, and other frontends.

## Build and Test

```bash
pnpm --filter @cortex-os/mcp-bridge build
# WARNING: The following test command is known to fail with module resolution errors.
# See [Troubleshooting](./docs/getting-started.md#troubleshooting) for more information.
pnpm --filter @cortex-os/mcp-bridge test
```

## Example Usage

### Registry and Validation

```typescript
import { PluginRegistry, PluginValidator } from '@cortex-os/mcp-bridge';

const registry = new PluginRegistry();
await registry.refreshMarketplace();

const validator = new PluginValidator();
const [plugin] = registry.searchPlugins({ query: 'demo' });
const result = validator.validatePlugin(plugin);
```

### Universal CLI Handler

```bash
cortex mcp add ref-server https://api.ref.tools/mcp
```

## Further Reading

See the [MCP Bridge documentation](./docs/getting-started.md) for installation and plugin development guides.
