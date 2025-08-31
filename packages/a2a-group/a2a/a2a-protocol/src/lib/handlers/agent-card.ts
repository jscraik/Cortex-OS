import type { AgentCard } from '@cortex-os/a2a-contracts/agent-card';
import { z } from 'zod';

const methodSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9/]*$/),
  description: z.string(),
  parameters: z
    .object({
      type: z.literal('object'),
      properties: z.record(
        z
          .object({
            type: z.string(),
          })
          .and(z.record(z.any())),
      ),
      required: z.array(z.string()),
    })
    .optional(),
});

const endpointsSchema = z.object({
  'well-known': z.string().startsWith('/'),
  jsonrpc: z.string().startsWith('/'),
});

const agentCardSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  methods: z.array(methodSchema),
  endpoints: endpointsSchema,
});

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

/**
 * Validate an agent card against the protocol schema.
 * Pure function that returns a tagged union result.
 */
export function validateAgentCard(card: unknown): ValidationResult<AgentCard> {
  const result = agentCardSchema.safeParse(card);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: { message: result.error.issues[0].message },
  };
}
