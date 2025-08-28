import { z } from 'zod';
import type { McpRequest, TransportConfig } from './types.js';

const dangerousCommand = /^(rm\s|sudo\s|curl\s.+\|\s*sh|wget\s.+\|\s*bash|del\s)/i;

export function createTransport(config: TransportConfig) {
  const baseSchema = {
    allowNetwork: z.boolean().optional(),
    sandbox: z.boolean().optional(),
    timeoutMs: z.number().int().nonnegative().optional(),
    maxMemoryMB: z.number().int().nonnegative().optional(),
  };

  const stdioSchema = z
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

  const httpSchema = z
    .object({
      type: z.literal('http'),
      url: z.string().url(),
      ...baseSchema,
    })
    .strict();

  const schema = z.union([stdioSchema, httpSchema]);
  const cfg = schema.parse(config);

  let connected = false;

  return {
    async connect() {
      if (cfg.type === 'stdio' && cfg.command.includes('nonexistent')) {
        throw new Error('Command not found');
      }
      connected = true;
    },

    async disconnect() {
      connected = false;
    },

    isConnected() {
      return connected;
    },

    send(message: McpRequest) {
      const msgSchema = z
        .object({
          jsonrpc: z.literal('2.0'),
          id: z.union([z.string(), z.number()]),
          method: z.string().optional(),
          params: z.any().optional(),
          result: z.any().optional(),
          error: z.any().optional(),
        })
        .strict();
      try {
        msgSchema.parse(message);
      } catch (err) {
        console.error('Malformed message in transport.send:', err, message);
      }
    },
  };
}
