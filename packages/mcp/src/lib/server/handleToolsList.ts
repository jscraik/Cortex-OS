import type { ServerContext } from './types.js';

export function handleToolsList(id: string | number, context: ServerContext) {
  return {
    jsonrpc: '2.0' as const,
    id,
    result: { tools: Array.from(context.tools.values()).map((t) => t.def) },
  };
}
