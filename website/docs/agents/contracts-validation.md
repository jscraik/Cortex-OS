---
sidebar_position: 2
---

# Contracts & Validation

Agent communication in Cortex-OS follows a strict contract-first approach using Zod schemas
for validation and TypeScript types for compile-time safety.

## Event Contracts

All agent events must conform to defined schemas:

```typescript
import { z } from 'zod';

export const TaskCreatedEventSchema = z.object({
  type: z.literal('task.created'),
  taskId: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  assignedTo: z.string().optional(),
});

export type TaskCreatedEvent = z.infer<typeof TaskCreatedEventSchema>;
```

## Validation Pipeline

Events are validated at multiple layers:

1. **Schema validation** - Zod runtime validation
2. **Type checking** - TypeScript compile-time checks  
3. **Contract tests** - Automated testing of event shapes
4. **Integration tests** - End-to-end event flow validation

## Best Practices

- Always define schemas before implementation
- Use strict typing with no `any` types
- Version your contracts when making breaking changes
- Write contract tests for all event types
- Document event semantics and expected behavior

## Contract Registry

Events are registered in the central contract registry at:
`libs/typescript/contracts/`

This ensures consistency across all agents and prevents schema drift.
