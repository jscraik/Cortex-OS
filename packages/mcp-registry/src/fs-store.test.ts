import { beforeEach, afterEach, expect, test } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readAll, upsert, remove } from './fs-store.js';
import type { ServerInfo } from '@cortex-os/mcp-core/contracts';
let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'mcp-registry-'));
  process.env.HOME = home;
});

afterEach(() => {
  delete process.env.MCP_REGISTRY_PRIVATE_KEY;
  delete process.env.MCP_REGISTRY_PUBLIC_KEY;
});

test('content-addressed upsert and readAll', async () => {
  const server: ServerInfo = { name: 'echo', transport: 'stdio', command: 'echo' };
  await upsert(server);
  const all = await readAll();
  expect(all[0].name).toBe('echo');
  const idx = JSON.parse(
    readFileSync(join(home, '.cortex', 'mcp', 'servers', 'index.json'), 'utf8')
  );
  const digest = idx.echo.digest;
  const stored = JSON.parse(
    readFileSync(join(home, '.cortex', 'mcp', 'servers', `${digest}.json`), 'utf8')
  );
  expect(stored.command).toBe('echo');
});

test('immutability prevents overwrite', async () => {
  const server: ServerInfo = { name: 'echo', transport: 'stdio', command: 'echo' };
  await upsert(server);
  await expect(upsert({ ...server, command: 'changed' })).rejects.toThrow('immutable');
});

test('detects tamper via checksum', async () => {
  const server: ServerInfo = { name: 'echo', transport: 'stdio', command: 'echo' };
  await upsert(server);
  const idx = JSON.parse(
    readFileSync(join(home, '.cortex', 'mcp', 'servers', 'index.json'), 'utf8')
  );
  const digest = idx.echo.digest;
  writeFileSync(join(home, '.cortex', 'mcp', 'servers', `${digest}.json`), '{}');
  await expect(readAll()).rejects.toThrow('checksum');
});

test('remove drops index entry only', async () => {
  const server: ServerInfo = { name: 'echo', transport: 'stdio', command: 'echo' };
  await upsert(server);
  await remove('echo');
  const idx = JSON.parse(
    readFileSync(join(home, '.cortex', 'mcp', 'servers', 'index.json'), 'utf8')
  );
  expect(idx.echo).toBeUndefined();
});
