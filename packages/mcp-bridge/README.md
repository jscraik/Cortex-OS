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
