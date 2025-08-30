import { z } from 'zod';
import type { ServerContext } from './types.js';

export async function handleResourceRead(
  id: string | number,
  params: unknown,
  context: ServerContext,
) {
  const { uri } = z.object({ uri: z.string() }).parse(params);
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
    return { jsonrpc: '2.0' as const, id, result: readResult };
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
