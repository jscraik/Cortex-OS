import { z } from 'zod';
import type { ServerContext } from './types.js';

export function handleInitialize(
  id: string | number,
  params: unknown,
  context: ServerContext,
) {
  const paramsSchema = z
    .object({
      protocolVersion: z.string().optional(),
      capabilities: z.record(z.unknown()).optional(),
    })
    .optional();

  const parsed = paramsSchema.parse(params);

  return {
    jsonrpc: '2.0' as const,
    id,
    result: {
      protocolVersion: parsed?.protocolVersion,
      capabilities: {
        tools: context.tools.size > 0,
        resources: context.resources.size > 0,
        prompts: context.prompts.size > 0,
      },
      serverInfo: context.options,
    },
  };
}
