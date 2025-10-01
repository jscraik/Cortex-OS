# FastMCP v3 Advanced Features – brAInwav Cortex Memory MCP Server

**Date:** October 1, 2025  
**Version:** 0.3.0  
**Server:** brAInwav Cortex Memory MCP Server

***

## Overview

This document details the advanced features of FastMCP v3 as implemented in the brAInwav Cortex Memory MCP Server, serving as a production-ready template and reference for robust MCP server design.

***

## Implemented Features

### 1. **Tool Annotations**

Semantic hints added to all tools for better LLM, agent, and client understanding:

- `idempotentHint`: Is action safe to retry?
- `streamingHint`: Supports incremental streaming?
- `readOnlyHint`: Is tool non-mutating?
- `destructiveHint`: Can tool delete or modify state?
- `title`: Human-friendly tool name

**Example:**

```typescript
server.addTool({
  name: 'memory.search',
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    title: 'brAInwav Memory Search',
  },
  // ...
});
```

***

### 2. **Streaming Output**

Tools like `memory.analysis` utilize `streamContent()` for real-time feedback, paired with `reportProgress()`.  
**Benefits:** Responsive UI, user progress indicators.

**Example:**

```typescript
await streamContent({ type: 'text', text: 'Starting analysis...\n' });
await reportProgress({ progress: 1, total: 3 });
```

***

### 3. **Progress Reporting**

Use the modern v3 API:  

```typescript
await reportProgress({ progress: 2, total: 10 });
```

Avoid legacy v1 style.

***

### 4. **Typed Session Management**

Explicit TypeScript session typing ensures safety and extensibility.

```typescript
interface MemorySessionData {
  userId?: string;
  requestCount: number;
}
```

***

### 5. **Authentication Middleware**

Robust API key validation:

```typescript
authenticate: async (req) => {
  if (process.env.MCP_API_KEY && req.headers?.['x-api-key'] !== process.env.MCP_API_KEY) {
    throw new Error('Invalid API key');
  }
  return { userId: req.headers?.['x-user-id'] };
};
```

***

### 6. **Resource Definitions**

Resources provide clean, URI-based, read-only data access.  
**Example:**

```typescript
server.addResource({
  uri: 'memory://recent',
  load: async () => ({
    text: JSON.stringify(await memoryProvider.search({ ... })),
  }),
});
```

Clients can query `memory://recent` for latest data.

***

### 7. **Prompt Templates & Auto-completion**

Reusable prompt/message templates with enum-based or custom auto-completions:

```typescript
arguments: [
  {
    name: 'depth',
    enum: ['shallow', 'medium', 'deep'], // enables input suggestions
  },
]
```

***

### 8. **Event Listeners**

Receive notifications for client lifecycle:

```typescript
server.on('connect', ({ session }) => logger.info('Client connected', { id: session.id }));
server.on('disconnect', ({ session }) => logger.info('Client disconnected', { id: session.id }));
```

***

### 9. **HTTP Streaming Transport**

Support both `stdio` and `httpStream` transport types for flexible deployments:

```typescript
await server.start({ transportType: 'httpStream', httpStream: { port: 9600, endpoint: '/mcp' } });
```

***

### 10. **Structured Return Types**

All tool responses are returned as JSON strings for compatibility:

```typescript
return JSON.stringify({ success: true, result });
```

***

## Dependencies

Install these for all advanced FastMCP v3 features:

```json
{
  "fastmcp": "^3.18.0",
  "@modelcontextprotocol/sdk": "^1.17.4",
  "@standard-schema/spec": "^1.0.0",
  "execa": "^9.6.0",
  "file-type": "^21.0.0",
  "fuse.js": "^7.1.0",
  "mcp-proxy": "^5.5.4",
  "pino": "^9.5.0",
  "strict-event-emitter-types": "^2.0.0",
  "undici": "^7.13.0",
  "uri-templates": "^0.2.0",
  "xsschema": "^0.3.5",
  "yargs": "^18.0.0",
  "zod": "^3.25.76",
  "zod-to-json-schema": "^3.24.6"
}
```

***

## Usage Examples

**Startup:**

```bash
MCP_API_KEY=secret123 node dist/index.js --transport http --port 9600
```

**Tool Invocation:**

```typescript
await call_tool("memory.search", { query: "fastmcp" });
```

**Resource Access:**

```typescript
await read_resource("memory://recent");
```

**Prompt Template:**

```typescript
await get_prompt("analyze_domain", { domain: "mcp-development" });
```

***

## Migration Notes

- Use `{ progress, total }` objects with `reportProgress`
- Return results as JSON strings
- Use `load` for resources and prompts
- Remove deprecated event listeners (`error`)
- Extend session typings for additional user state

***

## Security & Observability

- API keys in env for production
- Typed session isolation per client
- All operations are logged for audit/security

***

## Conclusion

brAInwav Cortex Memory MCP Server is a showcase of FastMCP v3’s advanced, production-grade features—covering everything from semantic tool annotations, streaming, and auto-completion, to secure authentication, robust session management, and resource-driven LLM interoperability.

***

**Maintained by:** brAInwav Development Team  
**FastMCP Version:** 3.18.0  
**MCP SDK Version:** 1.17.4
