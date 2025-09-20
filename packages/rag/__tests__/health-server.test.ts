import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HealthProvider } from '../src/server/health-provider.js';
import { createHealthServer } from '../src/server/health-server.js';

function fetchJSON(url: string) {
  return fetch(url).then(async (r) => ({ status: r.status, body: await r.json() }));
}

describe('health HTTP server', () => {
  const provider = new HealthProvider({
    async extraChecks() {
      return {
        // Always healthy in base
        embedder: { ok: true, info: { model: 'qwen3' } },
        store: { ok: true },
      };
    },
  });

  const srv = createHealthServer(provider, { host: '127.0.0.1', port: 0 });
  let baseUrl = '';

  beforeAll(async () => {
    const addr = await srv.listen();
    baseUrl = `http://${addr.host}:${addr.port}`;
  });

  afterAll(async () => {
    await srv.close();
  });

  it('returns 200 and JSON on /live', async () => {
    const res = await fetchJSON(`${baseUrl}/live`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('checks.process.ok', true);
  });

  it('returns 200 on /ready when all checks ok', async () => {
    const res = await fetchJSON(`${baseUrl}/ready`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.checks.embedder.ok).toBe(true);
  });

  it('returns 503 on /ready when a check fails', async () => {
    const bad = new HealthProvider({
      async extraChecks() {
        return { store: { ok: false, error: 'db down' } };
      },
    });
    const temp = createHealthServer(bad, { host: '127.0.0.1', port: 0 });
    const addr = await temp.listen();
    const url = `http://${addr.host}:${addr.port}`;
    const res = await fetchJSON(`${url}/ready`);
    await temp.close();
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.checks.store.ok).toBe(false);
  });

  it('404 for unknown path', async () => {
    const res = await fetch(`${baseUrl}/nope`);
    expect(res.status).toBe(404);
  });
});
