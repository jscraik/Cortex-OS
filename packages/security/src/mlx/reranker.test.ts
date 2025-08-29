import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { rerank, type Candidate } from './reranker.ts';

let server: http.Server;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/rerank') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ scores: [0.2, 0.8] }));
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  process.env.MLX_SERVICE_URL = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
  delete process.env.MLX_SERVICE_URL;
});

describe('rerank', () => {
  it('orders candidates by score from MLX service', async () => {
    const candidates: Candidate[] = [{ text: 'first' }, { text: 'second' }];
    const ranked = await rerank(candidates, 'query');
    expect(ranked[0].text).toBe('second');
    expect(ranked[0].score).toBeCloseTo(0.8);
    expect(ranked[1].text).toBe('first');
  });

  it('throws on invalid input', async () => {
    await expect(rerank([], '')).rejects.toThrow();
  });
});
