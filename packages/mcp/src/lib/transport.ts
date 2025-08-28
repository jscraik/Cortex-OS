import commandExists from 'command-exists';
import { z } from 'zod';
import type { McpRequest, TransportConfig, Transport } from './types.js';
import { parseTransportConfig } from './transport-schema.js';

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

function createConnect(cfg: TransportConfig, state: { connected: boolean }) {
  return async () => {
    if (cfg.type === 'stdio') {
      try {
        await commandExists(cfg.command);
      } catch {
        throw new Error('Command not found');
      }
    }
    state.connected = true;
  };
}

function createDisconnect(state: { connected: boolean }) {
  return async () => {
    state.connected = false;
  };
}

function createSend() {
  return (message: McpRequest, onError?: (err: unknown, msg: McpRequest) => void) => {
    try {
      validateMessage(message);
    } catch (err) {
      if (onError) {
        onError(err, message);
      } else {
        console.error('Malformed message in transport.send:', err, message);
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
  };
}
