import { describe, expect, test } from 'vitest';
import { ServerInfoSchema, ToolSchema } from '../mcp-core/src/contracts';
import { createClient } from '../mcp-core/src/client';

/** Protocol conformance tests ensure schemas and clients align across transports. */
describe('MCP protocol conformance', () => {
  test('ServerInfoSchema enforces required fields', () => {
    expect(() => ServerInfoSchema.parse({})).toThrow();
    expect(() =>
      ServerInfoSchema.parse({ name: 'ok', transport: 'stdio', command: 'node' }),
    ).not.toThrow();
  });

  test('ToolSchema defaults description', () => {
    const tool = ToolSchema.parse({ name: 'demo' });
    expect(tool.description).toBe('');
  });

  test('createClient requires transport specific fields', () => {
    expect(() => createClient({ name: 's', transport: 'stdio' } as any)).toThrow();
    expect(() => createClient({ name: 's', transport: 'sse' } as any)).toThrow();
    expect(() => createClient({ name: 's', transport: 'https' } as any)).toThrow();
  });
});
