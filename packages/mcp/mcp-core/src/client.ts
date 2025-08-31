import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { ServerInfo } from './contracts.js';

// Lightweight local redaction for args before sending over the wire.
function redactArgs<T extends Record<string, unknown>>(args: T): T {
  const SENSITIVE_KEYS = [
    'token',
    'access_token',
    'auth',
    'authorization',
    'password',
    'secret',
    'api_key',
    'apikey',
    'client_secret',
  ];
  const BEARER_REGEX = /Bearer\s+([^\s]+)/i;
  const clone = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(clone);
    if (v && typeof v === 'object') {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>)) {
        o[k] = clone((v as Record<string, unknown>)[k]);
      }
      return o;
    }
    if (typeof v === 'string') return v.replace(BEARER_REGEX, 'Bearer [REDACTED]');
    return v;
  };
  const out: any = clone(args);
  const mask = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const val = obj[k];
      if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
        obj[k] = '[REDACTED]';
      } else if (val && typeof val === 'object') mask(val);
      else if (typeof val === 'string') obj[k] = val.replace(BEARER_REGEX, 'Bearer [REDACTED]');
    }
  };
  mask(out);
  return out as T;
}

// Create a new, enhanced client that wraps the official SDK client
export async function createEnhancedClient(si: ServerInfo) {
  let transport;
  switch (si.transport) {
    case 'stdio':
      if (!si.command) throw new Error('stdio requires command');
      transport = new StdioClientTransport({
        command: si.command,
        args: si.args,
        env: si.env,
      });
      break;
    case 'sse':
      if (!si.endpoint) throw new Error('sse requires endpoint');
      transport = new SSEClientTransport(new URL(si.endpoint));
      break;
    case 'streamableHttp':
      if (!si.endpoint) throw new Error('streamableHttp requires endpoint');
      transport = new StreamableHTTPClientTransport(new URL(si.endpoint));
      break;
    default:
      throw new Error(`Unsupported transport: ${si.transport}`);
  }

  const baseClient = new Client({ name: 'cortex-os-mcp-client', version: '1.0.0' });

  await baseClient.connect(transport);

  const rateLimiter = new RateLimiterMemory({
    points: 60, // 60 requests
    duration: 60, // per 60 seconds
  });

  // The enhanced client wraps the base client, overriding methods to add functionality.
  const enhancedClient: any = {
    ...baseClient,
    rateLimiter,

    // Override callTool to add rate limiting
    callTool: async (params: { name: string; arguments?: Record<string, unknown> }) => {
      const { name, arguments: toolArgs } = params;
      const rateKey = `tool-${si.name}-${name}`;
      const ok = await enhancedClient.rateLimiter.consume(rateKey).then(
        () => true,
        () => false,
      );
      if (!ok) throw new Error(`Rate limit exceeded for tool ${name}`);
      const redacted = toolArgs ? redactArgs(toolArgs) : undefined;
      return baseClient.callTool({ name, arguments: redacted });
    },

    // Keep the original close method from the base client
    close: async () => {
      // No need to dispose the rate limiter as it's not a global singleton.
      // It will be garbage collected when the client is.
      await transport.close();
      baseClient.close();
    },

    // Expose rate limit info for inspection
    getRateLimitInfo: async (toolName: string) => {
      const rateKey = `tool-${si.name}-${toolName}`;
      const res = await enhancedClient.rateLimiter.get(rateKey);
      return {
        remainingPoints: res?.remainingPoints || 0,
      };
    },
  };

  return enhancedClient;
}
