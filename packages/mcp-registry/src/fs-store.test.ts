import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ServerInfo } from '@cortex-os/mcp-core/contracts';

vi.mock('@cortex-os/observability/logging', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

const { readAll, upsert, remove } = await import('./fs-store.js');

const originalHome = process.env.HOME;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-registry-'));
  process.env.HOME = dir;
});

afterEach(() => {
  if (originalHome) {
    process.env.HOME = originalHome;
  }
});

test('readAll returns empty array when no registry exists', async () => {
  const all = await readAll();
  expect(all).toEqual([]);
});

test('upsert, readAll, and remove round trip', async () => {
  const server: ServerInfo = {
    name: 'echo',
    transport: 'stdio',
    command: 'echo',
  };

  await upsert(server);
  let all = await readAll();
  expect(all).toHaveLength(1);
  expect(all[0].name).toBe('echo');

  await remove('echo');
  all = await readAll();
  expect(all).toHaveLength(0);
});
