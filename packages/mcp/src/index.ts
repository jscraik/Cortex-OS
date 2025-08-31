import { z } from 'zod';
import { AgentConfigSchema, MCPRequestSchema } from '@cortex-os/contracts-v2';
import { createInMemoryStore } from '@cortex-os/lib';
import { createJsonOutput, createStdOutput, withTimestamp } from '@cortex-os/lib';
import { StructuredError } from '@cortex-os/lib';

const InputSchema = z.object({
  config: AgentConfigSchema,
  request: MCPRequestSchema,
  json: z.boolean().optional(),
});
export type MCPInput = z.infer<typeof InputSchema>;

export async function handleMCP(input: unknown): Promise<string> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const err = new StructuredError('INVALID_INPUT', 'Invalid MCP input', { issues: parsed.error.issues });
    return createJsonOutput({ error: err.toJSON() });
  }

  const { config, request, json } = parsed.data;
  const memory = createInMemoryStore({ maxItems: config.memory.maxItems, maxBytes: config.memory.maxBytes });

  // Example: deterministic seed usage
  const seed = config.seed;
  const response = {
    tool: request.tool,
    args: request.args ?? {},
    seed,
  };

  if (json) return createJsonOutput(response);
  return createStdOutput(`MCP handled tool=${request.tool}`);
}

export type { MLXConfig, MlxModelsConfig, MlxModelInfo } from './lib/mlx-config';
export { loadMlxConfig, loadMlxModelsConfig } from './lib/mlx-config';

export default { handleMCP };
