<!--
This README.md file follows WCAG 2.1 AA accessibility guidelines:
- Clear document structure with semantic headings
- Descriptive link text
- Alternative text for images
- High contrast content organization
-->

# Cortex OS MCP Package

## Overview

This package consolidates Model Context Protocol utilities for Cortex OS. It re-exports the core libraries and transport bridge so downstream tooling can consume them from a single entry point.

## Features

- Client utilities for interacting with MCP servers
- Plugin management and marketplace support
- Docker toolkit integration
- Python sidecar support

## Directory Structure

```text
packages/mcp/
├── src/
│   ├── index.ts
│   ├── mcp-protocol-conformance.test.ts
│   └── test/
│       └── sse-security.test.ts
├── mcp-core/
├── mcp-registry/
├── mcp-servers/
├── mcp-transport-bridge/
├── scripts/
│   ├── start-mcp-with-tunnel.sh
│   └── test-mcp.sh
├── infrastructure/
│   └── cloudflare/
├── package.json
└── README.md
```

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build
```

## Usage

```javascript
// Plugin Registry
import { PluginRegistry, PluginValidator } from '@cortex-os/mcp';

const registry = new PluginRegistry();
await registry.refreshMarketplace();
const plugins = registry.searchPlugins({ query: 'linear' });

const validator = new PluginValidator();
const result = validator.validatePlugin(pluginMetadata);
```

## Scripts

From the repository root:

```bash
pnpm mcp:start              # Start MCP server
pnpm mcp:dev                # Run in development mode
pnpm mcp:build              # Build the package
pnpm mcp:test               # Run tests
pnpm mcp:start-with-tunnel  # Start with tunnel
```

## Testing

The package includes unit tests for protocol conformance and SSE security.

```bash
pnpm test
```

## Architecture Benefits

This consolidation ensures:

1. **Single Source of Truth**: All MCP functionality is in one place
2. **Clear Boundaries**: Architectural separation from other packages
3. **Easier Maintenance**: Simpler imports and dependency management
4. **Better Organization**: Logical grouping of related functionality

## Accessibility

This module follows WCAG 2.1 AA accessibility guidelines. All interactive elements are keyboard accessible and screen reader compatible.
