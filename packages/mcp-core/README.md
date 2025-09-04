# MCP Core

Minimal building blocks for the Model Context Protocol.

## Features

- **Runtime validation** via Zod schemas
- **Enhanced client** with HTTP and stdio transports
- **Typed contracts** for server configuration

## Usage

```typescript
import { createEnhancedClient } from "@cortex-os/mcp-core";

const client = await createEnhancedClient({
  name: "example",
  transport: "streamableHttp",
  endpoint: "http://localhost:3000/tool"
});

const result = await client.callTool({ name: "ping" });
await client.close();
```

## License

MIT
