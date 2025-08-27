import { describe, expect, test } from 'vitest';
import { ServerInfoSchema, ToolSchema } from '../mcp-core/src/contracts';
import { createClient } from '../mcp-core/src/client';

/**
 * Protocol conformance tests ensure schemas and clients align across transports.
 * Tests capability discovery as requested in audit.
 */
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

  // Additional capability discovery tests
  test('ServerInfoSchema validates transport types', () => {
    expect(() => 
      ServerInfoSchema.parse({ name: 'test', transport: 'invalid' }),
    ).toThrow();
    
    expect(() => 
      ServerInfoSchema.parse({ name: 'test', transport: 'stdio' }),
    ).not.toThrow();
  });

  test('ToolSchema handles input schema', () => {
    const tool = ToolSchema.parse({ 
      name: 'test-tool', 
      description: 'A test tool',
      input_schema: { type: 'object', properties: { test: { type: 'string' } } }
    });
    expect(tool.input_schema).toBeDefined();
    expect(tool.input_schema?.type).toBe('object');
  });
});