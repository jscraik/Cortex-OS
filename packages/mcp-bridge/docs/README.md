<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

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

<!--
The build and test commands are currently non-functional due to missing modules.
Please refer to project setup instructions or ensure all dependencies are installed before running build/test commands.
-->

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
