# API Reference

All exports come from the package root.

```ts
import {
  MessageEnvelopeSchema,
  AgentConfigSchema,
  ErrorResponseSchema,
  A2AMessageSchema,
  MCPRequestSchema,
  RAGQuerySchema,
  SimlabCommandSchema
} from "@cortex-os/contracts-v2";
```

Each `*Schema` is a Zod object with a matching TypeScript type:

```ts
import { A2AMessage, A2AMessageSchema } from "@cortex-os/contracts-v2";

const msg: A2AMessage = A2AMessageSchema.parse({
  from: "alice",
  to: "bob",
  action: "ping"
});
```

Use `safeParse` when validation errors should not throw.
