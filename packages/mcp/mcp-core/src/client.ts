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

// Type definitions for enhanced type safety
interface RateLimitAwareClient {
  getRateLimitInfo(toolName: string): { remaining: number; windowMs: number; maxRequests: number };
}

interface ProcessAwareClient {
  getProcessInfo(): { pid: number; connected: boolean; killed: boolean; resourceLimits: any };
}

// Add utility functions for rate limiting and process monitoring with proper type safety
export function getRateLimitInfo(client: ReturnType<typeof createClient>, toolName: string) {
  if (typeof (client as RateLimitAwareClient).getRateLimitInfo === 'function') {
    return (client as RateLimitAwareClient).getRateLimitInfo(toolName);
  }
  return null;
}

export function getProcessInfo(client: ReturnType<typeof createClient>) {
  if (typeof (client as ProcessAwareClient).getProcessInfo === 'function') {
    return (client as ProcessAwareClient).getProcessInfo();
  }
  return null;
}