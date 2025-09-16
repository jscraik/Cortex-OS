# RAG MCP Tools

## Overview

The RAG package exposes three contract-first Model Context Protocol tools via the `ragMcpTools`
export: `rag_query`, `rag_ingest`, and `rag_status`. Each tool ships with a Zod input schema and a
promise-based handler so that registries can perform validation before delegating to the
implementation. The `rag_query` tool internally calls the `handleRAG` entry point, which composes the
in-memory store, Qwen3 development embedder, and multi-model generator to return answers and citation
metadata.

## Tool Summary

| Tool | Description | Key inputs | Response payload |
| --- | --- | --- | --- |
| `rag_query` | Semantic search across the knowledge base with lightweight generation. | `query`, `topK`, `maxTokens`, `timeoutMs` | Text chunk containing JSON with `answer`, `sources`, and `provider`. |
| `rag_ingest` | Stores raw content along with optional metadata for later retrieval. | `content`, `source?`, `metadata?` | Text chunk containing JSON describing ingest status, content length, and timestamp. |
| `rag_status` | Reports the runtime status of the RAG system and optional statistics. | `includeStats?` | Text chunk containing JSON status fields plus optional ingestion/query statistics. |

## API Details

### `rag_query`

#### Input schema

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `query` | string | ✅ | — | Query text must contain at least one character. |
| `topK` | integer | ❌ | 5 | Must be positive and no greater than 100 to bound result sets. |
| `maxTokens` | integer | ❌ | 1024 | Caps answer length and downstream memory buffer sizing. |
| `timeoutMs` | integer | ❌ | 30000 | Controls generation timeout for the multi-model generator. |

#### Response payload

The handler returns `{ content: [{ type: 'text', text: string }] }`. The `text` field is a JSON string
mirroring the payload from `handleRAG` with the following structure:

```json
{
  "answer": "Generated answer text",
  "sources": [{ "text": "...", "score": 0.42, "metadata": { /* chunk metadata */ } }],
  "provider": "qwen3"
}
```

Use `JSON.parse(result.content[0].text)` to obtain the structured object.

### `rag_ingest`

#### Input schema

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `content` | string | ✅ | — | Content to add to the knowledge base; must be non-empty. |
| `source` | string | ❌ | — | Optional identifier, e.g., file path or URL. |
| `metadata` | record<string, unknown> | ❌ | — | Arbitrary metadata bag forwarded with the ingest record. |

#### Response payload

The current implementation returns a status stub with timestamps and echo metadata so clients can
verify ingestion requests during contract testing:

```json
{
  "status": "ingested",
  "contentLength": 128,
  "source": "docs/overview.md",
  "metadata": { "tags": ["guide"] },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

This object is emitted as a JSON string inside `content[0].text`. The stub will be replaced by a real
persistence pipeline in later implementation phases.

### `rag_status`

#### Input schema

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `includeStats` | boolean | ❌ | false | When true, adds ingestion and query counters to the payload. |

#### Response payload

The handler returns JSON describing the service state and, optionally, zeroed statistics. Example:

```json
{
  "status": "active",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "stats": {
    "documentsIngested": 0,
    "totalEmbeddings": 0,
    "lastQuery": null,
    "averageQueryTime": 0
  }
}
```

Like the other tools, this payload is provided as a JSON string inside `content[0].text`.

## Error Codes

| Code | Source | Trigger | Remediation |
| --- | --- | --- | --- |
| `INVALID_INPUT` | `handleRAG` | Input payload fails schema validation before execution (e.g., missing `config` or malformed `query`). The JSON response includes `error.details.issues` for debugging. | Inspect the reported issues, then resend the request with valid fields. |
| `E_TOOL_VALIDATION` | `ToolRegistry` | Registry-level validation fails before the handler runs (e.g., `topK > 100` or empty `content`). | Clamp inputs to schema limits and reissue the call. |
| `E_TOOL_EXECUTION` | `ToolRegistry` | Handler throws unexpectedly (for example, downstream embedding or generation failure inside `handleRAG`). | Check server logs, verify dependent services, and retry with a healthy backend. |
| `E_TOOL_ABORTED` | `ToolRegistry` | Invocation is cancelled via `AbortSignal` or server timeout logic. | Increase `timeoutMs` or retry without an aborted signal. |

## Usage Examples

### Query the knowledge base

```typescript
import { ragQueryTool } from '@cortex-os/rag';

const result = await ragQueryTool.handler({
  query: 'How does the Cortex MCP adapter work?',
  topK: 3,
  maxTokens: 512,
  timeoutMs: 15000,
});

const payload = JSON.parse(result.content[0].text);
console.log(payload.answer);
```

### Ingest ad-hoc documentation

```typescript
import { ragIngestTool } from '@cortex-os/rag';

await ragIngestTool.handler({
  content: 'RAG MCP tools now support ingestion via rag_ingest.',
  source: 'docs/mcp-tools.md',
  metadata: { tags: ['docs', 'mcp'] },
});
```

## Troubleshooting

- **Validation failures (`E_TOOL_VALIDATION`)** – ensure `query` is non-empty, `topK ≤ 100`, and `content` strings are supplied; these constraints are enforced by the Zod schemas backing each tool.
- **Structured error responses (`INVALID_INPUT`)** – when calling `handleRAG` directly, check `error.details.issues` in the JSON response to understand the rejected fields.
- **Timeouts or aborted executions** – bump `timeoutMs` in the request or avoid cancelling the invocation; the generator honours this limit and the registry reports `E_TOOL_ABORTED` when the signal fires.
- **Placeholder ingestion results** – current ingest handlers return stub metadata for contract validation only; production persistence arrives in later milestones.

## Integration Examples

### Register with `@cortex-os/mcp-core`

```typescript
import { ragMcpTools } from '@cortex-os/rag';
import { ToolRegistry } from '@cortex-os/mcp-core';

const registry = new ToolRegistry();
for (const tool of ragMcpTools) {
  registry.register({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    async execute(input) {
      return tool.handler(input);
    },
  });
}

const raw = await registry.execute('rag_query', { query: 'Cortex MCP', topK: 2 });
const payload = JSON.parse(raw.content[0].text);
console.log(payload.sources);
```

### Expose over HTTP and call with the enhanced client

```typescript
import { createServer } from 'node:http';
import { ragMcpTools } from '@cortex-os/rag';
import { ToolRegistry, createEnhancedClient } from '@cortex-os/mcp-core';

const registry = new ToolRegistry();
for (const tool of ragMcpTools) {
  registry.register({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    async execute(input) {
      return tool.handler(input);
    },
  });
}

const server = createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }
  const body = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
  const { name, arguments: args } = JSON.parse(body);
  const result = await registry.execute(name, args ?? {});
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
});

await new Promise((resolve) => server.listen(3030, resolve));

const client = await createEnhancedClient({
  name: 'rag-http',
  version: '1.0.0',
  transport: 'http',
  endpoint: 'http://127.0.0.1:3030',
});
const status = await client.callTool({
  name: 'rag_status',
  arguments: { includeStats: true },
});
console.log(JSON.parse(status.content[0].text));
await client.close();
```

These patterns let you surface the RAG tooling through any MCP-compatible transport while keeping
schema validation and error normalization consistent with the broader Cortex MCP ecosystem.
