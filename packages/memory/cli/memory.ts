import { Command } from 'commander';
import { cancellationBus } from '../core/cancellation-bus.js';
import { MCPClient } from '../lib/mcp-client.js';
import {
  memoryListOptionsSchema,
  memorySearchOptionsSchema,
  memoryStatsOptionsSchema,
  type MemoryListOptions,
  type MemorySearchOptions,
  type MemoryStatsOptions,
} from '../schemas/memory.schema.js';

const memory = new Command('memory').description('Memory inspection via MCP (read-only)');

export async function memoryStatsAction(raw: MemoryStatsOptions) {
  const opts = memoryStatsOptionsSchema.parse(raw);
  const ctrl = cancellationBus.create('memory:stats');
  process.once('SIGINT', () => cancellationBus.abort('memory:stats', 'signal'));
  const client = new MCPClient({ signal: ctrl.signal });
  await client.start();
  const res = await client.callTool(
    'memory_stats',
    { dbPath: opts.db },
    { signal: ctrl.signal, timeoutMs: opts.timeout || 0 },
  );
  await client.stop();
  ctrl.dispose();
  const text =
    Array.isArray(res?.content) && typeof res.content[0]?.text === 'string'
      ? (res.content[0] as { text: string }).text
      : '{}';
  try {
    const parsed = JSON.parse(text);

    console.log(
      opts.json
        ? JSON.stringify(parsed, null, 2)
        : `total=${parsed.total} bytes=${parsed.totalBytes}`,
    );
  } catch {
    console.log(text);
  }
}

memory
  .command('stats')
  .description('Show memory statistics')
  .option('--db <path>', 'SQLite DB path', 'apps/cortex-os/data/cortex-ai.sqlite')
  .option('--json', 'Output JSON', false)
  .option('--timeout <ms>', 'Timeout in ms; 0 disables', (v) => +v, 0)
  .action((opts: MemoryStatsOptions) => memoryStatsAction(opts));

export async function memoryListAction(raw: MemoryListOptions) {
  const opts = memoryListOptionsSchema.parse(raw);
  const ctrl = cancellationBus.create('memory:list');
  process.once('SIGINT', () => cancellationBus.abort('memory:list', 'signal'));
  const client = new MCPClient({ signal: ctrl.signal });
  await client.start();
  const res = await client.callTool(
    'memory_list',
    {
      dbPath: opts.db,
      limit: opts.limit,
    },
    { signal: ctrl.signal, timeoutMs: opts.timeout || 0 },
  );
  await client.stop();
  ctrl.dispose();
  const text =
    Array.isArray(res?.content) && typeof res.content[0]?.text === 'string'
      ? (res.content[0] as { text: string }).text
      : '[]';
  try {
    const parsed = JSON.parse(text);

    console.log(opts.json ? JSON.stringify(parsed, null, 2) : parsed.length);
  } catch {
    console.log(text);
  }
}

memory
  .command('list')
  .description('List recent memory entries')
  .option('--db <path>', 'SQLite DB path', 'apps/cortex-os/data/cortex-ai.sqlite')
  .option('--limit <n>', 'Max rows', '50')
  .option('--json', 'Output JSON', false)
  .option('--timeout <ms>', 'Timeout in ms; 0 disables', (v) => +v, 0)
  .action((opts: MemoryListOptions) => memoryListAction(opts));

export async function memorySearchAction(q: string, raw: MemorySearchOptions) {
  const opts = memorySearchOptionsSchema.parse({ ...raw, q });
  const ctrl = cancellationBus.create('memory:search');
  process.once('SIGINT', () => cancellationBus.abort('memory:search', 'signal'));
  const client = new MCPClient({ signal: ctrl.signal });
  await client.start();
  const res = await client.callTool(
    'memory_search',
    {
      dbPath: opts.db,
      q: opts.q,
      limit: opts.limit,
    },
    { signal: ctrl.signal, timeoutMs: opts.timeout || 0 },
  );
  await client.stop();
  ctrl.dispose();
  const text =
    Array.isArray(res?.content) && typeof res.content[0]?.text === 'string'
      ? (res.content[0] as { text: string }).text
      : '[]';
  try {
    const parsed = JSON.parse(text);

    console.log(opts.json ? JSON.stringify(parsed, null, 2) : parsed.length);
  } catch {
    console.log(text);
  }
}

memory
  .command('search <q>')
  .description('Search memory entries by text')
  .option('--db <path>', 'SQLite DB path', 'apps/cortex-os/data/cortex-ai.sqlite')
  .option('--limit <n>', 'Max rows', '50')
  .option('--json', 'Output JSON', false)
  .option('--timeout <ms>', 'Timeout in ms; 0 disables', (v) => +v, 0)
  .action((q: string, opts: MemorySearchOptions) => memorySearchAction(q, opts));

export default memory;
