import http, { type Server } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleRequest as handleStringRequest } from './server.ts';

/**
 * Minimal HTTP wrapper for echo-js STDIO server context.
 * POST /mcp with JSON-RPC body → JSON-RPC response.
 */
export function startHttpServer(port = 0): Promise<{ server: Server; url: string }> {
  const server = http.createServer(async (req, res) => {
    // Origin allowlist
    const allowed = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const origin = req.headers['origin'] as string | undefined;
    if (allowed.length && origin && !allowed.includes(origin)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    // Health endpoint
    if (req.method === 'GET' && (req.url || '') === '/health') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.method !== 'POST' || (req.url || '') !== '/mcp') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    try {
      // Optional bearer auth
      if (process.env.REQUIRE_AUTH === '1') {
        const auth = req.headers['authorization'];
        const expected = process.env.AUTH_TOKEN || 'test-token';
        if (auth !== `Bearer ${expected}`) {
          res.statusCode = 401;
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id: null,
              error: { code: -32603, message: 'Unauthorized' },
            }),
          );
          return;
        }
      }
      const input = Buffer.concat(chunks).toString('utf8');
      const json = JSON.parse(input);
      const out = await handleStringRequest(JSON.stringify(json));
      res.setHeader('content-type', 'application/json');
      res.end(out);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        }),
      );
    }
  });
  return new Promise((resolveProm) => {
    server.listen(port, () => {
      const addr = server.address();
      const url =
        typeof addr === 'object' && addr
          ? `http://127.0.0.1:${addr.port}`
          : `http://127.0.0.1:${port}`;
      resolveProm({ server, url });
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startHttpServer(process.env.PORT ? parseInt(process.env.PORT) : 8080).then(() => {
    // eslint-disable-next-line no-console
    console.log('echo-js HTTP server listening');
  });
}
