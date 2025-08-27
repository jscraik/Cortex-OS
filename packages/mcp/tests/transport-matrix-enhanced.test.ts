import { describe, expect, test } from 'vitest';
import { createStdIo } from '../mcp-transport/src/stdio';
import { createSSE } from '../mcp-transport/src/sse';
import { createHTTPS } from '../mcp-transport/src/https';

/**
 * Transport matrix tests verify interface parity across transports.
 * Tests stdio/http/sse parity as requested in audit.
 */
describe('MCP transport matrix', () => {
  test('stdio transport exposes messaging APIs', () => {
    const client = createStdIo({
      name: 'echo',
      transport: 'stdio',
      command: 'node',
      args: ['-e', 'process.stdin.on("data",d=>process.stdout.write(d))'],
    } as any);
    expect(client).toHaveProperty('send');
    expect(client).toHaveProperty('onMessage');
    expect(client).toHaveProperty('dispose');
    client.dispose();
  });

  test('sse transport exposes connect API', () => {
    const client = createSSE({ endpoint: 'https://example.com/sse' });
    expect(client).toHaveProperty('connect');
  });

  test('https transport exposes callTool API', () => {
    const client = createHTTPS({ endpoint: 'https://example.com' });
    expect(client).toHaveProperty('callTool');
  });

  // Additional parity tests
  test('all transports handle missing required parameters', () => {
    expect(() => createStdIo({ name: 'test', transport: 'stdio' } as any)).toThrow();
    expect(() => createSSE({} as any)).toThrow();
    expect(() => createHTTPS({} as any)).toThrow();
  });
});