import { z } from 'zod';
import type { TransportConfig } from './types.js';

const dangerousCommand = /^(rm\s|sudo\s|curl\s.+\|\s*sh|wget\s.+\|\s*bash|del\s)/i;

const baseSchema = {
  allowNetwork: z.boolean().optional(),
  sandbox: z.boolean().optional(),
  timeoutMs: z.number().int().nonnegative().optional(),
  maxMemoryMB: z.number().int().nonnegative().optional(),
};

export const stdioSchema = z
  .object({
    type: z.literal('stdio'),
    command: z
      .string()
      .min(1)
      .refine((cmd) => !dangerousCommand.test(cmd), {
        message: 'Unsafe command',
      }),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    cwd: z.string().optional(),
    maxRetries: z.number().int().nonnegative().optional(),
    retryDelay: z.number().int().nonnegative().optional(),
    timeout: z.number().int().nonnegative().optional(),
    ...baseSchema,
  })
  .strict();

export const httpSchema = z
  .object({
    type: z.literal('http'),
    url: z.string().url(),
    ...baseSchema,
  })
  .strict();

export const transportConfigSchema = z.union([stdioSchema, httpSchema]);

export function parseTransportConfig(config: unknown): TransportConfig {
  return transportConfigSchema.parse(config);
}
