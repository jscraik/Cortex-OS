
import commandExists from 'command-exists';
import { z } from 'zod';
import type { McpRequest, TransportConfig, Transport } from './types.js';
import { parseTransportConfig } from './transport-schema.js';


export function validateTransportConfig(config: TransportConfig) {
  const baseSchema = {
    allowNetwork: z.boolean().optional(),
    sandbox: z.boolean().optional(),
    timeoutMs: z.number().int().nonnegative().optional(),
    maxMemoryMB: z.number().int().nonnegative().optional(),
  };


function validateMessage(message: McpRequest): void {
  const schema = z
    .object({
      jsonrpc: z.literal('2.0'),
      id: z.union([z.string(), z.number()]),
      method: z.string().optional(),
      params: z.unknown().optional(),
      result: z.unknown().optional(),
      error: z.unknown().optional(),
    })
    .strict();
  schema.parse(message);
}


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
    }
  };
}


export function createTransport(config: TransportConfig): Transport {
  const cfg = parseTransportConfig(config);
  const state = { connected: false };


  return {
    connect: createConnect(cfg, state),
    disconnect: createDisconnect(state),
    isConnected: () => state.connected,
    send: createSend(),


    send(message: McpRequest, onError?: (err: unknown, msg: McpRequest) => void) {
      validateMessage(message, onError);
    },

  };
}

