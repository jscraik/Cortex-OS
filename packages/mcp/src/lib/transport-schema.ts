import { z } from 'zod';
import type { TransportConfig } from './types.js';

const dangerousCommand =
  /^(rm\s|sudo\s|curl\s.+\|\s*sh|wget\s.+\|\s*bash|del\s|shutdown\s|reboot\s|format\s)/i;
const unsafeMetacharacters = /[|&;`$(){}\[\]<>\n]/;
const pathTraversal = /\.\./;
const safeCommandPattern = /^[a-zA-Z0-9_./\-\s]+$/;

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
      .max(256)
      .refine((cmd) => safeCommandPattern.test(cmd), { message: 'Unsafe command' })
      .refine((cmd) => !unsafeMetacharacters.test(cmd), {
        message: 'Command contains shell metacharacters',
      })
      .refine((cmd) => !pathTraversal.test(cmd), { message: 'Path traversal not allowed' })
      .refine((cmd) => !dangerousCommand.test(cmd), { message: 'Unsafe command detected' }),
    args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
      cwd: z.string().optional(),
      timeoutMs: z.number().int().nonnegative().optional(),
      uid: z.number().int().nonnegative().optional(),
      gid: z.number().int().nonnegative().optional(),
    })
    .strict();

export const httpSchema = z
  .object({
    type: z.literal('http'),
    url: z.string().url(),
    timeoutMs: z.number().int().nonnegative().optional(),
    headers: z.record(z.string()).optional(),
  })
  .strict();

export const sseSchema = z
  .object({
    type: z.literal('sse'),
    url: z.string().url().refine((u) => u.startsWith('https://'), {
      message: 'SSE URL must use https',
    }),
    writeUrl: z.string().url().optional(),
    timeoutMs: z.number().int().nonnegative().optional(),
    retryDelayMs: z.number().int().nonnegative().optional(),
    maxRetries: z.number().int().nonnegative().optional(),
    heartbeatIntervalMs: z.number().int().nonnegative().optional(),
    headers: z.record(z.string()).optional(),
  })
  .strict();

export const transportConfigSchema = z.union([stdioSchema, httpSchema, sseSchema]);

export function parseTransportConfig(config: unknown): TransportConfig {
  return transportConfigSchema.parse(config) as TransportConfig;
}
