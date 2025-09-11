# Examples & Tutorials

## Validate a Retrieval Query
```ts
import { RAGQuerySchema } from "@cortex-os/contracts-v2";

const query = RAGQuerySchema.parse({ query: "solar storms", topK: 3 });
```

## Build an MCP Request
```ts
MCPRequestSchema.parse({ tool: "echo", args: { text: "hi" } });
```
