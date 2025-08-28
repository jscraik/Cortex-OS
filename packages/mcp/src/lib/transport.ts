
import { spawnSync } from 'child_process';

import { z } from 'zod';
import type { McpRequest, TransportConfig } from './types.js';

const dangerousCommand = /^(rm\s|sudo\s|curl\s.+\|\s*sh|wget\s.+\|\s*bash|del\s)/i;

export function createTransport(config: TransportConfig) {
  const baseSchema = {
    timeoutMs: z.number().int().nonnegative().optional(),
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
  let child: ChildProcessWithoutNullStreams | null = null;

  return {
    async connect() {
      if (cfg.type === 'stdio') {

        const check = spawnSync('sh', ['-c', `command -v ${cfg.command}`]);
        if (check.status !== 0) {
          throw new Error('Command not found');
        }

      }
      connected = true;
    },

    async disconnect() {
      if (cfg.type === 'stdio' && child) {
        child.kill();
        child = null;
      }
      connected = false;
    },

    isConnected() {
      return connected;
    },


    send(message: McpRequest, onError?: (err: unknown, msg: McpRequest) => void) {

      const msgSchema = z
        .object({
          jsonrpc: z.literal('2.0'),
          id: z.union([z.string(), z.number()]),
          method: z.string().optional(),
          params: z.unknown().optional(),
          result: z.unknown().optional(),
          error: z.unknown().optional(),
        })
        .strict();
      try {
        msgSchema.parse(message);
      } catch (err) {
        if (onError) {
          onError(err, message);
        } else {
          console.error('Malformed message in transport.send:', err, message);
        }

      }
    },
  };
}
