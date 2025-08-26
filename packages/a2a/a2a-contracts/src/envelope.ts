import { z } from 'zod';

export const Envelope = z.object({
  id: z.string().uuid(),
  type: z.string(),
  schemaVersion: z.number().int().positive().default(1),
  causationId: z.string().uuid().optional(),
  correlationId: z.string().uuid().optional(),
  occurredAt: z.string(),
  ttlMs: z.number().int().positive().default(60000),
  headers: z.record(z.string()).default({}),
  payload: z.unknown(),
});
export type Envelope = z.infer<typeof Envelope>;

