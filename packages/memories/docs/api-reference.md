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

`@cortex-os/memories` publishes contract-first Model Context Protocol tool definitions from `src/mcp/tools.ts`. Each export is a `{ name, description, inputSchema, handler }` object backed by shared validation and structured logging. The `memoryMcpTools` array is convenient when bulk-registering all tools.

### Registering Tools

```typescript
import { memoryMcpTools } from '@cortex-os/memories';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({ name: 'memories' });

for (const tool of memoryMcpTools) {
  server.tool(
    tool.name,
    tool.description,
    tool.inputSchema,
    async (input) => tool.handler(input)
  );
}
```

This wiring keeps the built-in input sanitation, correlation IDs, and error reporting intact.

### Response Envelope

Every handler resolves to a `MemoryToolResponse` with the following structure:

- `content`: single entry whose `text` field contains a JSON payload.
- `metadata`: `{ correlationId, timestamp, tool }` for traceability.
- `isError`: present and truthy when validation or execution fails.

The JSON payload embedded in `content[0].text` follows one of two shapes:

```json
{
  "success": true,
  "data": { "... tool-specific payload ..." },
  "correlationId": "8861e150-...",
  "timestamp": "2025-01-15T18:05:12.382Z"
}
```

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Invalid input provided",
    "details": ["text: Text content cannot be empty"]
  },
  "correlationId": "3da5051e-...",
  "timestamp": "2025-01-15T18:05:12.382Z"
}
```

Correlation IDs are echoed to `console.debug` on success and `console.error` on failures, making it easy to line up client traces with server logs.

### Error Codes

| Code | Description | Typical triggers | Remediation |
| ----------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `validation_error`| Input failed schema or sanitization. | Empty text, text longer than 8,192 chars, over 32 tags, limit < 1, metadata depth/size violations, missing update fields. | Fix the offending field and resubmit. Refer to tool-specific validation notes below. |
| `security_error`  | Unsafe prototype pollution detected in metadata. | Keys such as `__proto__`, `constructor`, leading `__`, or non-plain objects. | Strip unsafe keys and ensure metadata objects inherit from `Object.prototype` or `null`. |
| `not_found`       | Requested entity is absent. Reserved for future persistence-backed handlers. | Will be surfaced when `memory_get` style handlers look up nonexistent IDs. | Verify IDs/filters; provision fallback behavior in clients. |
| `internal_error`  | Unexpected exception bubbled out of the handler. | Downstream adapter failures, serialization issues, unhandled errors inside custom logic. | Check server logs using the correlation ID, fix the root cause, retry if the issue is transient. |

The `details` array inside failure payloads lists human-readable diagnostics (e.g., offending paths from Zod validation).

### Tool Catalog

#### `memory_store`

Stores sanitized memory text plus optional tags/metadata.

**Inputs**

| Field | Type | Required | Notes |
| --------- | --------- | -------- | ----- |
| `kind` | `string` | ✔ | 1–32 chars matching `/^[a-zA-Z0-9._-]+$/`. |
| `text` | `string` | ✔ | Trimmed, non-empty, capped at 8,192 chars. |
| `tags` | `string[]`| ✖ (defaults to `[]`) | Trimmed, unique, ≤32 entries, ≤64 chars each. |
| `metadata`| `object` | ✖ | Plain object only; ≤50 keys, ≤4 levels deep, ≤8 KB serialized, no keys starting with `__`. |

**Success payload (`data`)**

```json
{
  "stored": true,
  "id": "mem-1736951112345",
  "kind": "note",
  "tags": ["project", "summary"],
  "textLength": 128,
  "metadataKeys": 3,
  "redactedPreview": "PII-safe preview of text…"
}
```

**Failure highlights**

- `validation_error` if text is empty/too long, or metadata exceeds size/depth limits.
- `security_error` when metadata contains unsafe keys or non-plain prototypes.

#### `memory_retrieve`

Performs semantic lookup over stored memories (placeholder implementation currently returns sample data for contract testing).

**Inputs**

| Field | Type | Required | Notes |
| -------- | -------- | -------- | ----- |
| `query` | `string` | ✔ | Search text (min length 1). |
| `limit` | `number` | ✖ | Positive integer, defaults to 10, capped at 100. |
| `kind` | `string` | ✖ | Optional kind filter. |
| `tags` | `string[]` | ✖ | Optional tags; sanitized identically to `memory_store`. |

**Success payload (`data`)**

```json
{
  "query": "notes about launch",
  "filters": { "kind": "note", "tags": ["launch"] },
  "results": [
    {
      "id": "mem-example",
      "kind": "note",
      "text": "Sample memory result for query: notes about launch",
      "score": 0.9,
      "tags": ["launch"],
      "createdAt": "2025-01-15T18:05:12.382Z"
    }
  ],
  "totalFound": 1
}
```

**Failure highlights**

- `validation_error` if `limit` < 1 or non-integer.
- Sanitization ensures duplicate tags are removed before querying.

#### `memory_update`

Applies partial updates to an existing memory item.

**Inputs**

| Field | Type | Required | Notes |
| ---------- | ---------- | -------- | ----- |
| `id` | `string` | ✔ | 3–128 chars, matches `/^[a-zA-Z0-9._:-]+$/`. |
| `text` | `string` | ✖ | Optional replacement text; sanitized like `memory_store`. |
| `tags` | `string[]` | ✖ | Optional replacement tags; sanitized/uniqued. |
| `metadata` | `object` | ✖ | Optional replacement metadata; same safety rules as store. |

**Success payload (`data`)**

```json
{
  "id": "mem-safe",
  "updated": true,
  "changes": { "text": true, "tags": false, "metadata": true },
  "data": {
    "textPreview": "sanitized preview…",
    "textLength": 42,
    "metadataKeys": 2
  },
  "updatedAt": "2025-01-15T18:05:12.382Z"
}
```

**Failure highlights**

- `validation_error` when no fields are provided or sanitization fails.
- `security_error` for unsafe metadata payloads.

#### `memory_delete`

Acknowledges removal of a memory item.

**Inputs**

| Field | Type | Required | Notes |
| ----- | -------- | -------- | ----- |
| `id` | `string` | ✔ | Uses the same identifier constraints as `memory_update`. |

**Success payload (`data`)**

```json
{
  "id": "mem-safe",
  "deleted": true,
  "deletedAt": "2025-01-15T18:05:12.382Z"
}
```

**Failure highlights**

- Future implementations may return `not_found` when the ID is missing.

#### `memory_stats`

Returns aggregate metrics about the memory system.

**Inputs**

| Field | Type | Required | Notes |
| ---------------- | --------- | -------- | ----- |
| `includeDetails` | `boolean` | ✖ | Defaults to `false`; when true, emits backend diagnostics. |

**Success payload (`data`)**

```json
{
  "totalItems": 0,
  "totalSize": 0,
  "itemsByKind": {},
  "lastActivity": "2025-01-15T18:05:12.382Z",
  "details": {
    "storageBackend": "sqlite",
    "indexedFields": ["kind", "tags", "createdAt"],
    "averageItemSize": 0
  }
}
```

The detail block only appears when `includeDetails` is `true`.

Use the shared `memoryMcpTools` export when you want to expose every tool simultaneously, or import individual definitions (`memoryStoreTool`, `memoryRetrieveTool`, etc.) when composing bespoke handlers.
