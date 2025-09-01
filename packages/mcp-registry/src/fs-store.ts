import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';
import { createLogger } from '@cortex-os/observability/logging';
import type { ServerInfo } from '@cortex-os/mcp-core/contracts';

const logger = createLogger('mcp-registry:fs-store');
const DB = join(os.homedir(), '.cortex', 'mcp', 'servers.json');

export async function readAll(): Promise<ServerInfo[]> {
  try {
    const data = JSON.parse(await fs.readFile(DB, 'utf8'));
    logger.debug('Loaded registry entries', { count: data.length });
    return data;
  } catch {
    logger.warn('Registry store missing, returning empty list');
    return [];
  }
}

export async function upsert(si: ServerInfo) {
  const all = await readAll();
  const idx = all.findIndex((s) => s.name === si.name);
  if (idx >= 0) {
    all[idx] = si;
    logger.info('Updated server', { name: si.name });
  } else {
    all.push(si);
    logger.info('Added server', { name: si.name });
  }
  await fs.mkdir(dirname(DB), { recursive: true });
  await fs.writeFile(DB, JSON.stringify(all, null, 2));
}

export async function remove(name: string) {
  const all = await readAll();
  const next = all.filter((s) => s.name !== name);
  logger.info('Removed server', { name });
  await fs.mkdir(dirname(DB), { recursive: true });
  await fs.writeFile(DB, JSON.stringify(next, null, 2));
}
