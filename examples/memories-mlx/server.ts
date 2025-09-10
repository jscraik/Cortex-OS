import http from 'node:http';
import { URL } from 'node:url';
import { createEmbedderFromEnv, createPolicyAwareStoreFromEnv, createMemoryService } from '../../packages/memories/src/index.js';

const PORT = Number(process.env.DEMO_PORT || process.env.PORT || 8088);

async function bootstrap() {
  // Defaults for convenience
  process.env.MEMORIES_EMBEDDER = process.env.MEMORIES_EMBEDDER || 'mlx';
  if (!process.env.MLX_EMBED_BASE_URL && !process.env.MLX_SERVICE_URL) {
    process.env.MLX_EMBED_BASE_URL = 'http://127.0.0.1:8000';
  }
  process.env.MEMORIES_LONG_STORE = process.env.MEMORIES_LONG_STORE || 'memory';

  const store = createPolicyAwareStoreFromEnv();
  const embedder = createEmbedderFromEnv();
  const service = createMemoryService(store, embedder);

  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const path = url.pathname;

      if (req.method === 'GET' && path === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', embedder: embedder.name() }));
        return;
      }

      if (req.method === 'POST' && path === '/ingest') {
        const body = await readJson(req);
        const now = new Date().toISOString();
        const id = body.id || `demo-${Date.now()}`;
        const kind = body.kind || 'note';
        const text = String(body.text || '');
        const tags: string[] = Array.isArray(body.tags) ? body.tags : [];
        if (!text) throw badRequest('text is required');

        await service.save({
          id,
          kind,
          text,
          tags,
          createdAt: now,
          updatedAt: now,
          provenance: { source: 'agent' },
          embeddingModel: embedder.name(),
        } as any);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, status: 'ingested' }));
        return;
      }

      if (req.method === 'GET' && path === '/search') {
        const query = url.searchParams.get('query') || '';
        const limit = Number(url.searchParams.get('limit') || '5');
        const results = await service.search({ query, limit });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            count: results.length,
            results: results.map((r) => ({ id: r.id, score: r.score, text: r.text })),
          }),
        );
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (err: any) {
      const status = err?.statusCode || 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
  });

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.error(`Demo server listening on http://127.0.0.1:${PORT}`);
  });
}

function badRequest(message: string) {
  const e = new Error(message) as any;
  e.statusCode = 400;
  return e;
}

function readJson(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(badRequest('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

