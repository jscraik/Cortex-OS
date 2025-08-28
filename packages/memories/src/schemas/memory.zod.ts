import { z } from 'zod';

export const memoryZ = z.object({
  id: z.string(),
  kind: z.enum(['note', 'event', 'artifact', 'embedding']),
  text: z.string().optional(),
  vector: z.array(z.number()).optional(),
  tags: z.array(z.string()).default([]),
  ttl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  provenance: z.object({
    source: z.enum(['user', 'agent', 'system']),
    actor: z.string().optional(),
    evidence: z
      .array(
        z.object({
          uri: z.string(),
          range: z.tuple([z.number(), z.number()]).optional(),
        }),
      )
      .optional(),
    hash: z.string().optional(),
  }),
  policy: z
    .object({
      pii: z.boolean().optional(),
      scope: z.enum(['session', 'user', 'org']).optional(),
    })
    .optional(),
  embeddingModel: z.string().optional(),
});
