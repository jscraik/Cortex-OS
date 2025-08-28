import { z } from 'zod';

export const retryZ = z.object({
  maxRetries: z.number().int().nonnegative(),
  backoffMs: z.number().int().nonnegative(),
  jitter: z.boolean().default(true),
});

export const stepZ = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['agent', 'http', 'delay', 'branch', 'map']),
  input: z.unknown().optional(),
  agentId: z.string().optional(),
  toolAllowlist: z.array(z.string()).optional(),
  retry: retryZ.optional(),
  timeoutMs: z.number().int().positive().optional(),
  next: z.string().nullable().optional(),
  branches: z.array(z.object({ when: z.string(), to: z.string() })).optional(),
});

export const workflowZ = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.string(),
  entry: z.string(),
  steps: z.record(stepZ),
  budget: z
    .object({
      wallClockMs: z.number().int().positive(),
      maxSteps: z.number().int().positive(),
      costUSD: z.number().nonnegative().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});
