import type { ServerInfo } from './contracts.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { redactSensitiveData } from '../../src/lib/security.js';

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

  const baseClient = new Client(
    { name: 'cortex-os-mcp-client', version: '1.0.0' },
    { capabilities: { experimental: {} } },
  );

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
    callTool: async (name: string, payload: unknown) => {
      const rateKey = `tool-${si.name}-${name}`;
      try {
        await enhancedClient.rateLimiter.consume(rateKey);
      } catch (error) {
        throw new Error(`Rate limit exceeded for tool ${name}`);
      }
      return baseClient.callTool(name, payload);
    },

    // Override sendRequest to add data redaction
    sendRequest: async (message: unknown) => {
      const redactedMessage = redactSensitiveData(message);
      return baseClient.sendRequest(redactedMessage);
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
