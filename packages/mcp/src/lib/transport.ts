import { z } from 'zod';
import { EventEmitter } from 'node:events';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { redactSensitiveData } from './security.js';
import type { McpRequest, TransportConfig, Transport, HttpTransportConfig, StdioTransportConfig } from './types.js';
import { SSETransport } from './sse-transport.js';

export { redactSensitiveData } from './security.js';
export type { Transport } from './types.js';

// Schema used to validate messages before sending
const MessageSchema = z
  .object({ jsonrpc: z.literal('2.0'), id: z.union([z.string(), z.number()]) })
  .passthrough();

export function validateMessage(message: McpRequest, onError?: (err: unknown, msg: McpRequest) => void): void {
  try {
    MessageSchema.parse(message);
  } catch (err) {
    if (onError) onError(err, message);
    else console.error('Malformed message in transport.send:', err, message);
  }
}

export function createTransport(config: TransportConfig): Transport {
  switch (config.type) {
    case 'sse':
      return new SSETransport(config);
    case 'http':
      return createHttpTransport(config);
    case 'stdio':
      return createStdioTransport(config);
  }
}

// HTTP Transport
function createHttpTransport(config: HttpTransportConfig): Transport & EventEmitter {
  const state = { connected: false };
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    async connect() {
      state.connected = true;
    },
    async disconnect() {
      state.connected = false;
    },
    async send(message, onError) {
      validateMessage(message, onError);
      if (!state.connected) throw new Error('Transport not connected');
      const body = JSON.stringify(redactSensitiveData(message));
      try {
        const res = await fetch(config.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(config.headers || {}) },
          body,
          signal: config.timeoutMs ? AbortSignal.timeout(config.timeoutMs) : undefined,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json().catch(() => undefined);
        if (json) emitter.emit('message', json);
      } catch (err) {
        if (onError) onError(err, message);
        else throw err;
      }
    },
    isConnected() {
      return state.connected;
    },
  });
}

// STDIO Transport
function createStdioTransport(config: StdioTransportConfig): Transport & EventEmitter {
  let child: ChildProcessWithoutNullStreams | null = null;
  let connected = false;
  const emitter = new EventEmitter();

  const handleStdout = (data: Buffer) => {
    const lines = data.toString('utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        emitter.emit('message', msg);
      } catch {
        emitter.emit('error', new Error('Invalid JSON from stdio server'));
      }
    }
  };

  return Object.assign(emitter, {
    async connect() {
      if (connected) return;
      child = spawn(config.command, config.args ?? [], {
        cwd: config.cwd,
        env: { ...process.env, ...(config.env ?? {}) },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      child.stdout.on('data', handleStdout);
      child.stderr.on('data', (d) => emitter.emit('stderr', d.toString()));
      child.on('exit', (code, signal) => {
        connected = false;
        emitter.emit('exit', { code, signal });
      });
      connected = true;
    },
    async disconnect() {
      if (child && child.pid) child.kill('SIGTERM');
      child = null;
      connected = false;
    },
    async send(message: McpRequest, onError?: (err: unknown, msg: McpRequest) => void) {
      validateMessage(message, onError);
      if (!connected || !child || !child.stdin.writable) throw new Error('Transport not connected');
      try {
        const payload = JSON.stringify(redactSensitiveData(message)) + '\n';
        child.stdin.write(payload);
      } catch (err) {
        if (onError) onError(err, message);
        else throw err;
      }
    },
    isConnected() {
      return connected;
    },
  });
}
