import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';
import { ServerInfoSchema, type ServerInfo } from '@cortex-os/mcp-core/contracts';

const DB = join(os.homedir(), '.cortex', 'mcp', 'servers.json');

export async function readAll(): Promise<ServerInfo[]> {
  try {
    return JSON.parse(await fs.readFile(DB, 'utf8'));
  } catch {
    return [];
  }
}

export async function upsert(si: ServerInfo) {
  ServerInfoSchema.parse(si);
  const all = await readAll();
  const idx = all.findIndex((s) => s.name === si.name);
  if (idx >= 0) all[idx] = si; else all.push(si);
  await fs.mkdir(dirname(DB), { recursive: true });
  await fs.writeFile(DB, JSON.stringify(all, null, 2));
}

export async function remove(name: string) {
  const all = await readAll();
  const next = all.filter((s) => s.name !== name);
  await fs.mkdir(dirname(DB), { recursive: true });
  await fs.writeFile(DB, JSON.stringify(next, null, 2));
}
