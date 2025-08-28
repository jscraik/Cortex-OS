import type { ServerContext } from './types.js';

export function handlePromptsList(id: string | number, context: ServerContext) {
  return {
    jsonrpc: '2.0' as const,
    id,
    result: { prompts: Array.from(context.prompts.values()).map((p) => p.def) },
  };
}
