import { EventEmitter } from 'events';
import { z } from 'zod';
import { redactSensitiveData } from './security.js';
import type { McpRequest, SSETransportConfig, Transport } from './types.js';

const MessageSchema = z.object({ jsonrpc: z.literal('2.0'), id: z.union([z.string(), z.number()]) }).passthrough();

function validateMessage(message: McpRequest, onError?: (err: unknown, msg: McpRequest) => void) {
  try {
    MessageSchema.parse(message);
  } catch (err) {
    if (onError) onError(err, message);
    else throw err;
  }
}

export class SSETransport extends EventEmitter implements Transport {
  private controller?: AbortController;
  private connected = false;
  constructor(private readonly config: SSETransportConfig) {
    super();
    if (!config.url.startsWith('https://')) {
      throw new Error('SSE connections must use https');
    }
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    this.controller = new AbortController();
    const res = await fetch(this.config.url, {
      headers: { Accept: 'text/event-stream', ...(this.config.headers ?? {}) },
      signal: this.config.timeoutMs ? AbortSignal.timeout(this.config.timeoutMs) : undefined,
    });
    if (!res.ok || !res.body) throw new Error(`SSE connect failed: ${res.status}`);
    this.connected = true;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const pump = async () => {
      while (this.connected) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const chunk of events) {
          const line = chunk.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const data = line.replace(/^data:\s*/, '');
          try {
            const msg = JSON.parse(data);
            this.emit('message', msg);
          } catch {
            this.emit('error', new Error('Invalid JSON from SSE stream'));
          }
        }
      }
    };
    pump().catch((err) => this.emit('error', err));
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.controller?.abort();
  }

  async send(message: McpRequest, onError?: (err: unknown, msg: McpRequest) => void): Promise<void> {
    validateMessage(message, onError);
    if (!this.config.writeUrl) throw new Error('writeUrl required for SSE transport send');
    try {
      await fetch(this.config.writeUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(this.config.headers ?? {}) },
        body: JSON.stringify(redactSensitiveData(message)),
        signal: this.config.timeoutMs ? AbortSignal.timeout(this.config.timeoutMs) : undefined,
      });
    } catch (err) {
      if (onError) onError(err, message);
      else throw err;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
