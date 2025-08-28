import { z } from 'zod';

export const configZ = z.object({
  serviceName: z.string(),
  serviceVersion: z.string(),
  sandbox: z.boolean().default(false),
  requestTimeoutMs: z.number().int().positive().default(30000),
});

export type Config = z.infer<typeof configZ>;

export function buildConfig(partial: unknown): Config {
  return configZ.parse(partial);
}
