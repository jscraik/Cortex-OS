import { z } from 'zod';
import type { ServerContext } from './types.js';

export async function handleToolCall(
  id: string | number,
  params: unknown,
  context: ServerContext,
) {
  const { name, args } = z
    .object({
      name: z.string(),
      arguments: z.record(z.unknown()).optional(),
    })
    .transform((o) => ({ name: o.name, args: o.arguments ?? {} }))
    .parse(params);

  const tool = context.tools.get(name);
  if (!tool) {
    return {
      jsonrpc: '2.0' as const,
      id,
      error: { code: -32601, message: 'Tool not found' },
    };
  }

  try {
    const schema = tool.def.inputSchema;
    if (schema) {
      const required = schema.required || [];
      const props = schema.properties || {};
      for (const field of required) {
        if (!(field in args)) {
          throw new Error(`Invalid input: ${field} is required`);
        }
      }
      for (const [key, value] of Object.entries(args)) {
        const prop = props[key];
        if (prop?.type === 'string' && typeof value !== 'string') {
          throw new Error(`Invalid input: ${key} must be string`);
        }
        if (
          prop?.maxLength &&
          typeof value === 'string' &&
          value.length > prop.maxLength
        ) {
          throw new Error('Input too long');
        }
      }
    }

    const result = await tool.handler(args);
    return { jsonrpc: '2.0' as const, id, result: { result } };
  } catch (error) {
    return {
      jsonrpc: '2.0' as const,
      id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
