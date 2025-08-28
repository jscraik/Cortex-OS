import { z } from 'zod';
import type { McpRequest } from './types.js';

const serverOptionsSchema = z.object({ name: z.string().min(1), version: z.string().min(1) });
const requestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.unknown().optional(),
});
export const validateServerOptions = (o: unknown) => serverOptionsSchema.parse(o);
export const validateRequest = (r: McpRequest) => requestSchema.parse(r);

export const initializeParamsSchema = z
  .object({ protocolVersion: z.string().optional(), capabilities: z.record(z.unknown()).optional() })
  .optional();
export const toolCallParamsSchema = z
  .object({ name: z.string(), arguments: z.record(z.unknown()).optional() })
  .transform((o) => ({ name: o.name, args: o.arguments ?? {} }));
export const resourceReadParamsSchema = z.object({ uri: z.string() });

export type JsonSchema = { required?: string[]; properties?: Record<string, { type?: string; maxLength?: number }> };
export const validateToolArgs = (schema: JsonSchema | undefined, args: Record<string, unknown>) => {
  if (!schema) return;
  for (const f of schema.required || []) if (!(f in args)) throw new Error(`Invalid input: ${f} is required`);
  const props = schema.properties || {};
  for (const [k, v] of Object.entries(args)) {
    const p = props[k];
    if (p?.type === 'string' && typeof v !== 'string') throw new Error(`Invalid input: ${k} must be string`);
    if (p?.maxLength && typeof v === 'string' && v.length > p.maxLength) throw new Error('Input too long');
  }
};
