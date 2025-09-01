import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { MLXMcpServer } from '../mlx-mcp-server.js';

async function createTempMlxConfig(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mlx-'));
  const path = join(dir, 'mlx.json');
  const config = {
    server: { host: '127.0.0.1', port: 8080, workers: 1, timeout: 30, max_requests: 128 },
    models: {
      default: {
        name: 'mlx-community/tiny-model',
        description: 'Tiny local model for smoke tests',
      },
    },
    cache: { hf_home: join(dir, '.cache') },
    performance: { batch_size: 1, max_tokens: 64, temperature: 0.0, top_p: 1.0 },
  };
  await writeFile(path, JSON.stringify(config), 'utf-8');
  return path;
}

describe('MLX MCP integration (health & models)', () => {
  let server: MLXMcpServer;

  beforeAll(async () => {
    const cfg = await createTempMlxConfig();
    server = new MLXMcpServer(cfg);
    await server.initialize();
  });

  it('lists available models', () => {
    const models = server.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('id');
    expect(models[0]).toHaveProperty('name');
  });

  it('reports healthy status', async () => {
    const health = await server.getHealth();
    expect(health.status).toBe('healthy');
    expect(health.models).toBeGreaterThan(0);
  });
});
