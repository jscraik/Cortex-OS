# Architecture

The package is composed of two modules:

| Component | Role |
| --- | --- |
| `types.ts` | Defines Zod schemas and TypeScript types for server manifests and registry indexes. |
| `fs-store.ts` | Implements persistence using a JSON file with simple locking to prevent concurrent writes. |

Data flow:

1. Clients call `readAll`, `upsert`, or `remove`.
2. `fs-store.ts` reads or writes `servers.json` under the configured directory.
3. `types.ts` validates all data before returning it to the caller.
