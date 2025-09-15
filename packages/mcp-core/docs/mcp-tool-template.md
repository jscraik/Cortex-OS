# TypeScript MCP Tool Template

This guide describes the canonical structure for building Model Context Protocol (MCP) tools with `@cortex-os/mcp-core`. It covers the tool interface contract, registry pattern, validation strategy, and the bundled `echo` tool example.

## Overview

- Tools implement the `McpTool` interface exported from `@cortex-os/mcp-core`
- Input validation is handled with Zod schemas defined per tool
- The `ToolRegistry` manages discovery, execution, and lifecycle events
- Errors are normalized into a small set of typed exceptions for easy handling

## Tool interface

```typescript
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '@cortex-os/mcp-core';

const InputSchema = z.object({
  query: z.string().min(1),
});

type Input = z.infer<typeof InputSchema>;
interface Output { value: string }

export class SampleTool implements McpTool<Input, Output> {
  readonly name = 'sample';
  readonly description = 'Example tool definition';
  readonly inputSchema = InputSchema;

  async execute(input: Input, _context?: ToolExecutionContext): Promise<Output> {
    return { value: input.query };
  }
}
```

Key interface requirements:

1. **Name**: globally unique identifier exposed to the MCP client
2. **Description**: human readable summary surfaced in registries
3. **inputSchema**: any `zod` schema describing the payload
4. **execute**: async function returning the tool payload

## Registry pattern

Use the `ToolRegistry` class to register tools and orchestrate execution. The registry enforces unique names and handles validation before invoking each tool.

```typescript
import { ToolRegistry, ToolValidationError } from '@cortex-os/mcp-core';
import { SampleTool } from './sample-tool';

const registry = new ToolRegistry();
registry.register(new SampleTool());

try {
  const result = await registry.execute('sample', { query: 'ping' });
  console.log(result);
} catch (error) {
  if (error instanceof ToolValidationError) {
    console.error(error.issues);
  }
}
```

### Registry helpers

- `register(tool)` – adds a tool; throws `ToolRegistrationError` if the name is in use
- `execute(name, payload)` – validates and invokes the tool, surfacing typed errors
- `list()` – returns the currently registered tool descriptors
- `unregister(name)` – removes a tool dynamically if needed

## Error handling

All tool errors extend `McpToolError`:

| Error | When it occurs | Default code |
|-------|----------------|--------------|
| `ToolRegistrationError` | Attempted to register a duplicate tool name | `E_TOOL_REGISTER` |
| `ToolNotFoundError` | Requested tool is absent from the registry | `E_TOOL_NOT_FOUND` |
| `ToolValidationError` | Input failed Zod validation | `E_TOOL_VALIDATION` |
| `ToolExecutionError` | Tool threw an unexpected error | `E_TOOL_EXECUTION` |

Use these errors to provide consistent responses to MCP clients.

```typescript
import { McpToolError } from '@cortex-os/mcp-core';

try {
  await registry.execute('sample', invalidPayload);
} catch (error) {
  if (error instanceof McpToolError) {
    return {
      ok: false,
      error: { code: error.code, message: error.message, details: error.details },
    };
  }
  throw error;
}
```

## Bundled echo tool

The package ships with an `EchoTool` implementation for quick smoke tests and integration verification.

```typescript
import { echoTool } from '@cortex-os/mcp-core/tools/echo-tool';

const result = await echoTool.execute({
  message: 'Hello Cortex',
  uppercase: true,
});

console.log(result.message); // "HELLO CORTEX"
```

`EchoTool` demonstrates best practices:

- Declarative input schema with optional flags
- Timestamped response payload for tracing
- Abort-aware execution using `ToolExecutionError`

## HTTP integration example

The `ToolRegistry` pairs naturally with the enhanced MCP client. The snippet below exposes the registry via HTTP:

```typescript
import { createServer } from 'node:http';
import {
  ToolRegistry,
  McpToolError,
  echoTool,
} from '@cortex-os/mcp-core';

const registry = new ToolRegistry();
registry.register(echoTool);

const readBody = async (req: import('node:http').IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const server = createServer(async (req, res) => {
  const payload = JSON.parse(await readBody(req));
  try {
    const result = await registry.execute(payload.name, payload.arguments);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, result }));
  } catch (error) {
    if (error instanceof McpToolError) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: { code: error.code, message: error.message } }));
      return;
    }
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: { code: 'E_INTERNAL', message: 'Unexpected failure' } }));
  }
});

server.listen(3000);
```

The enhanced MCP client can then invoke the tool:

```typescript
import { createEnhancedClient } from '@cortex-os/mcp-core';

const client = await createEnhancedClient({
  name: 'echo-server',
  transport: 'http',
  endpoint: 'http://localhost:3000',
});

const response = await client.callTool({
  name: 'echo',
  arguments: { message: 'ping' },
});

console.log(response);
await client.close();
```

## Testing recommendations

- Write Vitest unit tests covering validation and execution paths
- Use the provided integration test (`tests/echo-tool.integration.test.ts`) as a template for client/server validation
- Capture abort scenarios with `AbortController` to ensure deterministic cancellation behavior

