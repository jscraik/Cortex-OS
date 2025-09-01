import { describe, it, expect, vi } from 'vitest';

vi.mock('https', () => {
  const listen = vi.fn((_port: number, _host: string, cb: () => void) => cb());
  const close = vi.fn((cb: () => void) => cb());
  return {
    createServer: vi.fn(() => ({ listen, close })),
    Server: class {},
  };
});

import { StreamableHTTPServerTransport } from '../streamable-http-server-transport';
import { createServer } from 'https';

describe('StreamableHTTPServerTransport', () => {
  it('uses TLS 1.3', async () => {
    const transport = new StreamableHTTPServerTransport(8080, 'localhost', { key: 'k', cert: 'c' });
    expect(vi.mocked(createServer).mock.calls[0][0]).toMatchObject({
      key: 'k',
      cert: 'c',
      minVersion: 'TLSv1.3',
    });
    await transport.connect();
    await transport.close();
  });
});
