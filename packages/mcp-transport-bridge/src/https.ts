/**
 * Compatibility shim for legacy imports from '@cortex-os/mcp-transport/https'
 * Provides a minimal HTTPS transport factory that validates inputs.
 */
import { z } from 'zod';

const HTTPSOptionsSchema = z.object({
  endpoint: z.string().url(),
  headers: z.record(z.string()).optional(),
});

export type HTTPSOptions = z.infer<typeof HTTPSOptionsSchema>;

export function createHTTPS(opts: Partial<HTTPSOptions>): never {
  // Keep behavior expected by existing tests: throw when endpoint missing
  const parsed = HTTPSOptionsSchema.safeParse(opts);
  if (!parsed.success) {
    throw new Error('HTTPS transport requires a valid endpoint URL');
  }

  // This repository now standardizes on the Streamable HTTP transport via the MCP SDK.
  // If HTTPS client support is needed, implement it in a new module and wire it here.
  throw new Error('HTTPS transport not implemented in mcp-transport-bridge — use streamable HTTP');
}
