import { z } from 'zod';

export const envZ = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envZ>;

export function loadEnv(src: NodeJS.ProcessEnv = process.env): Env {
  return envZ.parse(src);
}
