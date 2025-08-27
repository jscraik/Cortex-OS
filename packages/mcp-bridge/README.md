<!--
This README.md file follows WCAG 2.1 AA accessibility guidelines:
- Clear document structure with semantic headings
- Descriptive link text
- Alternative text for images
- High contrast content organization
-->

# Cortex OS MCP Package

## Overview

This is the consolidated Model Context Protocol (MCP) package for Cortex OS. All MCP-related functionality has been centralized here to maintain better organization and architectural boundaries.

**New in v0.2.0**: 🔒 **Universal MCP Manager** - Secure MCP server management with universal CLI support across all frontends.

Client utilities for interacting with MCP servers, plugin management, marketplace functionality, infrastructure tools, and **universal secure server management**.

## Features

### 🛡️ Universal Secure MCP Management

- **Multi-Frontend Support**: Works with Cortex CLI, Claude Desktop, VS Code, GitHub Copilot, Gemini CLI, and any custom CLI
- **Security Validation**: HTTPS enforcement, domain allowlists, API key validation, capability filtering
- **Risk Assessment**: Automatic low/medium/high risk classification with appropriate approval workflows
- **Web Interface**: Interactive browser-based testing and management
- **REST API**: Programmatic access for integrations

### 🔧 Traditional MCP Features

- Client utilities for MCP servers
- Plugin management and marketplace
- Docker toolkit integration
- Python sidecar support

## Directory Structure

```text
apps/cortex-os/packages/mcp/
├── src/                    # Main source code
│   ├── universal-mcp-manager.ts    # 🆕 Universal secure MCP management
│   ├── universal-cli-handler.ts    # 🆕 CLI interface for all frontends
│   ├── web-mcp-interface.ts        # 🆕 Web API and demo interface
│   ├── mcp-demo-server.ts          # 🆕 Demo Express server
│   ├── tools/              # MCP tools
│   │   └── docker/         # Docker toolkit (formerly mcp_tools/docker/)
│   ├── python/             # Python sidecar (formerly packages/mcp-python/)
│   └── index.ts            # Main package exports
├── scripts/                # MCP-related scripts
│   ├── test-mcp.sh         # Test script
│   ├── start-mcp-with-tunnel.sh  # Start with tunnel
│   └── smoke/              # Smoke tests
├── config/                 # Configuration files
│   ├── README.md           # Docker MCP toolkit docs
│   ├── mcp.config.yaml     # Main config
│   ├── .mcp.json           # Runtime config
│   └── .mcp.config.json    # User config
├── infrastructure/         # Infrastructure configs
│   └── cloudflare/         # Tunnel configuration
└── package.json
```

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build
```

## Universal MCP Manager Usage

### 🚀 Quick Start with Demo Server

```bash
# Start the interactive demo server
pnpm demo

# Open http://localhost:3000 in your browser
```

### 🔒 Security-First MCP Management

The Universal MCP Manager accepts commands from any CLI format and applies consistent security validation:

**Cortex CLI Format:**

```bash
cortex mcp add --transport http Ref "https://api.ref.tools/mcp?apiKey=ref-e672788111c76ba32bc1"
```

**Claude Desktop Format:**

```bash
claude mcp add --transport http ref-server https://api.ref.tools/mcp --header "Authorization: Bearer token"
```

**Gemini CLI Format:**

```bash
gemini mcp add ref-server --url https://api.ref.tools/mcp --key ref-e672788111c76ba32bc1
```

**VS Code Format:**

```bash
vscode mcp add --name "Research Tools" --transport http --url https://api.ref.tools/mcp
```

### 🛡️ Security Validation

Each server addition goes through multi-level security validation:

- **Low Risk**: Auto-approved for trusted domains with HTTPS and secure auth
- **Medium Risk**: Review recommended for external domains or custom auth
- **High Risk**: Requires explicit approval with `--force` flag

### 🌐 REST API

```bash
# Add server via API
curl -X POST http://localhost:3000/api/mcp/add \
  -H "Content-Type: application/json" \
  -d '{"command": "cortex mcp add Ref https://api.ref.tools/mcp", "frontend": "curl"}'

# List servers
curl http://localhost:3000/api/mcp/list

# Get status
curl http://localhost:3000/api/mcp/status
```

## Traditional MCP Usage

```javascript
// Plugin Registry
import { PluginRegistry } from '@cortex-os/mcp-bridge';

const registry = new PluginRegistry();
await registry.refreshMarketplace();
const plugins = registry.searchPlugins({ query: 'linear' });

// Plugin Validation
import { PluginValidator } from '@cortex-os/mcp-bridge';

const validator = new PluginValidator();
const result = validator.validatePlugin(pluginMetadata);
```

## Scripts

From the repository root:

```bash
# Start MCP server
pnpm mcp:start

# Run in development mode
pnpm mcp:dev

# Build the package
pnpm mcp:build

# Run smoke tests
pnpm mcp:smoke

# Run tests
pnpm mcp:test

# Start with tunnel
pnpm mcp:start-with-tunnel
```

## Testing

The package includes comprehensive test coverage:

- 22 plugin-registry tests
- 15 plugin-validator tests
- Integration smoke tests
- Docker toolkit tests

```bash
# Test commands
npm test
```

## What Was Consolidated

### From Root Directories

- `/mcp_tools/` → `src/tools/`
- `/packages/mcp-python/` → `src/python/`
- `/.mcp/` → `config/`
- `/.mcp.json` → `config/`
- `/.mcp.config.json` → `config/`
- `/config/mcp.config.yaml` → `config/`
- `/cloudflare/` → `infrastructure/cloudflare/`

### From Scripts

- `/scripts/test-mcp.sh` → `scripts/`
- `/scripts/start-mcp-with-tunnel.sh` → `scripts/`
- `/scripts/smoke/mcp-smoke.mjs` → `scripts/smoke/`

## Architecture Benefits

This consolidation ensures:

1. **Single Source of Truth**: All MCP functionality is in one place
2. **Clear Boundaries**: Architectural separation from other packages
3. **Easier Maintenance**: Simpler imports and dependency management
4. **Better Organization**: Logical grouping of related functionality

## Accessibility

This module follows WCAG 2.1 AA accessibility guidelines. All interactive elements are keyboard accessible and screen reader compatible.
