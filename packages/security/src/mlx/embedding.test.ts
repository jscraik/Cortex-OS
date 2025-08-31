import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { generateEmbedding } from './embedding.ts';

let mlxServer: http.Server;
let frontierServer: http.Server;

beforeAll(async () => {
  mlxServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/embed') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ embeddings: [[1, 2, 3]] }));
    }
  });
  frontierServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/embed') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ embeddings: [[9, 9, 9]] }));
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

describe('generateEmbedding', () => {
  it('returns embedding from MLX service', async () => {
    const emb = await generateEmbedding('hello');
    expect(Array.from(emb)).toEqual([1, 2, 3]);
  });

  it('falls back to Frontier API on failure', async () => {
    mlxServer.removeAllListeners('request');
    mlxServer.on('request', (req, res) => {
      if (req.method === 'POST' && req.url === '/embed') {
        res.statusCode = 500;
        res.end();
      }
    });

    const emb = await generateEmbedding('hello');
    expect(Array.from(emb)).toEqual([9, 9, 9]);
  });

  it('throws on invalid input', async () => {
    await expect(generateEmbedding('')).rejects.toThrow();
  });
});
