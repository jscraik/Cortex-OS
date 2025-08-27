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
    expect(client).toHaveProperty('getProcessInfo');
    expect(client).toHaveProperty('restart');
    client.dispose();
  });

  test('sse transport exposes connect API', () => {
    const client = createSSE({ endpoint: 'https://example.com/sse' });
    expect(client).toHaveProperty('connect');
    expect(client).toHaveProperty('onMessage');
    expect(client).toHaveProperty('onError');
    expect(client).toHaveProperty('onOpen');
    expect(client).toHaveProperty('send');
    expect(client).toHaveProperty('dispose');
    expect(client).toHaveProperty('reconnect');
  });

  test('https transport exposes callTool API', () => {
    const client = createHTTPS({ endpoint: 'https://example.com' });
    expect(client).toHaveProperty('callTool');
    expect(client).toHaveProperty('getRateLimitInfo');
  });

  // Additional parity tests
  test('all transports handle missing required parameters', () => {
    expect(() => createStdIo({ name: 'test', transport: 'stdio' } as any)).toThrow();
    expect(() => createSSE({} as any)).toThrow();
    expect(() => createHTTPS({} as any)).toThrow();
  });
  
  // Test rate limiting functionality
  test('https transport includes rate limiting', async () => {
    const client = createHTTPS({ endpoint: 'https://example.com' });
    const rateInfo = (client as any).getRateLimitInfo('test-tool');
    expect(rateInfo).toHaveProperty('remaining');
    expect(rateInfo).toHaveProperty('windowMs');
    expect(rateInfo).toHaveProperty('maxRequests');
  });
  
  // Test process monitoring functionality
  test('stdio transport includes process monitoring', () => {
    const client = createStdIo({
      name: 'echo',
      transport: 'stdio',
      command: 'node',
      args: ['-e', 'process.stdin.on("data",d=>process.stdout.write(d))'],
    } as any);
    const processInfo = (client as any).getProcessInfo();
    expect(processInfo).toHaveProperty('pid');
    expect(processInfo).toHaveProperty('connected');
    expect(processInfo).toHaveProperty('killed');
    client.dispose();
  });
});