import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMlxIntegration } from '../mlx-mcp-integration.js';

async function createTempConfig(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mlx-sse-'));
  const path = join(dir, 'mlx.json');
  const config = {
    server: { host: '127.0.0.1', port: 0, workers: 1, timeout: 30, max_requests: 128 },
    models: { default: { name: 'echo', description: 'Echo model' } },
    cache: { hf_home: join(dir, '.cache') },
    performance: { batch_size: 1, max_tokens: 32, temperature: 0.0, top_p: 1.0 },
  };
  await writeFile(path, JSON.stringify(config), 'utf-8');
  return path;
}

describe('SSE /v1/completions echo', () => {
  let port = 0;
  let stop: (() => Promise<void>) | null = null;

  beforeAll(async () => {
    const cfg = await createTempConfig();
    const integration = createMlxIntegration(cfg);
    port = 18080 + Math.floor(Math.random() * 1000);
    await integration.startMLXServer(port);
    // No explicit stop hook on integration; rely on process exit after tests
  });

  afterAll(async () => {
    // noop — express server created without handle; test suite process teardown will close
  });

  it('streams tokens via SSE and ends with [DONE]', async () => {
    const url = new URL(`http://127.0.0.1:${port}/v1/completions`);
    url.searchParams.set('message', 'Hello MLX world');
    url.searchParams.set('model', 'default');

    const res = await fetch(url, { method: 'GET', headers: { Accept: 'text/event-stream' } });
    expect(res.ok).toBe(true);
    const reader = (res.body as any).getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let content = '';
    let done = false;

    while (true) {
      const { value, done: rdDone } = await reader.read();
      if (rdDone) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 2);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          done = true;
          break;
        }
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || '';
          if (delta) content += delta;
        } catch {
          // ignore parse errors
        }
      }
      if (done) break;
    }

    expect(done).toBe(true);
    expect(content.trim()).toBe('Hello MLX world');
  });
});

