# User Guide

## Validating a Message
```ts
MessageEnvelopeSchema.parse(payload);
```

## Creating Agent Config
```ts
AgentConfigSchema.parse({ seed: 1, maxTokens: 512, timeoutMs: 1000, memory: { maxItems: 10, maxBytes: 1024 } });
```

## Handling Validation Errors
```ts
const res = A2AMessageSchema.safeParse(data);
if (!res.success) console.error(res.error.format());
```

This package has no keyboard shortcuts.
