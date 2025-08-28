<!--
This document follows WCAG 2.1 AA guidelines:
- Semantic headings
- Descriptive link text
-->

# MCP Bridge Documentation

## Role

The MCP Bridge mediates communication between Cortex OS and external MCP servers. It serves as:

- **Plugin Registry** – a catalog for discovering and installing MCP plugins.
- **Plugin Validator** – a gatekeeper that checks manifests and capabilities.
- **Universal CLI Handler** – a parser that accepts commands from any frontend.

## Build and Test

```bash
pnpm --filter @cortex-os/mcp-bridge build
pnpm --filter @cortex-os/mcp-bridge test
```

## Example

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

## Additional Resources

- [Getting Started Guide](./getting-started.md)
- [Plugin Development Guide](./plugin-development.md)
- [Marketplace Guide](./marketplace.md)
