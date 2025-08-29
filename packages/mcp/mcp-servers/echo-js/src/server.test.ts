import { describe, it, expect } from 'vitest';
import { handleRequest } from './server.js';

describe('echo-js server', () => {
  it('echoes valid message', async () => {
    const req = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'echo', arguments: { message: 'hi' } },
    };
    const res = JSON.parse(await handleRequest(JSON.stringify(req)));
    expect(res.result.result.echo).toBe('hi');
  });

  it('throws on invalid payload', async () => {
    await expect(handleRequest(JSON.stringify({ id: 1 }))).rejects.toThrow();
  });
});
