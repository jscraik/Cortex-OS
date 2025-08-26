import type { ServerInfo } from './contracts.js';
import { createStdIo } from '@cortex-os/mcp-transport/stdio';
import { createSSE } from '@cortex-os/mcp-transport/sse';
import { createHTTPS } from '@cortex-os/mcp-transport/https';

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
