import { z } from "zod";

export const budgetZ = z.object({
  wallClockMs: z.number().int().positive(),
  maxSteps: z.number().int().positive(),
  tokens: z.number().int().positive().optional(),
  costUSD: z.number().nonnegative().optional(),
});

export const taskZ = z.object({
  id: z.string().uuid(),
  kind: z.enum(["qa", "rag", "code", "exec", "custom"]),
  input: z.unknown(),
  tags: z.array(z.string()).optional(),
  budget: budgetZ,
  ctx: z.record(z.unknown()).optional(),
});

