import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';
import { readAll, upsert, remove } from './fs-store.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(os.tmpdir(), 'mcp-registry-'));
  vi.spyOn(os, 'homedir').mockReturnValue(tempDir);
  await fs.rm(join(tempDir, '.cortex'), { recursive: true, force: true });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('fs-store', () => {
  it('persists and retrieves entries', async () => {
    await upsert({ name: 's', transport: 'https', endpoint: 'https://example.com' });
    const all = await readAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('s');
  });

  it('rejects unsupported transport', async () => {
    await expect(upsert({ name: 'bad', transport: 'http' as any })).rejects.toThrow();
  });

  it('removes entries', async () => {
    await upsert({ name: 's', transport: 'https', endpoint: 'https://example.com' });
    await remove('s');
    const all = await readAll();
    expect(all).toHaveLength(0);
  });
});
