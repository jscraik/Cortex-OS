import { spawnSync } from 'child_process';
import { z } from 'zod';
import type { McpRequest, TransportConfig } from './types.js';

const dangerousCommand = /^(rm\s|sudo\s|curl\s.+\|\s*sh|wget\s.+\|\s*bash|del\s)/i;

export function validateTransportConfig(config: TransportConfig) {
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

  return z.union([stdioSchema, httpSchema]).parse(config);
}

function ensureCommandExists(command: string) {
  const check = spawnSync('command', ['-v', command]);
  if (check.status !== 0) {
    throw new Error('Command not found');
  }
}

export function validateMessage(
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
  }
}

export function createTransport(config: TransportConfig) {
  const cfg = validateTransportConfig(config);
  let connected = false;

  return {
    async connect() {
      if (cfg.type === 'stdio') {
        ensureCommandExists(cfg.command);
      }
      connected = true;
    },

    async disconnect() {
      connected = false;
    },

    isConnected() {
      return connected;
    },

    send(message: McpRequest, onError?: (err: unknown, msg: McpRequest) => void) {
      validateMessage(message, onError);
    },
  };
}

