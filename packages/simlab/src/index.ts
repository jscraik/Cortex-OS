import { z } from 'zod';
import { AgentConfigSchema, SimlabCommandSchema } from '@cortex-os/contracts';
import { createInMemoryStore, createStdOutput, createJsonOutput } from '@cortex-os/lib';
import { StructuredError } from '@cortex-os/lib';

const InputSchema = z.object({ config: AgentConfigSchema, command: SimlabCommandSchema, json: z.boolean().optional() });
export type SimlabInput = z.infer<typeof InputSchema>;

export function handleSimlab(input: unknown): string {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const err = new StructuredError('INVALID_INPUT', 'Invalid Simlab input', { issues: parsed.error.issues });
    return createJsonOutput({ error: err.toJSON() });
  }
  const { config, command, json } = parsed.data;
  const memory = createInMemoryStore({ maxItems: config.memory.maxItems, maxBytes: config.memory.maxBytes });
  memory.set('lastCommand', command);
  if (json) return createJsonOutput({ executed: true, scenario: command.scenario, step: command.step });
  return createStdOutput(`Simlab executed scenario=${command.scenario} step=${command.step}`);
}
