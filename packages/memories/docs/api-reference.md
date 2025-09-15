# API Reference

## MemoryService
```typescript
import { MemoryService } from '@cortex-os/memories';
const svc = await MemoryService.fromEnv(embedder);
await svc.upsert({ id: '1', text: 'hello' });
const result = await svc.search('hello');
```
Key methods:
- `initialize()` – connect to configured stores
- `upsert(entry)` – insert or update a memory item
- `retrieve(id)` – fetch by identifier
- `search(query)` – semantic search across stores

## Helper Factories
- `createMemoryService(store, embedder)` – compose a service manually
- `createPolicyAwareStoreFromEnv()` – build store using env vars
- `createEmbedderFromEnv()` – build embedding pipeline from env vars

## MCP Tool Contracts

The memories package now ships contract-first Model Context Protocol tools for external agents. The
TypeScript definitions live in `src/mcp/tools.ts` and are exported from the package root for reuse.
Each tool exposes a Zod input schema, an output schema, rich documentation metadata, and a shared
error catalogue.

### Shared Error Response

```ts
import type { MemoryToolErrorResponse } from '@cortex-os/memories';

type ErrorShape = MemoryToolErrorResponse;
// {
//   type: 'error';
//   error: {
//     code: 'INVALID_INPUT' | 'NOT_FOUND' | 'NOT_IMPLEMENTED' | 'STORAGE_FAILURE' | 'INTERNAL_ERROR';
//     summary: string;
//     message: string;
//     httpStatus: number;
//     retryable: boolean;
//     remediation: string;
//     docsUrl?: string;
//     details?: unknown; // Zod issues or failure metadata
//   };
// }
```

Use `createMemoryToolErrorResponse(code, message, details)` to build compliant error payloads when
implementing handlers.

### Available Tools

| Tool name         | Description                                      | Key input fields                                                                 | Output payload                                                |
| ----------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `memories.store`  | Persist or update a fully described memory item. | `id`, `kind`, `namespace?`, `text?`, `vector?`, `tags[]`, `provenance`, timestamps | `{ status: 'created' &#124; 'updated' &#124; 'pending', memory }` |
| `memories.get`    | Retrieve a memory by identifier.                 | `id`, `namespace?`, `includePending?`                                            | `{ memory: Memory or null }`                                   |
| `memories.delete` | Remove a memory record.                          | `id`, `namespace?`, `hardDelete?`                                                | `{ id, deleted: true, performedAt }`                            |
| `memories.list`   | List memories with pagination.                   | `namespace?`, `limit?`, `cursor?`, `kinds?`, `tags?`                              | `{ items: Memory[], nextCursor? }`                              |
| `memories.search` | Semantic search across memories.                 | `query?`, `vector?`, `namespace?`, `limit?`, `kinds?`, `tags?`                    | `{ items: (Memory & { score? })[], tookMs? }`                  |

> **Note:** The `memoryStoreTool` schema enforces that either `text` or `vector` is supplied. The
> `memoryListTool` requires `namespace` whenever a pagination cursor is provided, ensuring stable
> iteration across namespaces.

### Validation Helpers

All tool definitions expose an `invoke(rawInput, context)` helper that executes validation before
calling the underlying handler. Invalid payloads are automatically converted into `INVALID_INPUT`
responses with structured Zod issue data. Handlers that are not yet implemented return a
`NOT_IMPLEMENTED` response so integration tests can focus on schema compliance during development.
