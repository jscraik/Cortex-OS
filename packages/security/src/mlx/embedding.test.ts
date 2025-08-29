import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { generateEmbedding } from './embedding.ts';

let server: http.Server;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/embed') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ embeddings: [[1, 2, 3]] }));
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

describe('generateEmbedding', () => {
  it('returns embedding from MLX service', async () => {
    const emb = await generateEmbedding('hello');
    expect(Array.from(emb)).toEqual([1, 2, 3]);
  });

  it('throws on invalid input', async () => {
    await expect(generateEmbedding('')).rejects.toThrow();
  });
});
