# Configuration

The kernel is configured programmatically and through environment variables.

## Environment Variables

- `KERNEL_LOG_LEVEL` – sets log verbosity (`info`, `debug`, `trace`)
- `LOCAL_MEMORY_BASE_URL` – URL for the memory service used by default MCP tools
- `OPENAI_API_KEY` – example provider token consumed by MCP tools

## Programmatic Options

Create an MCP adapter and register default tools:

```ts
import { MCPAdapter, createDefaultMCPTools } from '@cortex-os/kernel';

const mcp = new MCPAdapter({ tools: createDefaultMCPTools() });
// Pass `mcp` to your orchestrator wiring as needed.
```
