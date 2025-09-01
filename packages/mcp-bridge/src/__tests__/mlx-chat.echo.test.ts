import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { MLXMcpServer } from '../mlx-mcp-server.js';

async function createTempEchoConfig(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mlx-echo-'));
  const path = join(dir, 'mlx.json');
  const config = {
    server: { host: '127.0.0.1', port: 8080, workers: 1, timeout: 30, max_requests: 128 },
    models: {
      default: { name: 'echo', description: 'Echo model for tests' },
    },
    cache: { hf_home: join(dir, '.cache') },
    performance: { batch_size: 1, max_tokens: 32, temperature: 0.0, top_p: 1.0 },
  };
  await writeFile(path, JSON.stringify(config), 'utf-8');
  return path;
}

describe('MLX MCP chat via echo model', () => {
  let server: MLXMcpServer;

  beforeAll(async () => {
    const cfg = await createTempEchoConfig();
    server = new MLXMcpServer(cfg);
    await server.initialize();
  });

  it('returns concatenated tokens matching the last user message', async () => {
    const res = await server.chat({
      messages: [
        { role: 'system', content: 'You are a helper.' },
        { role: 'user', content: 'Hello MLX world' },
      ],
    });

    expect(res.choices[0].message?.content.trim()).toBe('Hello MLX world');
  });
});
