import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'child_process';
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
        const check = spawnSync('command', ['-v', cfg.command]);

        if (check.status !== 0) {
          throw new Error('Command not found');
        }

        child = spawn(cfg.command, cfg.args ?? [], {
          env: cfg.env,
          cwd: cfg.cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
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

    async send(
      message: McpRequest,
      onError?: (err: unknown, msg: McpRequest) => void,
    ) {
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
        return;
      }

      if (cfg.type === 'stdio') {
        try {
          if (!child || !child.stdin.writable) {
            throw new Error('Stdio process not initialized');
          }
          child.stdin.write(JSON.stringify(message) + '\n');
        } catch (err) {
          if (onError) {
            onError(err, message);
          } else {
            console.error('Stdio transport error:', err);
          }
        }
        return;
      }

      if (cfg.type === 'http') {
        try {
          const res = await fetch(cfg.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(message),
          });
          if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
          }
        } catch (err) {
          if (onError) {
            onError(err, message);
          } else {
            console.error('HTTP transport error:', err);
          }
        }
      }
    },
  };
}
