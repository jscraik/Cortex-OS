import { z } from 'zod';
import { EventEmitter } from 'events';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { redactSensitiveData } from './security.js';
import type {
  McpRequest,
  TransportConfig,
  Transport,
  HttpTransportConfig,
  StdioTransportConfig,
} from './types.js';
import { SSETransport } from './sse-transport.js';
import { parseTransportConfig } from './transport-schema.js';
import commandExists from 'command-exists';

export { redactSensitiveData } from './security.js';
export type { Transport } from './types.js';

// Schema used to validate messages before sending
const MessageSchema = z
  .object({ jsonrpc: z.literal('2.0'), id: z.union([z.string(), z.number()]) })
  .passthrough();

export function validateMessage(
  message: McpRequest,
  onError?: (err: unknown, msg: McpRequest) => void,
): void {
  try {
    MessageSchema.parse(message);
  } catch (err) {
    if (onError) onError(err, message);
    else console.error('Malformed message in transport.send:', err, message);
  }
}

export function createTransport(config: TransportConfig): Transport {
  // Always validate configuration for security
  let cfg: TransportConfig;
  try {
    cfg = parseTransportConfig(config);
  } catch (err: any) {
    const t = (config as any)?.type;
    if (t && !['stdio', 'http', 'sse'].includes(t)) {
      throw new Error('Unsupported transport type');
    }
    throw err;
  }
  switch (cfg.type) {
    case 'sse':
      return new SSETransport(cfg);
    case 'http':
      return createHttpTransport(cfg);
    case 'stdio':
      return createStdioTransport(cfg);
  }
}

// Removed validateTransportConfig - tests should use parseTransportConfig directly

// HTTP Transport
function createHttpTransport(config: HttpTransportConfig): Transport & EventEmitter {
  const state = { connected: false };
  const emitter = new EventEmitter();
  // Avoid custom undici Agent to reduce incompatibilities across environments
  let dispatcher: any | undefined;
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
      const maxRetries = 2;
      let attempt = 0;
      // Simple exponential backoff retry on network errors or 5xx
      // 0ms, 100ms, 200ms
      while (true) {
        try {
          const res = await fetch(config.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...(config.headers || {}) },
            body,
            signal: config.timeoutMs ? AbortSignal.timeout(config.timeoutMs) : undefined,
            // Note: no custom dispatcher used for compatibility
          });
          if (!res.ok) {
            if (res.status >= 500 && attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, 100 * attempt));
              attempt++;
              continue;
            }
            throw new Error(`HTTP ${res.status}`);
          }
          const json = await res.json().catch(() => undefined);
          if (json) emitter.emit('message', json);
          break;
        } catch (err) {
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 100 * attempt));
            attempt++;
            continue;
          }
          if (onError) onError(err, message);
          else throw err;
          break;
        }
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
      // Proactively validate that command exists to fail fast and satisfy security tests
      try {
        await commandExists(config.command);
      } catch {
        throw new Error(`Command not found or not executable: ${config.command}`);
      }
        child = spawn(config.command, config.args ?? [], {
          cwd: config.cwd,
          env: { ...(config.env ?? {}) },
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
          windowsHide: true,
          detached: false,
          uid: config.uid,
          gid: config.gid,
        });
      if (child) {
        child.on('error', (err) => {
          connected = false;
          emitter.emit('error', err);
        });
        child.stdout.on('data', handleStdout);
        child.stderr.on('data', (d) => emitter.emit('stderr', d.toString()));
        child.on('exit', (code, signal) => {
          connected = false;
          emitter.emit('exit', { code, signal });
        });
      }
      connected = true;
    },
    async disconnect() {
      if (child && child.pid && !child.killed) {
        child.kill('SIGTERM');
        
        // Wait for graceful shutdown, then force kill if needed
        const forceKillTimeout = setTimeout(() => {
          if (child && child.pid && !child.killed) {
            console.warn(`Force killing unresponsive process ${child.pid}`);
            child.kill('SIGKILL');
          }
        }, 5000);
        
        // Clear timeout when process exits
        child.once('exit', () => {
          clearTimeout(forceKillTimeout);
        });
      }
      child = null;
      connected = false;
    },
    async send(message: McpRequest, onError?: (err: unknown, msg: McpRequest) => void) {
      validateMessage(message, onError);
      if (!connected || !child || !child.stdin.writable) {
        throw new Error('Transport not connected');
      }
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
