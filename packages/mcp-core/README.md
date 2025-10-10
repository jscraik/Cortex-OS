# @cortex-os/mcp-core

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-94%25-brightgreen.svg)](coverage)

Minimal building blocks for the Model Context Protocol.

## Features

- **Runtime validation** via Zod schemas
- **Enhanced client** with HTTP and stdio transports
- **Typed contracts** for server configuration
- **Tool interface & registry** with first-class error handling

## MCP Tool Template

`@cortex-os/mcp-core` provides a contract-first interface for defining MCP tools in TypeScript. Tools declare a `zod` input schema, an async `execute` method, and optional execution context metadata. The `ToolRegistry` coordinates validation, invocation, and error normalization.

```typescript
import {
  ToolRegistry,
  ToolValidationError,
  ToolExecutionError,
  echoTool,
} from '@cortex-os/mcp-core';

const registry = new ToolRegistry();
registry.register(echoTool);

try {
  const result = await registry.execute('echo', {
    message: 'hello cortex',
    uppercase: true,
  });
  console.log(result.message); // "HELLO CORTEX"
} catch (error) {
  if (error instanceof ToolValidationError) {
    console.error('Bad input:', error.issues);
  } else if (error instanceof ToolExecutionError) {
    console.error('Tool failed:', error.cause);
  } else {
    throw error;
  }
}
```

### Error codes

| Code | Description |
|------|-------------|
| `E_TOOL_REGISTER` | Tool names must be unique inside a registry |
| `E_TOOL_NOT_FOUND` | Requested tool is not registered |
| `E_TOOL_VALIDATION` | Zod schema validation failed |
| `E_TOOL_EXECUTION` | Tool threw an unexpected error |
| `E_TOOL_ABORTED` | Execution aborted via `AbortSignal` |

### Built-in `echo` tool

A ready-to-use `echo` tool ships with the package for connectivity and contract testing.

```typescript
import { echoTool } from '@cortex-os/mcp-core/tools/echo-tool';

const result = await echoTool.execute({ message: 'ping' });
console.log(result.message); // "ping"
```

Combine it with the registry to expose an HTTP endpoint that is compatible with the enhanced MCP client:

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
  const { name, arguments: args } = JSON.parse(await readBody(req));
  try {
    const result = await registry.execute(name, args);
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

## Transport Matrix

Supported transport kinds are validated by the central `TransportKindSchema`:

| Transport | Description | Notes |
|-----------|-------------|-------|
| `stdio` | Spawn a process and exchange newline-delimited JSON frames over stdio | Ideal for local tools / sandboxed runtimes |
| `http` | Plain HTTP POST tool calls | Preferred general-purpose network transport |
| `sse` | Server-Sent Events (event-stream) for push/event channels | Usually paired with a separate `http` POST endpoint for calls |
| `ws` | Reserved for future WebSocket support | Schema-ready; implementation pending |
| `streamableHttp` | Legacy alias for `http` kept for backward compatibility | Prefer `http`; may be deprecated in a future major |

Attempting to parse any other string via `TransportKindSchema` will throw.

## Framing Contract (stdio)

`stdio` transport uses **newline-delimited JSON** (one request or response per line). The client:

1. Writes a single JSON object followed by `\n`.
2. Buffers stdout, splitting on `\n` (handles partial & multi-frame chunks).
3. Parses each complete line independently.

Implications:

- Do not embed raw newlines at top-level (normal JSON escaping is fine).
- Each tool invocation corresponds to exactly one JSON line in and one out.
- Extra whitespace-only lines are ignored.

## Enhanced Client Usage

### Basic HTTP Tool Call

```typescript
import { createEnhancedClient } from '@cortex-os/mcp-core';

const client = await createEnhancedClient({
   name: 'demo-http',
   transport: 'http',
   endpoint: 'http://localhost:3000/mcp',
});

const result = await client.callTool({ name: 'ping' });
console.log(result);
await client.close();
```

### Backward Compatible (legacy) `streamableHttp`

```typescript
await createEnhancedClient({
   name: 'legacy',
   transport: 'streamableHttp', // works, prefers same semantics as 'http'
   endpoint: 'http://localhost:3000/mcp'
});
```

Prefer `http`; the legacy value remains accepted but may be removed in a future major.

### stdio Transport

```typescript
const client = await createEnhancedClient({
   name: 'demo-stdio',
   transport: 'stdio',
   command: 'python',
   args: ['tools.py'],
   env: { PYTHONUNBUFFERED: '1' },
});

const out = await client.callTool({ name: 'echo', arguments: { value: 'hi' } });
console.log(out);
await client.close();
```

### Request Timeout Handling

Set `requestTimeoutMs` to bound latency for both HTTP and stdio invocations.

```typescript
import { createEnhancedClient, TimeoutError } from '@cortex-os/mcp-core';

const client = await createEnhancedClient({
   name: 'timeouts',
   transport: 'http',
   endpoint: 'http://localhost:3000/mcp',
   requestTimeoutMs: 250, // fail fast after 250ms
});

try {
   await client.callTool({ name: 'slowOperation' });
} catch (err) {
   if (err instanceof TimeoutError) {
      console.warn('Tool call exceeded 250ms');
   } else {
      throw err; // rethrow unknown errors
   }
}
```

Timeout semantics:

- HTTP: Applies around the entire fetch (request + response body parse).
- stdio: Applies to waiting for the next response line (each call is individually timed).
- A timeout rejects with `TimeoutError` (never mixed with network / parse errors).

## Memory Management

To prevent memory issues during development:

1. Use the MCP-aware memory manager:

   ```bash
   ./scripts/memory-manager-mcp.sh --gentle
   ```

2. Run tests with memory constraints:

   ```bash
   ./scripts/run-mcp-tests.sh mcp-core
   ```

## Usage

```typescript
import { createEnhancedClient } from "@cortex-os/mcp-core";

const client = await createEnhancedClient({
  name: "example",
   transport: "http",
  endpoint: "http://localhost:3000/tool"
});

const result = await client.callTool({ name: "ping" });
await client.close();
```

## Test Coverage

This package maintains 94%+ test coverage. Run tests with:

```bash
./scripts/run-mcp-tests.sh mcp-core true
```

## License

## Contracts

The shared `TransportKindSchema` is the single source of truth for supported transports:

```ts
import { TransportKindSchema } from '@cortex-os/mcp-core';
TransportKindSchema.parse('http'); // 'http'
```

Other packages (e.g. registry, bridge) import this schema to avoid drift. Adding a new transport requires:

1. Extending `TransportKindSchema` (non-breaking if additive).
2. Implementing the transport in clients/bridges.
3. Adding contract tests asserting acceptance + rejection.
4. Updating README matrices.

Apache 2.0

## Definition of Done
- [ ] Schemas for Tool/Resource/Prompt + error taxonomy.
- [ ] Typed client for ASBR ↔ MCP with retries/backoff.

## Test Plan
- [ ] Schema validation, error mapping, retry logic.

> See `CHECKLIST.cortex-os.md` for the full CI gate reference.

