import { z } from 'zod';
import type { ServerContext } from './types.js';

export async function handleResourceRead(
  id: string | number,
  params: unknown,
  context: ServerContext,
) {
  let uri: string;
  try {
    uri = z.object({ uri: z.string() }).parse(params).uri;
  } catch {
    return {
      jsonrpc: '2.0' as const,
      id,
      error: { code: -32602, message: 'Invalid parameters' },
    } as const;
  }
  const resource = context.resources.get(uri);
  if (!resource) {
    return {
      jsonrpc: '2.0' as const,
      id,
      error: { code: -32601, message: 'Resource not found' },
    };
  }

  try {
    const readResult = await resource.handler(uri);
    // Normalize to { contents: [...] }
    const contents = Array.isArray((readResult as any)?.contents)
      ? (readResult as any).contents
      : [readResult];
    return { jsonrpc: '2.0' as const, id, result: { contents } };
  } catch (error) {
    return {
      jsonrpc: '2.0' as const,
      id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
