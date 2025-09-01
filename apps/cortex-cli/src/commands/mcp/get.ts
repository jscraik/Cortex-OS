import type { ServerInfo } from '@cortex-os/mcp-core/contracts';
import { readAll } from '@cortex-os/mcp-registry/fs-store';
import { Command } from 'commander';

export const mcpGet = new Command('get')
  .description('Show details for an installed MCP server')
  .argument('<name>', 'Installed server name')
  .option('--json', 'JSON output')
  .action(async (name: string, opts: { json?: boolean }) => {
    const all = await readAll();
    const s = all.find((x) => x.name === name);
    if (!s) {
      const msg = `MCP server not found: ${name}`;
      if (opts.json) process.stderr.write(`${JSON.stringify({ error: msg }, null, 2)}\n`);
      else process.stderr.write(`Error: ${msg}\n`);
      process.exit(1);
      return;
    }
    if (opts.json) {
      process.stdout.write(`${JSON.stringify(s, null, 2)}\n`);
      return;
    }
    printServer(s);
  });

function printServer(s: ServerInfo) {
  process.stdout.write(`${s.name}\n`);
  process.stdout.write(`  transport: ${s.transport}\n`);
  if (s.transport === 'stdio') {
    if (s.command) process.stdout.write(`  command: ${s.command}\n`);
    if (s.args?.length) process.stdout.write(`  args: ${s.args.join(' ')}\n`);
    if (s.env && Object.keys(s.env).length)
      process.stdout.write(
        `  env: ${Object.entries(s.env)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}\n`
      );
  } else {
    if (s.endpoint) process.stdout.write(`  endpoint: ${s.endpoint}\n`);
    const headers = s.headers;
    if (headers && Object.keys(headers).length)
      process.stdout.write(
        `  headers: ${Object.entries(headers)
          .map(([k, v]) => `${k}: ${redactIfSensitive(k, v)}`)
          .join(', ')}\n`
      );
  }
}

function redactIfSensitive(key: string, val: string): string {
  const lower = key.toLowerCase();
  if (lower.includes('authorization') || lower.includes('token') || lower.includes('api-key')) {
    return '***';
  }
  return val;
}
