import { z } from 'zod';

export const StepSchema = z.object({
  agent: z.string(),
  action: z.string(),
  failure: z.enum(['none', 'latency', 'drop', 'crash']).default('none'),
  delayMs: z.number().int().nonnegative().default(0)
});
export type Step = z.infer<typeof StepSchema>;

export const ScenarioSchema = z.object({
  name: z.string(),
  seed: z.number().int().nonnegative().default(0),
  steps: z.array(StepSchema)
});
export type Scenario = z.infer<typeof ScenarioSchema>;
