import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { redactSensitiveData } from '../../src/lib/security.js';
import type { ServerInfo } from './contracts.js';

export interface RateLimitInfo {
  remainingPoints: number;
}

export type EnhancedClient = Client & {
  rateLimiter: RateLimiterMemory;
  callTool: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  sendRequest: (message: unknown) => Promise<unknown>;
  close: () => Promise<void>;
  getRateLimitInfo: (toolName: string) => Promise<RateLimitInfo>;
};

interface RequestSender {
  sendRequest: (message: unknown) => Promise<unknown>;
}

type Transport =
  | StdioClientTransport
  | SSEClientTransport
  | StreamableHTTPClientTransport;

function createTransport(si: ServerInfo): Transport {
  switch (si.transport) {
    case 'stdio':
      if (!si.command) throw new Error('stdio requires command');
      return new StdioClientTransport({
        command: si.command,
        args: si.args,
        env: si.env,
      });
    case 'sse':
      if (!si.endpoint) throw new Error('sse requires endpoint');
      return new SSEClientTransport(new URL(si.endpoint));
    case 'streamableHttp':
      if (!si.endpoint) throw new Error('streamableHttp requires endpoint');
      return new StreamableHTTPClientTransport(new URL(si.endpoint));
    default:
      throw new Error(`Unsupported transport: ${si.transport}`);
  }
}

async function wrapClient(
  base: Client,
  transport: Transport,
  si: ServerInfo,
): Promise<EnhancedClient> {
  const rateLimiter = new RateLimiterMemory({ points: 60, duration: 60 });
  const client = Object.assign(base, { rateLimiter }) as EnhancedClient;
  const originalSend = (base as unknown as RequestSender).sendRequest?.bind(base);
  const originalCall = base.callTool.bind(base);

  client.callTool = async (name, args) => {
    const rateKey = `tool-${si.name}-${name}`;
    try {
      await client.rateLimiter.consume(rateKey);
    } catch {
      throw new Error(`Rate limit exceeded for tool ${name}`);
    }
    const redacted = args
      ? (redactSensitiveData(args) as Record<string, unknown>)
      : undefined;
    return originalCall({ name, arguments: redacted });
  };

  client.sendRequest = async (message) => {
    const redacted = redactSensitiveData(message) as unknown;
    return originalSend ? originalSend(redacted) : Promise.resolve(undefined);
  };

  client.close = async () => {
    await transport.close();
    base.close();
  };

  client.getRateLimitInfo = async (toolName) => {
    const res = await client.rateLimiter.get(`tool-${si.name}-${toolName}`);
    return { remainingPoints: res?.remainingPoints ?? 0 };
  };

  return client;
}

export async function createEnhancedClient(
  si: ServerInfo,
): Promise<EnhancedClient> {
  const transport = createTransport(si);
  const client = new Client({ name: 'cortex-os-mcp-client', version: '1.0.0' });
  await client.connect(transport);
  return wrapClient(client, transport, si);
}
