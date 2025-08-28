import { describe, expect, it, vi } from 'vitest';
import { createTransport } from '../packages/mcp/src/lib/transport.js';
import { createServer } from 'http';
import { readFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Transport Integration', () => {
  it('writes messages to child stdin for stdio transport', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'stdio-test-'));
    const file = join(dir, 'out.txt');
    const transport = createTransport({
      type: 'stdio',
      command: 'node',
      args: [
        '-e',
        "process.stdin.on('data', d => require('fs').appendFileSync(process.env.OUT, d.toString()))",
      ],
      env: { OUT: file },
    });

    await transport.connect();
    const message = { jsonrpc: '2.0' as const, id: 1, method: 'ping' };
    await transport.send(message);
    await new Promise((r) => setTimeout(r, 100));
    const content = readFileSync(file, 'utf8');
    expect(content).toContain(JSON.stringify(message));
    await transport.disconnect();
  });

  it('POSTs messages to configured URL for http transport', async () => {
    const received: string[] = [];
    const server = createServer((req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end();
        return;
      }
      let body = '';
      req.on('data', (chunk) => (body += chunk.toString()));
      req.on('end', () => {
        received.push(body);
        res.statusCode = 200;
        res.end('ok');
      });
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string' || typeof (address as any).port !== 'number') {
      throw new Error('Server address is not AddressInfo with port');
    }
    const port = (address as import('net').AddressInfo).port;
    const transport = createTransport({
      type: 'http',
      url: `http://localhost:${port}`,
    });

    await transport.connect();
    const message = { jsonrpc: '2.0' as const, id: 2, method: 'ping' };
    await transport.send(message);
    // Wait until the server has received the message, up to 2 seconds
    await new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (received.length > 0) {
          clearInterval(interval);
          resolve(undefined);
        } else if (Date.now() - start > 2000) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for server to receive message'));
        }
      }, 10);
    });
    expect(received[0]).toEqual(JSON.stringify(message));
    await transport.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  it('invokes onError for http network failures', async () => {
    const transport = createTransport({
      type: 'http',
      url: 'http://localhost:65500',
    });
    await transport.connect();
    const onError = vi.fn();
    const message = { jsonrpc: '2.0' as const, id: 3, method: 'ping' };
    await transport.send(message, onError);
    expect(onError).toHaveBeenCalled();
    await transport.disconnect();
  });
});

