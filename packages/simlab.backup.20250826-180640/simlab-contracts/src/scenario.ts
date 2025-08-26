import { z } from "zod";

export const Seed = z.object({ value: z.number().int().nonnegative() });
export const AgentSpec = z.object({ id: z.string(), kind: z.enum(["rule","mcp","a2a"]), config: z.record(z.any()).default({}) });
export const EnvSpec = z.object({ id: z.string(), kind: z.enum(["local-counter","python"]), config: z.record(z.any()).default({}) });

export const Scenario = z.object({
  id: z.string(),
  seed: Seed,
  steps: z.number().int().positive().max(10000),
  agent: AgentSpec,
  env: EnvSpec,
  metadata: z.record(z.any()).default({})
});

export const Transition = z.object({
  t: z.number().int(), state: z.any(), action: z.any(), reward: z.number().default(0), done: z.boolean().default(false)
});

export type Scenario = z.infer<typeof Scenario>;
export type Transition = z.infer<typeof Transition>;

