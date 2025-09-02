# MCP Bridge

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-90%25+-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security)
[![MCP Protocol](https://img.shields.io/badge/MCP-2.0-orange)](https://modelcontextprotocol.io/)
[![MLX](https://img.shields.io/badge/MLX-optimized-purple)](https://ml-explore.github.io/mlx/)
[![WCAG 2.1 AA](https://img.shields.io/badge/WCAG-2.1%20AA-green)](https://www.w3.org/WAI/WCAG21/quickref/)

**Universal MCP Server Bridge for Cortex OS**

*Connects external Model Context Protocol servers with plugin management and CLI integration*

</div>

---

## 🎯 Features

- **🔌 Plugin Registry**: Discover, install, and manage MCP plugins from marketplace
- **✅ Plugin Validator**: Enforce manifest validation and capability checks
- **🛠️ Universal CLI Handler**: Normalize commands from Cortex CLI, Claude Desktop, VS Code, and other frontends
- **🍎 MLX Integration**: Native Apple Silicon acceleration with configurable Python runner
- **📡 SSE Streaming**: Server-Sent Events endpoint with OpenAI-compatible responses
- **🔒 Security**: Secure plugin execution with validation and sandboxing
- **⚡ High Performance**: Optimized for low-latency tool invocation
- **♿ Accessibility**: WCAG 2.1 AA compliant documentation and interfaces

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm --filter @cortex-os/mcp-bridge build

# Run tests
pnpm --filter @cortex-os/mcp-bridge test
```

### Basic Usage

```typescript
import { PluginRegistry, PluginValidator } from '@cortex-os/mcp-bridge';

// Initialize plugin registry
const registry = new PluginRegistry();
await registry.refreshMarketplace();

// Validate plugins
const validator = new PluginValidator();
const [plugin] = registry.searchPlugins({ query: 'demo' });
const result = validator.validatePlugin(plugin);
```

## Build and Test

```bash
pnpm --filter @cortex-os/mcp-bridge build
pnpm --filter @cortex-os/mcp-bridge test
```

### Python runner packaging

- The MLX chat runner lives under `src/python/src/mlx_chat.py` and is included in the published package via the `files` field.
- On build, a `postbuild` step copies `src/python/**` into `dist/python/**` to simplify runtime resolution from compiled JavaScript.
- Runtime path resolution prefers `dist/python/src/mlx_chat.py` and falls back to the source path when running from TS.

### MLX configuration

- MLX configuration is validated with Zod before initialization.
- Provide a JSON file (path via `MLX_CONFIG_PATH`) with structure:

```json
{
  "server": { "host": "127.0.0.1", "port": 8080, "workers": 1, "timeout": 30, "max_requests": 128 },
  "models": { "default": { "name": "echo", "description": "Echo for tests" } },
  "cache": { "hf_home": "/tmp/.mlx-cache" },
  "performance": { "batch_size": 1, "max_tokens": 128, "temperature": 0.0, "top_p": 1.0 }
}
```

### Streaming endpoint

- The integration exposes `GET /v1/completions` with Server-Sent Events (SSE) that streams OpenAI-style chunk objects.
- Query parameters: `message` (required), `model` (optional, defaults to `default`).

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
