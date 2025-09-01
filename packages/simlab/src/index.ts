import { z } from 'zod';
import { createInMemoryStore } from './lib/memory';
import { createStdOutput, createJsonOutput, StructuredError } from './lib/output';
import { ScenarioSchema } from './scenario';
import { runScenario } from './replay';

const AgentConfigSchema = z.object({
  memory: z.object({ maxItems: z.number().int().positive(), maxBytes: z.number().int().positive() })
});

const InputSchema = z.object({
  config: AgentConfigSchema,
  scenario: ScenarioSchema,
  scheduler: z.enum(['deterministic', 'randomized']).default('deterministic'),
  json: z.boolean().optional()
});
export type SimlabInput = z.infer<typeof InputSchema>;

export async function handleSimlab(input: unknown): Promise<string> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const err = new StructuredError('INVALID_INPUT', 'Invalid Simlab input', { issues: parsed.error.issues });
    return createJsonOutput({ error: err.toJSON() });
  }
  const { config, scenario, scheduler, json } = parsed.data;
  const memory = createInMemoryStore({ maxItems: config.memory.maxItems, maxBytes: config.memory.maxBytes });
  const result = await runScenario(scenario, scheduler);
  memory.set('lastScenario', scenario.name);
  const payload = { executed: true, events: result.events, metrics: result.metrics };
  return json ? createJsonOutput(payload) : createStdOutput(JSON.stringify(payload));
}
