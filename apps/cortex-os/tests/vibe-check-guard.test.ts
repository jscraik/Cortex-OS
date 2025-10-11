import { afterAll, beforeAll, expect, test } from 'vitest';
import http from 'node:http';
import { runVibeCheckGuard } from '../src/operational/vibe-check-guard.js';

let server: http.Server;
let port = 0;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/tools/call') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const parsed = JSON.parse(body || '{}');
        if (parsed.name === 'update_constitution') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result: { ok: true } }));
          return;
        }
        if (parsed.name === 'vibe_check') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result: { questions: ['q1'], risk: 'low' } }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'unknown_tool', message: 'unknown' } }));
      });
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => {
    // @ts-ignore
    port = server.address().port;
    process.env.VIBE_CHECK_HTTP_URL = `http://127.0.0.1:${port}`;
    resolve();
  }));
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('guard updates constitution and calls vibe_check', async () => {
  const out = await runVibeCheckGuard({ goal: 'g', plan: 'p', sessionId: 's1', rules: ['no network'] });
  expect(out.risk).toBe('low');
  expect(out.questions).toContain('q1');
});
