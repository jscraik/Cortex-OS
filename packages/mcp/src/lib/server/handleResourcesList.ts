import type { ServerContext } from './types.js';

export function handleResourcesList(id: string | number, context: ServerContext) {
  return {
    jsonrpc: '2.0' as const,
    id,
    result: { resources: Array.from(context.resources.values()).map((r) => r.def) },
  };
}
