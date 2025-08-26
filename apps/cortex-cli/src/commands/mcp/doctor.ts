import { Command } from 'commander';
import { readAll } from '@cortex-os/mcp-registry/fs-store';
import { createStdIo } from '@cortex-os/mcp-transport/stdio';
import { createHTTPS } from '@cortex-os/mcp-transport/https';
import { createSSE } from '@cortex-os/mcp-transport/sse';
import { tracer } from '@cortex-os/telemetry';

export const mcpDoctor = new Command('doctor')
  .description('Probe configured MCP servers for basic connectivity')
  .option('--json', 'JSON output')
  .action(async (opts: any) => {
    const span = tracer.startSpan('cli.mcp.doctor');
    try {
      const servers = await readAll();
      const results: any[] = [];
      for (const s of servers) {
        const item: any = { name: s.name, transport: s.transport, ok: false };
        try {
          if (s.transport === 'stdio') {
            const c = createStdIo(s);
            // give the process a brief moment, then dispose
            await new Promise((res) => setTimeout(res, 150));
            c.dispose();
            item.ok = true;
          } else if (s.transport === 'https') {
            const url = new URL(s.endpoint ?? '');
            const health = new URL('/healthz', url);
            const res = await fetch(health, { timeout: 5000 }).catch(() => fetch(url, { timeout: 5000 }));
            item.ok = !!res && (res as any).ok !== false;
          } else if (s.transport === 'sse') {
            const c = createSSE(s);
            await c.connect();
            item.ok = true;
          }
        } catch (e: any) {
          item.error = e?.message ?? String(e);
        }
        results.push(item);
      }
      if (opts.json) process.stdout.write(JSON.stringify({ results }, null, 2) + '\n');
      else {
        for (const r of results) process.stdout.write(`${r.ok ? 'OK' : 'ERR'}\t${r.name}\t${r.transport}${r.error ? ' - ' + r.error : ''}\n`);
      }
    } finally {
      span.end();
    }
  });

