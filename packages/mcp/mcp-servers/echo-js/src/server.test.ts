import { describe, it, expect } from 'vitest';
import { handleRequest } from './server.js';

describe('echo-js server', () => {
  it('echoes valid message', () => {
    const res = JSON.parse(handleRequest(JSON.stringify({ id: 1, message: 'hi' })));
    expect(res.result.echo).toBe('hi');
  });

  it('throws on invalid payload', () => {
    expect(() => handleRequest(JSON.stringify({ id: 1 }))).toThrow();
  });
});
