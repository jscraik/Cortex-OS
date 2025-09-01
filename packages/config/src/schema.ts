import { z } from 'zod';

export const ConfigSchema = z.object({
  PORT: z.string().regex(/^[0-9]+$/).default('3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

export type Config = z.infer<typeof ConfigSchema>;
