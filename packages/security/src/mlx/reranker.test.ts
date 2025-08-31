import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { rerank, type Candidate } from './reranker.ts';

let mlxServer: http.Server;
let frontierServer: http.Server;

beforeAll(async () => {
  mlxServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/rerank') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ scores: [0.2, 0.8] }));
    }
  });
  frontierServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/rerank') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ scores: [0.6, 0.4] }));
    }
  });
  await Promise.all([
    new Promise((r) => mlxServer.listen(0, r)),
    new Promise((r) => frontierServer.listen(0, r)),
  ]);
  const mlxPort = (mlxServer.address() as AddressInfo).port;
  const frontierPort = (frontierServer.address() as AddressInfo).port;
  process.env.MLX_SERVICE_URL = `http://127.0.0.1:${mlxPort}`;
  process.env.FRONTIER_API_URL = `http://127.0.0.1:${frontierPort}`;
});

afterAll(() => {
  mlxServer.close();
  frontierServer.close();
  delete process.env.MLX_SERVICE_URL;
  delete process.env.FRONTIER_API_URL;
});

describe('rerank', () => {
  it('orders candidates by score from MLX service', async () => {
    const candidates: Candidate[] = [{ text: 'first' }, { text: 'second' }];
    const ranked = await rerank(candidates, 'query');
    expect(ranked[0].text).toBe('second');
    expect(ranked[0].score).toBeCloseTo(0.8);
    expect(ranked[1].text).toBe('first');
  });

  it('falls back to Frontier API on failure', async () => {
    mlxServer.removeAllListeners('request');
    mlxServer.on('request', (req, res) => {
      if (req.method === 'POST' && req.url === '/rerank') {
        res.statusCode = 500;
        res.end();
      }
    });

    const candidates: Candidate[] = [{ text: 'first' }, { text: 'second' }];
    const ranked = await rerank(candidates, 'query');
    expect(ranked[0].text).toBe('first');
    expect(ranked[0].score).toBeCloseTo(0.6);
  });

  it('throws on invalid input', async () => {
    await expect(rerank([], '')).rejects.toThrow();
  });
});
