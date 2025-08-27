import type { ServerInfo } from './contracts.js';
import { createStdIo } from '../mcp-transport/src/stdio.js';
import { createSSE } from '../mcp-transport/src/sse.js';
import { createHTTPS } from '../mcp-transport/src/https.js';

export function createClient(si: ServerInfo) {
  switch (si.transport) {
    case 'stdio':
      return createStdIo(si);
    case 'sse':
      return createSSE(si);
    case 'https':
      return createHTTPS(si);
  }
}

// Add utility functions for rate limiting and process monitoring
export function getRateLimitInfo(client: ReturnType<typeof createClient>, toolName: string) {
  if ('getRateLimitInfo' in client) {
    return (client as any).getRateLimitInfo(toolName);
  }
  return null;
}

export function getProcessInfo(client: ReturnType<typeof createClient>) {
  if ('getProcessInfo' in client) {
    return (client as any).getProcessInfo();
  }
  return null;
}